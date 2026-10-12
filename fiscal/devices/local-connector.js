/* AUREUM fiscalisation — DEVICE ADAPTER: fiscal connector (any manufacturer, any country).

   A "connector" is a small program that sits between AUREUM and the fiscal hardware or the authority's online system.
   It knows the device's protocol / the authority's message format, holds any certificates, signs, and answers with the
   fiscal reference. AUREUM talks to it with one simple, documented contract (see FISCALISATION.md → "Connector protocol"):

     GET  {base}/aureum/v1/health        -> { protocol:'aureum.fiscal.connector/1', ok:true, device:{ ready:true, model?, serial? } }
     POST {base}/aureum/v1/fiscalise     <- { protocol, idempotencyKey, kind:'sale', country, request, receipt }
                                          -> { status:'fiscalised', fiscalRef, verificationCode?, qrData?, idempotencyKey? }
                                           | { status:'rejected'|'failed', code?, message }
     POST {base}/aureum/v1/credit-note   same shape, kind 'credit_note'
     POST {base}/aureum/v1/status        <- { protocol, idempotencyKey }
                                          -> { status:'fiscalised', fiscalRef, … } | { status:'rejected'… } | { status:'not_found' } | { status:'unknown' }

   {base} is the connector address saved on the device: http://127.0.0.1:PORT (local connector on this computer) or an https:// URL.
   Safety rules implemented here:
   - a sale is "fiscalised" ONLY when the answer says so AND carries a fiscal reference; anything else is never a success;
   - a network error, timeout, server error or unreadable answer means the outcome is UNKNOWN (the engine marks it uncertain and
     never resends automatically — it asks the connector for the status instead);
   - no cookies / credentials are ever sent, and no secret is stored in AUREUM: certificates and keys stay in the connector. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory(require('../fiscal-core.js'));
  else factory(root.AureumFiscal);
})(typeof self !== 'undefined' ? self : this, function(F){
  'use strict';
  const PROTOCOL = 'aureum.fiscal.connector/1', API = '/aureum/v1';
  const refOk = v => typeof v === 'string' && v.trim().length > 0 && v.length <= 200;

  function baseUrl(device){
    const c = (device && device.connection) || {}, t = device && device.connection_type;
    if(t === 'local_connector' && c.connectorUrl) return String(c.connectorUrl).trim().replace(/\/+$/, '');
    if(t === 'vendor_api' && c.endpoint) return String(c.endpoint).trim().replace(/\/+$/, '');
    if(t === 'network' && c.host) return 'http://' + String(c.host).trim() + (c.port ? ':' + String(c.port).trim() : '');
    return '';
  }
  const hasFetch = () => typeof fetch === 'function';
  async function call(device, path, body, ms){
    const base = baseUrl(device);
    if(!base) throw Object.assign(new Error('This device has no connector address saved.'), { config:true });
    if(!hasFetch()) throw new Error('This browser cannot reach a connector.');
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ac ? setTimeout(() => ac.abort(), ms || 12000) : null;
    try{
      const res = await fetch(base + API + path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type':'application/json', 'Accept':'application/json' } : { 'Accept':'application/json' },
        body: body ? JSON.stringify(body) : undefined, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer', signal: ac ? ac.signal : undefined });
      let json = null; try{ json = await res.json(); }catch(e){ json = null; }
      return { http: res.status, ok: res.ok, json };
    } finally { if(timer) clearTimeout(timer); }
  }
  const envelope = (tx, country, kind, countryRequest) => ({ protocol: PROTOCOL, idempotencyKey: tx.idempotency_key, kind, country: country || (countryRequest && countryRequest.country) || null,
    request: countryRequest || null, receipt: { uid: tx.receipt_uid, number: tx.request_snapshot && tx.request_snapshot.receipt || null } });

  /* Map an answer to the engine's vocabulary. Throws when the outcome is unknown, so the engine records "uncertain". */
  function interpret(r, tx){
    const j = r.json;
    if(r.http >= 500 || !j || typeof j !== 'object') throw new Error('The connector gave no usable answer (HTTP ' + r.http + ').');
    if(j.idempotencyKey && tx && j.idempotencyKey !== tx.idempotency_key) throw new Error('The connector answered for a different sale.');
    const msg = typeof j.message === 'string' ? j.message.slice(0, 300) : '';
    if(j.status === 'fiscalised'){
      if(!refOk(j.fiscalRef)) throw new Error('The connector said fiscalised but sent no fiscal reference.');
      return { ok:true, fiscalRef: j.fiscalRef.trim(), verificationCode: typeof j.verificationCode === 'string' ? j.verificationCode.slice(0, 200) : null, qrData: typeof j.qrData === 'string' ? j.qrData.slice(0, 2000) : null, response: { status:'fiscalised', fiscalRef: j.fiscalRef } };
    }
    if(j.status === 'rejected') return { ok:false, status:'rejected', code: j.code ? String(j.code).slice(0, 60) : null, message: msg || 'Rejected by the tax authority.', response:{ status:'rejected', code:j.code } };
    if(j.status === 'failed')   return { ok:false, status:'failed',   code: j.code ? String(j.code).slice(0, 60) : null, message: msg || 'The device could not process this sale.', response:{ status:'failed', code:j.code } };
    if(r.http >= 400) return { ok:false, status:'failed', message: msg || ('The connector refused the request (HTTP ' + r.http + ').') };
    throw new Error('The connector gave an answer AUREUM does not recognise.');
  }

  const adapter = {
    id: 'local-connector', label: 'Fiscal connector (any device)', supported: true, countries: ['*'], version: '1',
    async testConnection(device){
      try{
        const r = await call(device, '/health', null, 6000);
        if(!r.ok || !r.json || r.json.protocol !== PROTOCOL) return { ok:false, status:'error', message:'Something answered, but it is not an AUREUM fiscal connector (expected protocol ' + PROTOCOL + ').' };
        const dv = r.json.device || {};
        if(r.json.ok !== true || dv.ready === false) return { ok:false, status:'error', message: (typeof r.json.message === 'string' && r.json.message.slice(0, 200)) || 'The connector is running but the fiscal device is not ready.' };
        return { ok:true, status:'connected', message:'The connector answered and reports the device is ready.' + (dv.model ? ' Model: ' + String(dv.model).slice(0, 60) + '.' : '') };
      }catch(e){
        if(e && e.config) return { ok:false, status:'not_configured', message:e.message };
        return { ok:false, status:'unreachable', message:'Could not reach the connector at ' + baseUrl(device) + '. Check that it is running, that the address is right' + (/^http:\/\/(?!127\.0\.0\.1|localhost)/.test(baseUrl(device)) ? ', and note that browsers block plain-http devices on the network — use a connector on this computer instead' : '') + '.' };
      }
    },
    async getDeviceStatus(device){ return this.testConnection(device); },
    async submitFiscalTransaction(device, tx, countryRequest){ return interpret(await call(device, '/fiscalise', envelope(tx, tx.request_snapshot && tx.request_snapshot.country, 'sale', countryRequest)), tx); },
    async submitCreditNote(device, tx, countryRequest){ return interpret(await call(device, '/credit-note', envelope(tx, tx.request_snapshot && tx.request_snapshot.country, 'credit_note', countryRequest)), tx); },
    async getFiscalTransactionStatus(device, tx){
      const r = await call(device, '/status', { protocol: PROTOCOL, idempotencyKey: tx.idempotency_key });
      const j = r.json;
      if(!j || typeof j !== 'object' || r.http >= 500) return { ok:false, status:'unknown', message:'The connector could not say.' };
      if(j.status === 'not_found') return { ok:false, status:'not_found' };
      if(j.status === 'fiscalised' || j.status === 'rejected'){ try{ return interpret(r, tx); }catch(e){ return { ok:false, status:'unknown', message:String(e.message) }; } }
      return { ok:false, status:'unknown', message: typeof j.message === 'string' ? j.message.slice(0, 200) : 'Still unknown.' };
    },
    disconnect(){ return Promise.resolve({ ok:true }); }
  };
  adapter._interpret = interpret;
  if(F && F.registerDeviceAdapter) F.registerDeviceAdapter('local-connector', adapter);
  return adapter;
});
