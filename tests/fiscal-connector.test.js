// Run: node tests/fiscal-connector.test.js  — profiles, generic country adapter, connector device adapter, engine safety (against the simulator)
const F = require('../fiscal/fiscal-core.js');
const Profiles = require('../fiscal/profiles.js');
require('../fiscal/countries/zw.js');
require('../fiscal/countries/generic.js');
require('../fiscal/devices/zw-virtual-fdms.js');
const conn = require('../fiscal/devices/local-connector.js');
const sim = require('../tools/fiscal-connector-sim.cjs');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if(c){ pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };
const memStore = () => { const m = new Map(); return { m, get: async k => m.get(k) ? JSON.parse(JSON.stringify(m.get(k))) : null, save: async tx => { if(!tx.id) tx.id = 'id' + m.size; m.set(tx.idempotency_key, JSON.parse(JSON.stringify(tx))); return JSON.parse(JSON.stringify(tx)); } }; };
const sale = (o) => Object.assign({ uid:'u1', orderNo:'No. 1', shop:'Nairobi', dateTime:'2026-10-10T10:00:00Z', currency:'KES', total:116, subtotal:100, tax:16, taxInclusive:false, payment:'Cash', customer:'N/A', discountAmount:0, items:[{ name:'Tea', qty:2, price:50, taxable:true }] }, o || {});
const REQ = { taxId:'A001234567B', taxpayerName:'Smith & Sons (Pvt) Ltd', branchId:'00' };
const dev = (url, extra) => Object.assign({ id:'d1', adapter:'local-connector', active:true, registration_status:'test', manufacturer:'Acme', model:'F100', serial_number:'S1', connection_type:'local_connector', connection:{ connectorUrl:url, route:'virtual', requirements:REQ } }, extra || {});

