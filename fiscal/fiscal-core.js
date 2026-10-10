/* AUREUM fiscalisation core — shared by Back Office and the till.
   Pure logic: validation, adapter registry, transaction state machine and the
   "never double-submit, never fake success" engine. NO network calls and NO secrets live here.

   IMPORTANT HONESTY RULE: no real fiscal-device protocol is implemented in this file.
   Until a manufacturer/ZIMRA-approved adapter is registered, every device uses the
   built-in "unsupported" adapter, which reports "Awaiting supported adapter" and can
   never produce a fiscalised result. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.AureumFiscal = factory();
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  /* ---------- vocabulary ---------- */
  const STATES = ['pending','submitting','fiscalised','rejected','failed','uncertain','not_configured'];
  const FINAL = ['fiscalised','rejected'];
  const STATE_LABEL = {
    pending:'Pending', submitting:'Submitting', fiscalised:'Fiscalised', rejected:'Rejected by tax authority',
    failed:'Failed — can retry', uncertain:'Uncertain — check status', not_configured:'Not fiscalised — no working device'
  };
  const CONNECTION_STATUS_LABEL = {
    not_configured:'Not configured', awaiting_adapter:'Awaiting supported adapter', connected:'Connected', unreachable:'Unreachable', error:'Error'
  };
  const REGISTRATION_LABEL = { unregistered:'Not registered', test:'Test environment', registered:'Registered', deactivated:'Deactivated' };

  /* Which settings each connection type needs. Only these fields are shown / validated. */
  const CONNECTION_TYPES = {
    usb:             { label:'USB (needs a local connector)', fields:[], note:'A web page cannot talk to a USB fiscal device directly. A separate local connector application supplied for that device is required.' },
    network:         { label:'Local network (host / IP + port)', fields:[
                        { key:'host', label:'Hostname or IP address', required:true, placeholder:'192.168.1.50' },
                        { key:'port', label:'Port', required:true, type:'number', placeholder:'e.g. as per device manual' } ],
                       note:'Use the address and port from the manufacturer documentation. Browsers can only reach devices that allow it (HTTPS / CORS) — otherwise use a local connector.' },
    vendor_api:      { label:'Vendor API / SDK', fields:[
                        { key:'endpoint', label:'Service URL (https)', required:true, placeholder:'https://…' } ],
                       note:'Secrets (API keys, certificates) are NOT entered here — they are stored server-side only.' },
    local_connector: { label:'Local connector app (this computer)', fields:[
                        { key:'connectorUrl', label:'Connector address', required:true, placeholder:'http://127.0.0.1:PORT' } ],
                       note:'The connector is a separate, isolated program installed on the till computer. It must listen on this computer only (localhost).' }
  };

  const SECRET_KEYS = ['password','passwd','secret','api_key','apikey','token','private_key','certificate','cert','pin'];

  /* ---------- device validation ---------- */
  function isPrivateOrLocalHost(h){
    h = String(h||'').trim().toLowerCase();
    if(!h) return false;
    if(h === 'localhost') return true;
    if(/^(127\.|10\.|192\.168\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
    if(/^[a-z0-9-]+(\.local)?$/.test(h) && !/\./.test(h.replace(/\.local$/,''))) return true; // single-label LAN name
    return /\.local$/.test(h);
  }
  function validateDevice(d){
    const errs = [];
    d = d || {};
    const name = String(d.name||'').trim();
    if(!name) errs.push('Give the device a name.');
    else if(name.length > 80) errs.push('Device name is too long (80 characters max).');
    if(!String(d.shop||'').trim()) errs.push('Choose the shop this device belongs to.');
    const ct = CONNECTION_TYPES[d.connection_type];
    if(!ct) errs.push('Choose a connection type.');
    else{
      const c = d.connection || {};
      ct.fields.forEach(f => {
        const v = String(c[f.key] == null ? '' : c[f.key]).trim();
        if(f.required && !v) errs.push(f.label + ' is required.');
      });
      if(d.connection_type === 'network'){
        const host = String((c.host||'')).trim();
        if(host && !/^[A-Za-z0-9.-]+$/.test(host)) errs.push('Hostname / IP contains invalid characters.');
        else if(host && !isPrivateOrLocalHost(host)) errs.push('A local-network device must have a private (LAN) address — public addresses are not accepted.');
        const port = Number(c.port);
        if(c.port !== '' && c.port != null && (!Number.isInteger(port) || port < 1 || port > 65535)) errs.push('Port must be a whole number from 1 to 65535.');
      }
      if(d.connection_type === 'local_connector' && c.connectorUrl){
        if(!/^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?(\/.*)?$/i.test(String(c.connectorUrl).trim())) errs.push('The local connector address must be on this computer (http://127.0.0.1:PORT or http://localhost:PORT).');
      }
      if(d.connection_type === 'vendor_api' && c.endpoint && !/^https:\/\/[^\s]+$/i.test(String(c.endpoint).trim())) errs.push('The service URL must start with https://');
      Object.keys(c).forEach(k => { if(SECRET_KEYS.indexOf(k.toLowerCase()) >= 0) errs.push('"' + k + '" looks like a secret and cannot be stored here.'); });
    }
    if(d.serial_number && !/^[\w .\/-]{1,60}$/.test(String(d.serial_number).trim())) errs.push('Serial number has unusual characters.');
    if(d.zimra_device_id && !/^[\w .\/-]{1,60}$/.test(String(d.zimra_device_id).trim())) errs.push('ZIMRA device ID has unusual characters.');
    return errs;
  }

  /* ---------- adapters ---------- */
  /* Adapter contract (every method returns a Promise):
       testConnection(device)                      -> { ok, status, message }
       getDeviceStatus(device)                     -> { ok, status, message, registration? }
       submitFiscalTransaction(device, tx)         -> { ok:true, fiscalRef, verificationCode?, qrData?, response }
                                                      | { ok:false, status:'rejected'|'failed'|'awaiting_adapter', code?, message, response? }
       getFiscalTransactionStatus(device, tx)      -> same shape as above (optional)
       submitCreditNote(device, tx)                -> same shape (optional)
       disconnect(device)                          -> { ok }
     status for failures: 'rejected' = the authority/device definitively refused;
     'failed' = definitively NOT submitted; throwing / timing out = outcome UNKNOWN (becomes 'uncertain'). */
  const REQUIRED_METHODS = ['testConnection','getDeviceStatus','submitFiscalTransaction','disconnect'];
  const unsupportedAdapter = {
    id:'unsupported', label:'No adapter yet', supported:false,
    msg:'Awaiting supported adapter — no integration for this device exists yet, so nothing was sent to it.',
    testConnection(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message:this.msg }); },
    getDeviceStatus(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message:this.msg }); },
    submitFiscalTransaction(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message:this.msg }); },
    disconnect(){ return Promise.resolve({ ok:true }); }
  };
  const registry = { unsupported: unsupportedAdapter };
  function registerAdapter(id, adapter){
    const missing = REQUIRED_METHODS.filter(m => typeof (adapter||{})[m] !== 'function');
    if(missing.length) throw new Error('Adapter "' + id + '" is missing: ' + missing.join(', '));
    registry[id] = adapter; return adapter;
  }
  function getAdapter(id){ return registry[id] || unsupportedAdapter; }
  function listAdapters(){ return Object.keys(registry).map(k => ({ id:k, label:registry[k].label || k, supported: registry[k].supported !== false })); }


  /* ---------- Multi-country architecture ----------
     Three separate layers (nothing in one layer knows the internals of another):
       1. ENGINE (this file)        country-neutral: states, idempotency, retries, audit trail
       2. COUNTRY adapter           tax rules, invoice/receipt format, signing, reporting, credit-note rules
                                    (fiscal/countries/<cc>.js) — never talks to hardware
       3. DEVICE adapter            manufacturer protocol / SDK / connection (fiscal/devices/<id>.js) — never knows tax rules
     A country adapter lists which device adapters it accepts and a device adapter lists the countries it is
     approved for. BOTH must agree: a device approved in one country is never usable in another. */
  const INTEGRATION_STATUS = ['disabled','in_development','testing','approved'];
  const INTEGRATION_STATUS_LABEL = { disabled:'Disabled', in_development:'In development', testing:'Testing', approved:'Approved' };
  const isSelectable = status => status === 'approved';                     // only 'approved' is ever offered to shop owners
  const countries = {};
  function registerCountry(code, adapter){
    code = String(code||'').toUpperCase();
    const need = ['buildRequest','validate'].filter(m => typeof (adapter||{})[m] !== 'function');
    if(!/^[A-Z]{2}$/.test(code)) throw new Error('Country code must be ISO 3166-1 alpha-2 (e.g. ZW).');
    if(need.length) throw new Error('Country adapter "' + code + '" is missing: ' + need.join(', '));
    adapter.code = code; countries[code] = adapter; return adapter;
  }
  /* A shop whose country has no adapter installed on this device must never fall back to country-less behaviour. */
  const countryOrStub = code => getCountry(code) || { code:String(code||'').toUpperCase(), name:String(code||''), supportedDeviceAdapters:[],
      buildRequest(){ return { ok:false, notReady:true, errors:['No fiscalisation adapter for ' + String(code||'this country') + ' is installed on this device.'] }; }, validate(){ return []; } };
  const getCountry = code => countries[String(code||'').toUpperCase()] || null;
  const listCountries = () => Object.keys(countries).map(c => ({ code:c, name:countries[c].name, authority:countries[c].authority, integrationVersion:countries[c].integrationVersion }));
  /* Is this device adapter allowed for this country? Both sides must agree. 'unsupported' (the "no integration" placeholder) can never produce a result, so it is harmless anywhere. */
  function deviceAllowedForCountry(deviceAdapterId, countryCode){
    if(!deviceAdapterId || deviceAdapterId === 'unsupported') return true;
    const c = getCountry(countryCode), d = registry[deviceAdapterId];
    if(!c || !d) return false;
    return (c.supportedDeviceAdapters || []).indexOf(deviceAdapterId) >= 0 && (d.countries || []).map(x => String(x).toUpperCase()).indexOf(c.code) >= 0;
  }

  /* The standard, country-independent transaction every country adapter receives. */
  function toStandardTransaction(sale, kind, opts){
    opts = opts || {};
    const lines = (sale.items || []).map((i, n) => {
      const qty = Number(i.qty), price = Number(i.price);
      const taxable = i.taxable !== false;
      return { no:n + 1, name:String(i.name || ''), qty, unitPrice:price, total:Math.round(qty * price * 100) / 100, taxable,
               taxRate: taxable ? (opts.taxPercent != null ? Number(opts.taxPercent) : (sale.taxPercent != null ? Number(sale.taxPercent) : null)) : null,
               hsCode: i.hsCode || null, productId: i.productId != null ? i.productId : null };
    });
    return { schema:'aureum.fiscal.tx/1', id:sale.uid, number:sale.orderNo || null, kind:kind || 'sale', shop:sale.shop || null, issuedAt:sale.dateTime || null,
             currency: opts.currency || sale.currency || null, taxInclusive: !!sale.taxInclusive, lines,
             discount: Number(sale.discountAmount || 0), subtotal: sale.subtotal != null ? Number(sale.subtotal) : null, tax: sale.tax != null ? Number(sale.tax) : null, total: Number(sale.total),
             payments:[{ method: sale.payment || 'Other', amount: Number(sale.total) }],
             buyer: sale.customer && sale.customer !== 'N/A' ? { name: String(sale.customer) } : null,
             original: opts.original || null, notes: opts.notes || sale.note || null };
  }

  /* ---------- transaction engine ---------- */
  const idempotencyKey = (kind, receiptUid) => (kind === 'credit_note' ? 'credit:' : 'sale:') + receiptUid;
  function snapshotFromSale(sale){
    return {
      receipt: sale.orderNo || sale.id || null, receiptUid: sale.uid, dateTime: sale.dateTime || null,
      currency: sale.currency || null, total: sale.total, subtotal: sale.subtotal, tax: sale.tax, discount: sale.discountAmount || 0,
      taxInclusive: !!sale.taxInclusive, payment: sale.payment || null, customer: sale.customer || null,
      items: (sale.items || []).map(i => ({ name:i.name, qty:i.qty, price:i.price, taxable:i.taxable !== false }))
    };
  }
  function addHistory(tx, event, detail){
    tx.history = (tx.history || []).concat([{ at: new Date().toISOString(), event, ...(detail || {}) }]);
  }
  const withTimeout = (p, ms) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('timeout'), { timeout:true })), ms);
    Promise.resolve(p).then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });

  /* store: { get(key) -> tx|null, save(tx) -> tx }  (the till backs this with Supabase + a local outbox) */
  function createEngine(opts){
    const store = opts.store, timeoutMs = opts.timeoutMs || 15000;
    const inflight = new Map();                                    // same-page double-click / double-call guard
    async function applyResult(tx, res, via){
      if(res && res.ok === true && res.fiscalRef){                // ONLY a response carrying a fiscal reference counts as fiscalised
        tx.state = 'fiscalised'; tx.fiscal_ref = String(res.fiscalRef); tx.verification_code = res.verificationCode || null; tx.qr_data = res.qrData || null;
        tx.response = res.response || res; tx.error_code = null; tx.error_message = null; tx.fiscalised_at = new Date().toISOString();
        addHistory(tx, 'fiscalised', { via });
      } else if(res && res.status === 'rejected'){
        tx.state = 'rejected'; tx.error_code = res.code || null; tx.error_message = res.message || 'Rejected'; tx.response = res.response || res; addHistory(tx, 'rejected', { code: tx.error_code, message: tx.error_message });
      } else if(res && res.status === 'failed'){
        tx.state = 'failed'; tx.error_code = res.code || null; tx.error_message = res.message || 'Failed'; tx.response = res.response || res; addHistory(tx, 'failed', { message: tx.error_message });
      } else if(res && res.status === 'uncertain'){
        tx.state = 'uncertain'; tx.error_message = res.message || 'Outcome unknown'; addHistory(tx, 'uncertain', { message: tx.error_message });
      } else {                                                    // awaiting_adapter, ok:true without a fiscal reference, or anything unrecognised
        tx.state = 'not_configured';
        tx.error_message = (res && res.message) || 'No working fiscal device — this sale was NOT fiscalised.';
        addHistory(tx, 'not_fiscalised', { message: tx.error_message });
      }
      return store.save(tx);
    }
    async function checkStatus(tx, device, adapter){
      if(tx.state === 'submitting'){ tx.state = 'uncertain'; addHistory(tx, 'uncertain', { message:'Interrupted while submitting — outcome unknown.' }); }   // e.g. page closed mid-submit
      if(typeof adapter.getFiscalTransactionStatus !== 'function'){
        addHistory(tx, 'status_check_unsupported'); return store.save(tx);                    // stays uncertain — never auto-resubmitted
      }
      let res;
      try{ res = await withTimeout(adapter.getFiscalTransactionStatus(device, tx), timeoutMs); }
      catch(e){ addHistory(tx, 'status_check_failed', { message: String(e.message||e) }); return store.save(tx); }
      addHistory(tx, 'status_checked');
      if(res && res.ok === true && res.fiscalRef) return applyResult(tx, res, 'status_check');
      if(res && res.status === 'rejected') return applyResult(tx, res, 'status_check');
      if(res && res.status === 'not_found'){                       // adapter confirms the device never received it → safe to allow a retry
        tx.state = 'failed'; tx.error_message = 'Device confirmed it has no record of this transaction.'; addHistory(tx, 'confirmed_not_submitted'); return store.save(tx);
      }
      return store.save(tx);                                       // still unknown
    }
    async function run(kind, sale, device){
      const key = idempotencyKey(kind, sale.uid);
      let tx = await store.get(key);
      if(tx && FINAL.indexOf(tx.state) >= 0) return tx;            // already done — a refresh / reopen can never resubmit
      const adapter = getAdapter(device && device.adapter);
      const country = opts.country || null;                       // optional country adapter; absent => behaves exactly as before
      if(!tx){
        tx = { business_id: opts.businessId || null, shop: sale.shop, device_id: device ? device.id : null, receipt_uid: sale.uid, kind, idempotency_key: key,
               state:'pending', attempts:0, request_snapshot: snapshotFromSale(sale), history:[] };
        addHistory(tx, 'created'); tx = await store.save(tx);
      }
      if(tx.state === 'uncertain' || tx.state === 'submitting')    // unknown outcome: ask the device, do NOT submit again
        return checkStatus(tx, device, adapter);
      if(!device || device.active === false || device.registration_status === 'deactivated'){
        tx.state = 'not_configured'; tx.error_message = 'No active fiscal device for this shop.'; addHistory(tx, 'no_device'); return store.save(tx);
      }
      if(kind === 'credit_note' && typeof adapter.submitCreditNote !== 'function'){
        tx.state = 'not_configured'; tx.error_message = 'This adapter does not support credit notes.'; addHistory(tx, 'credit_note_unsupported'); return store.save(tx);
      }
      let countryRequest;
      if(country){
        const stop = (state, msg, ev) => { tx.state = state; tx.error_message = msg; addHistory(tx, ev, { message: msg, country: country.code }); return store.save(tx); };
        if(opts.integrationStatus && !isSelectable(opts.integrationStatus)) return stop('not_configured', 'The ' + (country.name || country.code) + ' integration is not approved yet (' + (INTEGRATION_STATUS_LABEL[opts.integrationStatus] || opts.integrationStatus) + ') — this sale was NOT fiscalised.', 'integration_not_approved');
        if(!deviceAllowedForCountry(device.adapter, country.code)) return stop('not_configured', 'This device is not approved for ' + (country.name || country.code) + '.', 'device_not_allowed_for_country');
        let built;
        try{ built = country.buildRequest(toStandardTransaction(sale, kind, opts.standardOptions), { config: opts.countryConfig || {}, device }); }
        catch(e){ built = { ok:false, errors:['Country adapter error: ' + String((e && e.message) || e)] }; }
        if(!built || !built.ok){
          const msg = ((built && built.errors) || ['Could not prepare the request.']).join(' ');
          return stop(built && built.notReady ? 'not_configured' : 'failed', (built && built.notReady ? '' : 'Not submitted — ') + msg, built && built.notReady ? 'country_not_ready' : 'country_validation_failed');
        }
        const verrs = country.validate(built.request, { config: opts.countryConfig || {}, device }) || [];
        if(verrs.length) return stop('failed', 'Not submitted — ' + verrs.join(' '), 'country_validation_failed');
        countryRequest = built.request;
        tx.request_snapshot = Object.assign({}, tx.request_snapshot, { country: country.code, countryRequest });
      }
      tx.state = 'submitting'; tx.attempts = (tx.attempts || 0) + 1; addHistory(tx, 'submitting', { attempt: tx.attempts });
      tx = await store.save(tx);                                   // persisted BEFORE contacting the device, so a crash leaves 'submitting' (→ treated as uncertain)
      let res;
      try{ res = await withTimeout(kind === 'credit_note' ? adapter.submitCreditNote(device, tx, countryRequest) : adapter.submitFiscalTransaction(device, tx, countryRequest), timeoutMs); }
      catch(e){                                                    // timeout / exception: the device may or may not have received it
        tx.state = 'uncertain'; tx.error_message = e && e.timeout ? 'The device did not answer in time.' : 'Connection problem: ' + String((e && e.message) || e);
        addHistory(tx, 'uncertain', { message: tx.error_message }); return store.save(tx);
      }
      return applyResult(tx, res, 'submit');
    }
    return {
      /* Safe to call repeatedly for the same sale. Returns the stored transaction record. */
      fiscalise(sale, device, kind){
        const key = idempotencyKey(kind || 'sale', sale.uid);
        if(inflight.has(key)) return inflight.get(key);
        const p = run(kind || 'sale', sale, device).finally(() => inflight.delete(key));
        inflight.set(key, p); return p;
      },
      /* Manual retry of a transaction that is failed / not_configured (never uncertain: that must be status-checked) */
      async retry(tx, sale, device){
        if(tx.state === 'uncertain' || tx.state === 'submitting') return this.fiscalise(sale, device, tx.kind);
        if(FINAL.indexOf(tx.state) >= 0) return tx;
        return this.fiscalise(sale, device, tx.kind);
      }
    };
  }


  /* ---------- Supabase-backed helpers (client is passed in; RLS does the access control) ---------- */
  const OUTBOX_KEY = 'aureum.fiscal.outbox', CFG_KEY = 'aureum.fiscal.config';
  const lsGet = (k, d) => { try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } };
  const lsSet = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const isMissingTable = err => !!err && (err.code === '42P01' || err.code === 'PGRST205' || /does not exist|schema cache|Could not find the table/i.test(err.message || ''));

  /* Config used by the till: which shops are fiscalised, and the active device per shop.
     Cached locally so the till still knows its settings offline. Returns { available, shops:{name:true}, devices:[…] } */
  async function loadConfig(sb, businessId){
    if(!sb || !businessId) return { available:false, shops:{}, devices:[], reason:'local' };
    try{
      let a = await sb.from('fiscal_shop_settings').select('shop,enabled,country,jurisdiction,authority,integration_id,integration_version').eq('business_id', businessId);
      let v2 = !a.error;
      if(a.error) a = await sb.from('fiscal_shop_settings').select('shop,enabled').eq('business_id', businessId);      // v2 columns not installed yet
      const b = await sb.from('fiscal_devices').select('*').eq('business_id', businessId);
      if(a.error || b.error){
        const err = a.error || b.error;
        if(isMissingTable(err)) return { available:false, shops:{}, devices:[], reason:'not_installed' };
        throw err;
      }
      let integrations = [];
      if(v2){ const ir = await sb.from('fiscal_integrations').select('*'); if(ir.error){ v2 = false; } else integrations = ir.data || []; }   // RLS: shop owners only ever receive APPROVED rows
      const cfg = { available:true, v2, shops:{}, shopMeta:{}, devices:b.data || [], integrations };
      (a.data || []).forEach(r => { if(r.enabled) cfg.shops[r.shop] = true; cfg.shopMeta[r.shop] = { country:r.country || null, jurisdiction:r.jurisdiction || null, authority:r.authority || null, integration_id:r.integration_id || null, integration_version:r.integration_version || null }; });
      lsSet(CFG_KEY + ':' + businessId, cfg);
      return cfg;
    }catch(e){
      const cached = lsGet(CFG_KEY + ':' + businessId, null);
      return cached ? Object.assign({}, cached, { stale:true }) : { available:false, shops:{}, devices:[], reason:'offline' };
    }
  }
  const activeDeviceFor = (cfg, shop) => (cfg.devices || []).filter(d => d.shop === shop && d.active !== false && d.registration_status !== 'deactivated')[0] || null;

  /* Store for the engine: Supabase first; if the network/DB is unavailable the record is kept in a local outbox
     (never lost) and pushed later by flushOutbox(). */
  function supabaseStore(sb, businessId, userId){
    const outbox = () => lsGet(OUTBOX_KEY + ':' + businessId, {});
    const setOutbox = o => lsSet(OUTBOX_KEY + ':' + businessId, o);
    return {
      async get(key){
        const ob = outbox()[key];
        try{
          const r = await sb.from('fiscal_transactions').select('*').eq('business_id', businessId).eq('idempotency_key', key).maybeSingle();
          if(r.error) throw r.error;
          if(r.data) return r.data;
        }catch(e){ /* offline — fall through to the outbox */ }
        return ob || null;
      },
      async save(tx){
        tx.business_id = businessId; if(!tx.created_by && userId) tx.created_by = userId;
        try{
          let r;
          if(tx.id) r = await sb.from('fiscal_transactions').update(tx).eq('id', tx.id).select().single();
          else r = await sb.from('fiscal_transactions').insert(tx).select().single();
          if(r.error) throw r.error;
          const o = outbox(); if(o[tx.idempotency_key]){ delete o[tx.idempotency_key]; setOutbox(o); }
          return r.data;
        }catch(e){
          const o = outbox(); o[tx.idempotency_key] = tx; setOutbox(o); return tx;
        }
      },
      async flushOutbox(){
        const o = outbox(); const keys = Object.keys(o); let sent = 0;
        for(const k of keys){
          try{
            const ex = await sb.from('fiscal_transactions').select('id,state').eq('business_id', businessId).eq('idempotency_key', k).maybeSingle();
            if(ex.error) throw ex.error;
            const tx = Object.assign({}, o[k]); delete tx.id;
            const r = ex.data ? await sb.from('fiscal_transactions').update(tx).eq('id', ex.data.id) : await sb.from('fiscal_transactions').insert(tx);
            if(r.error) throw r.error;
            delete o[k]; sent++;
          }catch(e){ break; }
        }
        setOutbox(o); return sent;
      },
      pending: () => Object.keys(outbox()).length
    };
  }

  const receiptLabel = tx => (tx && tx.state === 'fiscalised')
    ? { fiscal:true, text:'FISCAL TAX INVOICE', ref: tx.fiscal_ref, verification: tx.verification_code, qr: tx.qr_data }
    : { fiscal:false, text: tx ? 'NOT A FISCAL TAX INVOICE' : '', ref:null };

  return { STATES, FINAL, STATE_LABEL, CONNECTION_STATUS_LABEL, REGISTRATION_LABEL, CONNECTION_TYPES, SECRET_KEYS,
           validateDevice, isPrivateOrLocalHost, registerAdapter, getAdapter, listAdapters, REQUIRED_METHODS,
           idempotencyKey, snapshotFromSale, createEngine, receiptLabel, loadConfig, activeDeviceFor, supabaseStore, isMissingTable,
           INTEGRATION_STATUS, INTEGRATION_STATUS_LABEL, isSelectable, registerCountry, getCountry, countryOrStub, listCountries, deviceAllowedForCountry, toStandardTransaction,
           registerDeviceAdapter: registerAdapter };
});
