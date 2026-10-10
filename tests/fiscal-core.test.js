// Run: node tests/fiscal-core.test.js
const F = require('../fiscal/fiscal-core.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if(c){ pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : x); } };
const memStore = () => { const m = new Map(); return { m, get: async k => m.get(k) ? JSON.parse(JSON.stringify(m.get(k))) : null, save: async tx => { m.set(tx.idempotency_key, JSON.parse(JSON.stringify(tx))); return JSON.parse(JSON.stringify(tx)); } }; };
const sale = (uid='r1') => ({ uid, orderNo:'No. 1', shop:'Harare', total:11.5, subtotal:10, tax:1.5, items:[{name:'Tea', qty:1, price:10}] });
const dev = (o) => Object.assign({ id:'d1', adapter:'mock', active:true, registration_status:'test' }, o||{});
const mock = (impl) => F.registerAdapter('mock', Object.assign({ testConnection: async()=>({ok:true}), getDeviceStatus: async()=>({ok:true}), disconnect: async()=>({ok:true}) }, impl));

(async () => {
  // --- validation
  ok('valid network device', F.validateDevice({ name:'FD', shop:'Harare', connection_type:'network', connection:{ host:'192.168.1.50', port:'9100' } }).length === 0);
  ok('missing name/shop/type', F.validateDevice({}).length === 3);
  ok('network needs host+port', F.validateDevice({ name:'a', shop:'s', connection_type:'network', connection:{} }).length === 2);
  ok('public IP rejected', F.validateDevice({ name:'a', shop:'s', connection_type:'network', connection:{ host:'8.8.8.8', port:80 } }).some(e => /private/.test(e)));
  ok('bad port rejected', F.validateDevice({ name:'a', shop:'s', connection_type:'network', connection:{ host:'10.0.0.2', port:70000 } }).some(e => /Port/.test(e)));
  ok('connector must be localhost', F.validateDevice({ name:'a', shop:'s', connection_type:'local_connector', connection:{ connectorUrl:'http://evil.example.com' } }).length === 1);
  ok('localhost connector ok', F.validateDevice({ name:'a', shop:'s', connection_type:'local_connector', connection:{ connectorUrl:'http://127.0.0.1:5000' } }).length === 0);
  ok('vendor api needs https', F.validateDevice({ name:'a', shop:'s', connection_type:'vendor_api', connection:{ endpoint:'http://x.com' } }).length === 1);
  ok('secret-looking key rejected', F.validateDevice({ name:'a', shop:'s', connection_type:'usb', connection:{ password:'x' } }).some(e => /secret/.test(e)));
  ok('usb needs no fields', F.validateDevice({ name:'a', shop:'s', connection_type:'usb', connection:{} }).length === 0);

  // --- adapters
  ok('unknown adapter -> unsupported', F.getAdapter('nope').id === 'unsupported');
  let threw = false; try{ F.registerAdapter('bad', {}); }catch(e){ threw = true; } ok('incomplete adapter refused', threw);
  const u = F.getAdapter('unsupported');
  ok('unsupported adapter: test connection is NOT ok', (await u.testConnection({})).ok === false && (await u.testConnection({})).status === 'awaiting_adapter');

  // --- engine: unsupported adapter never fakes success
  { const st = memStore(), e = F.createEngine({ store: st });
    const tx = await e.fiscalise(sale(), dev({ adapter:'unsupported' }));
    ok('unsupported -> not_configured, never fiscalised', tx.state === 'not_configured' && !tx.fiscal_ref);
    ok('history recorded', tx.history.length >= 2); }

  // --- success
  { let calls = 0; mock({ submitFiscalTransaction: async()=>{ calls++; return { ok:true, fiscalRef:'F-001', verificationCode:'ABCD', qrData:'qr', response:{raw:1} }; } });
    const st = memStore(), e = F.createEngine({ store: st });
    const tx = await e.fiscalise(sale(), dev());
    ok('success -> fiscalised with ref', tx.state === 'fiscalised' && tx.fiscal_ref === 'F-001' && tx.attempts === 1);
    ok('fiscal receipt label only when fiscalised', F.receiptLabel(tx).fiscal === true);
    await e.fiscalise(sale(), dev()); await e.fiscalise(sale(), dev());
    ok('duplicate calls after success do not resubmit', calls === 1, calls); }

  // --- ok:true WITHOUT a fiscal reference is NOT success
  { mock({ submitFiscalTransaction: async()=>({ ok:true }) });
    const tx = await F.createEngine({ store: memStore() }).fiscalise(sale(), dev());
    ok('ok without fiscalRef is not fiscalised', tx.state === 'not_configured' && F.receiptLabel(tx).fiscal === false); }

  // --- rejection is final
  { let calls = 0; mock({ submitFiscalTransaction: async()=>{ calls++; return { ok:false, status:'rejected', code:'E12', message:'Invalid TIN' }; } });
    const e = F.createEngine({ store: memStore() });
    const tx = await e.fiscalise(sale(), dev()); await e.fiscalise(sale(), dev());
    ok('rejection stored with code, final, not retried', tx.state === 'rejected' && tx.error_code === 'E12' && calls === 1); }

  // --- definitive failure may be retried
  { let n = 0; mock({ submitFiscalTransaction: async()=> (++n === 1 ? { ok:false, status:'failed', message:'Paper out' } : { ok:true, fiscalRef:'F-2' }) });
    const e = F.createEngine({ store: memStore() });
    const t1 = await e.fiscalise(sale(), dev()); ok('failure -> failed', t1.state === 'failed');
    const t2 = await e.retry(t1, sale(), dev()); ok('retry after failure succeeds', t2.state === 'fiscalised' && t2.attempts === 2); }

  // --- timeout -> uncertain; no automatic resubmission
  { let sub = 0, chk = 0;
    mock({ submitFiscalTransaction: ()=>{ sub++; return new Promise(()=>{}); }, getFiscalTransactionStatus: async()=>{ chk++; return { ok:false, status:'unknown' }; } });
    const e = F.createEngine({ store: memStore(), timeoutMs: 30 });
    const t1 = await e.fiscalise(sale(), dev()); ok('timeout -> uncertain', t1.state === 'uncertain');
    const t2 = await e.fiscalise(sale(), dev()); ok('uncertain is NOT resubmitted (status checked instead)', sub === 1 && chk === 1 && t2.state === 'uncertain', [sub, chk]);
    const t3 = await e.retry(t2, sale(), dev()); ok('manual retry of uncertain also only checks status', sub === 1 && chk === 2 && t3.state === 'uncertain'); }
  // --- uncertain resolved by status check
  { let st = 'unknown';
    mock({ submitFiscalTransaction: async()=>{ throw new Error('socket closed'); }, getFiscalTransactionStatus: async()=> st === 'done' ? { ok:true, fiscalRef:'F-9' } : st === 'nf' ? { status:'not_found' } : { status:'unknown' } });
    const e = F.createEngine({ store: memStore() });
    const t1 = await e.fiscalise(sale(), dev()); ok('exception -> uncertain', t1.state === 'uncertain');
    st = 'done'; const t2 = await e.fiscalise(sale(), dev()); ok('status check can confirm fiscalised', t2.state === 'fiscalised' && t2.fiscal_ref === 'F-9');
    const e2 = F.createEngine({ store: memStore() }); st = 'unknown'; await e2.fiscalise(sale('x'), dev()); st = 'nf';
    const t3 = await e2.fiscalise(sale('x'), dev()); ok('device confirms not received -> failed (retry allowed)', t3.state === 'failed'); }
  // --- adapter without status check: stays uncertain forever (safe)
  { let sub = 0; mock({ submitFiscalTransaction: async()=>{ sub++; throw new Error('x'); }, getFiscalTransactionStatus: undefined });
    const e = F.createEngine({ store: memStore() }); await e.fiscalise(sale(), dev()); const t = await e.fiscalise(sale(), dev());
    ok('no status API: never auto resubmits', sub === 1 && t.state === 'uncertain'); }

  // --- crash mid-submit (record left in "submitting") is treated as uncertain
  { let sub = 0; mock({ submitFiscalTransaction: async()=>{ sub++; return { ok:true, fiscalRef:'Z' }; }, getFiscalTransactionStatus: async()=>({ status:'unknown' }) });
    const st = memStore(); await st.save({ idempotency_key:'sale:r1', state:'submitting', attempts:1, history:[], kind:'sale', receipt_uid:'r1', shop:'Harare' });
    const t = await F.createEngine({ store: st }).fiscalise(sale(), dev());
    ok('leftover "submitting" is not blindly resubmitted', sub === 0 && t.state === 'uncertain'); }

  // --- concurrency: two simultaneous calls -> one submission
  { let sub = 0; mock({ submitFiscalTransaction: async()=>{ sub++; await new Promise(r => setTimeout(r, 20)); return { ok:true, fiscalRef:'C1' }; } });
    const e = F.createEngine({ store: memStore() });
    await Promise.all([e.fiscalise(sale(), dev()), e.fiscalise(sale(), dev()), e.fiscalise(sale(), dev())]);
    ok('concurrent calls submit once', sub === 1, sub); }

  // --- no device / deactivated device
  { const e = F.createEngine({ store: memStore() });
    const t = await e.fiscalise(sale(), null); ok('no device -> not_configured', t.state === 'not_configured');
    const t2 = await e.fiscalise(sale('q'), dev({ active:false })); ok('deactivated device is not used', t2.state === 'not_configured'); }
  // --- credit notes
  { mock({ submitFiscalTransaction: async()=>({ ok:true, fiscalRef:'S' }) });
    const t = await F.createEngine({ store: memStore() }).fiscalise(sale(), dev(), 'credit_note');
    ok('credit note refused when adapter cannot do it', t.state === 'not_configured' && /credit/i.test(t.error_message)); }
  ok('idempotency keys differ for sale vs credit note', F.idempotencyKey('sale','a') !== F.idempotencyKey('credit_note','a'));
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
