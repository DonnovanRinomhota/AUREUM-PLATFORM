/* Multi-till sync simulation. Several tills ring up sales at the same moment against a fake server that behaves like
   save_business_data (a save only succeeds at the version it read), optionally losing replies on purpose.
   It runs the REAL sync code taken from pos-checkout.html and backoffice.html.
   Every sale, customer and stock deduction must survive; receipt numbers must be unique.
   Run:  node tests/sync-multitill.test.js        (about a minute) */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms)), rnd = (a, b) => a + Math.random() * (b - a);
const coreOf = file => { const t = fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), i = t.indexOf('const AureumSync = (function(){'), j = t.lastIndexOf('/*', t.indexOf('==== END AUREUM SYNC CORE ====')); return t.slice(i, j); };
function makeServer(fault){
  const row = { data: { products: [{ id:1, name:'Widget', stock:100000, shopStock:{ Main:100000 } }], customers: [], receipts: [] }, version: 1 }; let counter = 511;
  const jc = v => JSON.parse(JSON.stringify(v)), lat = () => sleep(rnd(5, 40));
  return { row, client: {
    from(){ const q = { cols:'', select(c){ q.cols = c; return q; }, eq(){ return q; }, async maybeSingle(){ await lat(); const d = {}; if(/data/.test(q.cols)) d.data = jc(row.data); if(/version/.test(q.cols)) d.version = row.version; return { data:d, error:null }; } }; return q; },
    async rpc(fn, a){ await lat();
      if(fn === 'reserve_receipt_numbers'){ const n = []; for(let i = 0; i < a.p_count; i++) n.push(++counter); return { data:{ numbers:n }, error:null }; }
      if(a.p_expected_version !== null && a.p_expected_version !== row.version) return { data:{ ok:false, version:row.version }, error:null };
      row.data = jc(a.p_data); row.version++;
      if(fault && Math.random() < fault) return { data:null, error:{ message:'the reply was lost' } };      // saved, but the till never hears
      return { data:{ ok:true, version:row.version }, error:null }; },
    channel(){ const c = { on(){ return c; }, subscribe(){ return c; } }; return c; } } };
}
function makeTill(core, server, name){
  const store = {}, env = { localStorage:{ getItem:k => (k in store ? store[k] : null), setItem:(k, v) => { store[k] = String(v); }, removeItem:k => { delete store[k]; } },
    navigator:{ onLine:true }, window:{ addEventListener(){} }, document:{ createElement(){ return { style:{}, querySelector(){ return {}; }, set innerHTML(v){} }; }, body:{ appendChild(){} } },
    setInterval:() => 0, clearTimeout, setTimeout, crypto:crypto.webcrypto, console:{ error(){}, log(){} } };
  const S = new Function(...Object.keys(env), core + '\nreturn AureumSync;')(...Object.values(env)), t = { name, S, PRODUCTS:[], CUSTOMERS:[], RECEIPTS:[] };
  S.configure({ app:'pos', getSnapshot:() => ({ products:t.PRODUCTS, customers:t.CUSTOMERS, receipts:t.RECEIPTS }),       // live lists, like the till
    applyData:d => { if(d.products) t.PRODUCTS = d.products; if(d.customers) t.CUSTOMERS = d.customers; if(d.receipts) t.RECEIPTS = d.receipts; },
    isCloud:() => true, getClient:() => server.client, getBusinessId:() => 'biz', onStatus(){}, onApplied(){} });
  const used = () => new Set(t.RECEIPTS.map(r => parseInt(String(r.id).replace(/\D/g, ''), 10)));
  t.sale = (i, qty, total) => {
    const u = used(); let no = S.takeReceiptNumber(x => u.has(x)); if(no == null) no = Math.max(511, ...u) + 1;
    const p = t.PRODUCTS.find(p => p.id === 1); p.shopStock.Main -= qty; p.stock = p.shopStock.Main;
    t.CUSTOMERS.push({ uid:crypto.randomUUID(), id:t.CUSTOMERS.reduce((m, c) => Math.max(m, c.id), 0) + 1, name:'C ' + name + i, orders:1, spent:total, credit:0 });
    t.RECEIPTS.push({ uid:crypto.randomUUID(), id:String(no).padStart(4, '0'), dateTime:new Date().toISOString(), total, items:[{ productId:1, qty }] });
    S.touch();
  };
  return t;
}
async function scenario(label, file, tills, per, fault){
  const server = makeServer(fault), core = coreOf(file), devs = [];
  for(let i = 0; i < tills; i++){ const t = makeTill(core, server, 'T' + i); await t.S.start(); devs.push(t); }
  let qty = 0, tot = 0;
  await Promise.all(devs.map(async d => { for(let i = 0; i < per; i++){ const q = 1 + Math.floor(Math.random() * 3), m = Math.round(rnd(5, 120) * 100) / 100; d.sale(i, q, m); qty += q; tot += m; await sleep(rnd(0, 15)); } }));
  const N = tills * per, t0 = Date.now();
  while(Date.now() - t0 < 90000){ for(const d of devs){ d.S.touch(); await d.S.retryNow(); } if(server.row.data.receipts.length === N && devs.every(d => d.RECEIPTS.length === N)) break; await sleep(50); }
  for(let r = 0; r < 8; r++){ for(const d of devs) await d.S.retryNow(); await sleep(50); }
  const D = server.row.data, ids = new Map(); D.receipts.forEach(r => ids.set(r.id, (ids.get(r.id) || 0) + 1));
  const res = { receipts:D.receipts.length === N, customers:D.customers.length === N, uniqueNumbers:[...ids.values()].every(v => v === 1),
    stock:D.products[0].shopStock.Main === 100000 - qty, money:Math.abs(D.receipts.reduce((a, r) => a + r.total, 0) - tot) < 0.005,
    tillsAgree:devs.every(d => d.RECEIPTS.length === N && d.PRODUCTS[0].shopStock.Main === D.products[0].shopStock.Main) };
  const ok = Object.values(res).every(Boolean);
  console.log((ok ? 'PASS ' : 'FAIL ') + label, ok ? '' : JSON.stringify({ ...res, got:D.receipts.length, of:N }));
  return ok;
}
(async () => {
  let ok = true;
  for(const f of ['pos-checkout.html', 'backoffice.html']){
    ok = await scenario(f + ', 1 till x 300 sales', f, 1, 300, 0) && ok;
    ok = await scenario(f + ', 3 tills x 100 sales', f, 3, 100, 0) && ok;
    ok = await scenario(f + ', 5 tills x 60 sales', f, 5, 60, 0) && ok;
    ok = await scenario(f + ', 3 tills x 50 sales, 10% of replies lost', f, 3, 50, 0.1) && ok;
  }
  console.log(ok ? 'ALL PASSED' : 'FAILED'); process.exit(ok ? 0 : 1);
})();