(async () => {
  /* ---------- profiles ---------- */
  const list = Profiles.list();
  ok('profiles: 15 countries with their own profile', list.length === 15 && list.every(p => /^[A-Z]{2}$/.test(p.code)));
  ok('profiles: every profile must be confirmed by the user (never presented as verified law)', list.every(p => Profiles.get(p.code).confirm === true));
  ok('profiles: an unlisted country gets a neutral profile, not a default country', (() => { const g = Profiles.get('SN'); return g.generic && g.regime === 'unknown' && !/ZIMRA|Zimbabwe/i.test(JSON.stringify(g)); })());
  ok('profiles: unknown/garbage code -> null', Profiles.get('zzz') === null && Profiles.get('') === null && Profiles.get(null) === null);
  ok('profiles: no ZIMRA wording leaks into other countries', list.filter(p => p.code !== 'ZW').every(p => !/zimra|zimbabwe/i.test(JSON.stringify(Profiles.get(p.code)))));
  ok('profiles: country-specific labels (KE=KRA PIN, ZM=TPIN, TZ=TIN+VRN)', /KRA PIN/.test(Profiles.get('KE').taxId.label) && /TPIN/.test(Profiles.get('ZM').taxId.label) && /VRN/.test(Profiles.get('TZ').vat.label));
  ok('profiles: field keys unique and none looks like a secret', list.every(p => { const k = Profiles.requirementFields(p.code).map(f => f.key); return new Set(k).size === k.length && !k.some(x => F.SECRET_KEYS.indexOf(x.toLowerCase()) >= 0); }));
  ok('profiles: only the taxpayer number is required', Profiles.requirementFields('KE').filter(f => f.required).map(f => f.key).join() === 'taxId');
  ok('profiles: strict validation asks for it', Profiles.validateRequirements('KE', {}, { strict:true }).length === 1 && Profiles.validateRequirements('KE', {}).length === 0);
  ok('profiles: business names with & ( ) , are accepted', Profiles.validateRequirements('KE', REQ, { strict:true }).length === 0);
  ok('profiles: odd characters in ids refused', Profiles.validateRequirements('KE', { taxId:'<script>' }, { strict:true }).length === 1);
  ok('profiles: portal must be https and carry no password', Profiles.validatePortal('http://x.y').length === 1 && Profiles.validatePortal('https://etims.kra.go.ke').length === 0 && Profiles.validatePortal('https://a.b/?password=1').length === 1 && Profiles.validatePortal('').length === 0);
  { const r = Profiles.readiness({ country:'KE', deviceRecorded:true, requirementsComplete:true, connected:true, integrationStatus:'in_development' });
    ok('readiness: not ready until the integration is approved', !r.ready && r.items.find(i => i.id === 'integration').done === false && /integration/.test(r.summary)); }
  { const r = Profiles.readiness({ country:'KE', deviceRecorded:true, requirementsComplete:true, connected:true, integrationStatus:'approved' }); ok('readiness: ready when all five are done', r.ready); }
  ok('readiness: no country -> first item undone', Profiles.readiness({}).items[0].done === false);
  ok('readiness: country with no device requirement says so', Profiles.readiness({ country:'ZA' }).notRequired === true);

  /* ---------- registry ---------- */
  ok('generic adapters registered for every profile country except ZW (dedicated)', list.every(p => F.getCountry(p.code)) && F.getCountry('KE').generic === true && !F.getCountry('ZW').generic);
  ok('connector allowed in any profile country; neutral device does not bypass the country side', F.deviceAllowedForCountry('local-connector', 'KE') && F.deviceAllowedForCountry('local-connector', 'ZW') && !F.deviceAllowedForCountry('local-connector', 'FR'));
  ok('ZW dedicated adapter still refuses without a gateway (unchanged)', F.getCountry('ZW').buildRequest({ lines:[], discount:0, currency:'USD', payments:[] }, { config:{}, device:{ adapter:'zw-virtual-fdms' } }).notReady === true);

  /* ---------- generic builder ---------- */
  const G = F.getCountry('KE'), std = F.toStandardTransaction(sale(), 'sale', { taxPercent:16 });
  ok('generic: incomplete tax details -> not ready (not a fake success)', G.buildRequest(std, { device:dev('http://127.0.0.1:1', { connection:{ connectorUrl:'http://127.0.0.1:1', requirements:{} } }) }).notReady === true);
  { const b = G.buildRequest(std, { device: dev('http://127.0.0.1:1') });
    ok('generic: builds neutral envelope', b.ok && b.request.schema === 'aureum.fiscal.request/1' && b.request.country === 'KE' && b.request.taxpayer.taxId === REQ.taxId && b.request.device.model === 'F100' && b.request.transaction.total === 116, b);
    ok('generic: validates a good request', G.validate(b.request).length === 0, G.validate(b.request));
    const bad = JSON.parse(JSON.stringify(b.request)); bad.transaction.payments[0].amount = 5; ok('generic: payments must equal the total', G.validate(bad).length === 1);
    const bad2 = JSON.parse(JSON.stringify(b.request)); bad2.transaction.lines[0].qty = 0; ok('generic: quantity must be positive', G.validate(bad2).some(e => /Quantity/.test(e))); }
  ok('generic: country with "no device required" says so', F.getCountry('ZA').buildRequest(std, { device: dev('x') }).notReady === true);
  ok('ZW + connector goes through the neutral envelope', (() => { const b = F.getCountry('ZW').buildRequest(F.toStandardTransaction(sale({ currency:'USD' }), 'sale', {}), { config:{}, device: dev('http://127.0.0.1:1') }); return b.ok && b.request.country === 'ZW'; })());

  /* ---------- connector adapter against the simulator ---------- */
  const S = await sim.start({ mode:'ok' }), D = dev(S.url);
  const run = (sl, d, st, kind) => F.createEngine({ store: st, country: F.getCountry('KE'), integrationStatus:'approved', standardOptions:{ currency:'KES', taxPercent:16 }, timeoutMs: 1500 }).fiscalise(sl, d, kind);
  { const t = await F.getAdapter('local-connector').testConnection(D); ok('connector: health ok -> connected', t.ok && t.status === 'connected' && /SIMULATOR/.test(t.message), t); }
  { const st = memStore(), tx = await run(sale(), D, st); ok('end to end: fiscalised with the connector\'s reference', tx.state === 'fiscalised' && /^SIMULATED-/.test(tx.fiscal_ref), tx);
    ok('simulated reference is labelled TEST ONLY on the receipt', F.receiptLabel(tx).fiscal === false && /TEST ONLY/.test(F.receiptLabel(tx).text));
    ok('request carried idempotency key + country + taxpayer', (() => { const c = S.state.calls.filter(x => x.url === '/aureum/v1/fiscalise').pop().body; return c.idempotencyKey === 'sale:u1' && c.country === 'KE' && c.request.taxpayer.taxId === REQ.taxId && c.protocol === 'aureum.fiscal.connector/1'; })());
    const before = S.state.calls.filter(x => x.url === '/aureum/v1/fiscalise').length; await run(sale(), D, st);
    ok('already fiscalised: reopening/reprinting never resubmits', S.state.calls.filter(x => x.url === '/aureum/v1/fiscalise').length === before); }
  { const st = memStore(), tx = await run(sale({ uid:'cn1' }), D, st, 'credit_note'); ok('credit note goes to /credit-note', tx.state === 'fiscalised' && S.state.calls.some(c => c.url === '/aureum/v1/credit-note')); }
  S.state.mode = 'reject'; { const tx = await run(sale({ uid:'r1' }), D, memStore()); ok('rejected stays rejected, with the authority\'s message', tx.state === 'rejected' && /simulated authority/.test(tx.error_message) && tx.error_code === 'SIM-REJECT', tx); }
  S.state.mode = 'fail'; { const tx = await run(sale({ uid:'f1' }), D, memStore()); ok('failed -> can be retried', tx.state === 'failed', tx); }
  S.state.mode = 'garbage'; { const tx = await run(sale({ uid:'g1' }), D, memStore()); ok('unreadable answer -> uncertain, never a success', tx.state === 'uncertain', tx); }
  S.state.mode = 'error500'; { const tx = await run(sale({ uid:'e5' }), D, memStore()); ok('server error -> uncertain (outcome unknown)', tx.state === 'uncertain', tx); }
  { const st = memStore(), tx = await run(sale({ uid:'e6' }), D, st); S.state.mode = 'ok'; const n = S.state.calls.filter(x => x.url === '/aureum/v1/fiscalise').length;
    const again = await run(sale({ uid:'e6' }), D, st);
    ok('uncertain is resolved by asking the connector, not by resending', S.state.calls.filter(x => x.url === '/aureum/v1/fiscalise').length === n && S.state.calls.some(c => c.url === '/aureum/v1/status'), again.state);
    ok('connector says it never saw it -> failed (safe to retry), still not resent', again.state === 'failed' && /no record/.test(again.error_message), again);
    const fin = await run(sale({ uid:'e6' }), D, st); ok('manual retry after that -> fiscalised', fin.state === 'fiscalised', fin); }
  S.state.mode = 'slow'; S.state.slowMs = 4000; { const t0 = Date.now(), tx = await F.createEngine({ store: memStore(), country: F.getCountry('KE'), integrationStatus:'approved', standardOptions:{ currency:'KES' }, timeoutMs: 300 }).fiscalise(sale({ uid:'s1' }), D); ok('timeout -> uncertain quickly', tx.state === 'uncertain' && Date.now() - t0 < 2500, tx.state); }
  S.state.mode = 'notready'; { const t = await F.getAdapter('local-connector').testConnection(D); ok('device not ready is reported, not "connected"', !t.ok && /not ready/i.test(t.message), t); }
  S.state.mode = 'ok';
  { const t = await F.getAdapter('local-connector').testConnection(dev('http://127.0.0.1:1')); ok('connector not running -> unreachable with guidance', !t.ok && t.status === 'unreachable' && /Check that it is running/.test(t.message), t); }
  { const t = await F.getAdapter('local-connector').testConnection(dev('')); ok('no address -> not configured', !t.ok && t.status === 'not_configured', t); }
  { const t = await F.getAdapter('local-connector').testConnection(dev('http://192.168.1.50:9000', { connection_type:'network', connection:{ host:'192.168.1.50', port:'9000' } })); ok('LAN http device -> unreachable + explains the browser limit', !t.ok && /browsers block plain-http/.test(t.message), t); }

  /* ---------- approval gate still wins ---------- */
  { const calls0 = S.state.calls.length;
    for(const status of ['in_development', 'testing', 'disabled']){
      const tx = await F.createEngine({ store: memStore(), country: F.getCountry('KE'), integrationStatus: status, standardOptions:{ currency:'KES' } }).fiscalise(sale({ uid:'gate' + status }), D);
      ok('gate: ' + status + ' integration -> NOT fiscalised and nothing sent', tx.state === 'not_configured' && /not approved/.test(tx.error_message));
    }
    ok('gate: the connector was never called', S.state.calls.length === calls0); }
  { const tx = await F.createEngine({ store: memStore(), country: F.getCountry('KE'), integrationStatus:'approved', standardOptions:{ currency:'KES' } }).fiscalise(sale({ uid:'wrong' }), dev(S.url, { adapter:'zw-virtual-fdms' })); ok('a Zimbabwe-only device cannot be used in Kenya', tx.state === 'not_configured' && /not approved for/.test(tx.error_message), tx); }
  { const tx = await F.createEngine({ store: memStore(), country: F.getCountry('KE'), integrationStatus:'approved', standardOptions:{ currency:'KES' } }).fiscalise(sale({ uid:'noreq' }), dev(S.url, { connection:{ connectorUrl:S.url, requirements:{} } })); ok('missing taxpayer number -> not fiscalised, nothing sent', tx.state === 'not_configured' && /incomplete/.test(tx.error_message), tx); }

  /* ---------- device validation ---------- */
  ok('device validation: nested secret keys refused', F.validateDevice({ name:'x', shop:'s', connection_type:'local_connector', connection:{ connectorUrl:'http://127.0.0.1:1', requirements:{ password:'x' } } }).some(e => /secret/.test(e)));
  ok('device validation: normal requirements accepted', F.validateDevice({ name:'x', shop:'s', connection_type:'local_connector', connection:{ connectorUrl:'http://127.0.0.1:1', requirements:REQ } }).length === 0);

  await S.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
