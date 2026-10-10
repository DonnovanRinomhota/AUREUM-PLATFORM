/* AUREUM Bot — "insights": answers questions about the business's OWN numbers (sales, profit, stock, customers…) and
   takes people to the right screen. Read-only and fully on the device: it only looks at a snapshot of the data that is
   already loaded in Back Office, sends nothing anywhere, and can never change anything.
   Usage:  const ins = AureumInsights.create(() => snapshot);   ins.answer(text, ctx) → reply object or null
   Snapshot shape (built by backoffice.html):
     { now, currency, role, shop, shops:[name], taxPct,
       products:[{id,name,cat,price,cost,stockControl,stocks:{shop:qty},low,safety}],
       receipts:[{id,t,total,refund,payment,customer,employee,shop,items:[{name,qty,price,cost}]}],
       expenses:[{t,category,description,amount}], customers:[{name,segment}], openShifts:[{employee,shop,since}] }
   The profit sums mirror the Accounting screen exactly: revenue = sales − refunds; cost of revenue = revenue × the
   blended cost ratio of the sales in view; profit before tax = gross profit − expenses; no tax on a loss. */
(function(root){
const DAY = 86400000;
const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const MON_RX = 'january|february|march|april|june|july|august|september|october|november|december|jan|feb|apr|jun|jul|aug|sept|sep|oct|nov|dec';
const WEEKDAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
const NOT_A_CUSTOMER = new Set(['','n/a','na','n.a','none','null','undefined','-','—','walk-in','walk in','walkin','walk-in customer','guest','anonymous','cash customer','customer']);
const NUMWORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10, twelve:12, fourteen:14, fifteen:15, twenty:20, thirty:30, sixty:60, ninety:90 };

/* ---------- small helpers ---------- */
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’‘`´]/g, "'").replace(/'s\b/g, 's').replace(/\b(today|yesterday)s\b/g, '$1').replace(/[^a-z0-9%./\s-]/g, ' ').replace(/(\d)\.(?!\d)/g, '$1 ').replace(/\s+/g, ' ').trim();
const sod = t => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const addDays = (t, n) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime(); };
const monthStart = (y, m) => new Date(y, m, 1).getTime();
const pluralise = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const lev = (a, b, max) => { if(Math.abs(a.length - b.length) > max) return max + 1; let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for(let i = 1; i <= a.length; i++){ const cur = [i]; let rowMin = i; for(let j = 1; j <= b.length; j++){ cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); rowMin = Math.min(rowMin, cur[j]); } if(rowMin > max) return max + 1; prev = cur; }
  return prev[b.length]; };
const wstem = w => { w = w.replace(/ies$/, 'y'); if(w.length > 3 && /s$/.test(w) && !/ss$/.test(w)) w = w.slice(0, -1); return w; };
const fmtDate = (t, now) => { const d = new Date(t); const s = d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3).replace(/^./, c => c.toUpperCase()); return d.getFullYear() === new Date(now).getFullYear() ? s : s + ' ' + d.getFullYear(); };
const dayName = i => WEEKDAYS[i].replace(/^./, c => c.toUpperCase());
const titleCase = s => s.replace(/\b\w/g, c => c.toUpperCase());

/* ---------- periods ---------- */
function parsePeriod(n, now){
  const today = sod(now), tomorrow = addDays(today, 1), dow = (new Date(now).getDay() + 6) % 7;      // Monday = 0
  const mk = (key, start, end, label, extra) => Object.assign({ key, start, end, label }, extra || {});
  let m;
  if(/\b(all time|ever|overall|since (we|i) (started|opened|began)|since the (start|beginning)|in total|to date|lifetime)\b/.test(n) && !/\b(year|month|week) to date\b/.test(n)) return mk('all', 0, tomorrow, 'all time');
  if(/\bday before yesterday\b/.test(n)) return mk('day', addDays(today, -2), addDays(today, -1), 'the day before yesterday');
  if(/\byesterday\b/.test(n)) return mk('yesterday', addDays(today, -1), today, 'yesterday');
  if(/\b(today|so far today|this morning|this afternoon|tonight|this evening)\b/.test(n)) return mk('today', today, tomorrow, 'today');
  if((m = n.match(/\b(?:last|past|previous)\s+(\d+|[a-z]+)\s+(day|week|month)s?\b/)) && (/^\d+$/.test(m[1]) || NUMWORDS[m[1]])){
    const k = /^\d+$/.test(m[1]) ? +m[1] : NUMWORDS[m[1]], u = m[2];
    if(k > 0 && k <= 730){ const days = u === 'day' ? k : u === 'week' ? k * 7 : k * 30; return mk('lastn', addDays(today, -(days - 1)), tomorrow, 'the last ' + pluralise(k, u), { span: days }); }
  }
  if(/\b(last|past|previous) (seven|7) days\b/.test(n)) return mk('lastn', addDays(today, -6), tomorrow, 'the last 7 days', { span: 7 });
  if(/\b(last|previous) week\b/.test(n)) return mk('last_week', addDays(today, -dow - 7), addDays(today, -dow), 'last week');
  if(/\b(this week|week to date|so far this week|the week)\b/.test(n) && /\bweek\b/.test(n)) return mk('this_week', addDays(today, -dow), tomorrow, 'this week');
  if(/\b(last|previous) month\b/.test(n)){ const d = new Date(now); const s = monthStart(d.getFullYear(), d.getMonth() - 1), e = monthStart(d.getFullYear(), d.getMonth()); return mk('last_month', s, e, titleCase(MONTHS[new Date(s).getMonth()]) + ' (last month)'); }
  if(/\b(this month|month to date|so far this month|the month)\b/.test(n) && /\bmonth\b/.test(n)){ const d = new Date(now); return mk('this_month', monthStart(d.getFullYear(), d.getMonth()), tomorrow, 'this month so far'); }
  if(/\b(last|previous) year\b/.test(n)){ const y = new Date(now).getFullYear() - 1; return mk('last_year', monthStart(y, 0), monthStart(y + 1, 0), String(y)); }
  if(/\b(this year|year to date|ytd|so far this year)\b/.test(n)){ const y = new Date(now).getFullYear(); return mk('this_year', monthStart(y, 0), tomorrow, 'this year so far'); }
  // a date: "on 12 october", "october 12"
  if((m = n.match(new RegExp('\\b(?:on |for )?(\\d{1,2})(?:st|nd|rd|th)? (' + MON_RX + ')\\b(?: (20\\d\\d))?')) ) || (m = n.match(new RegExp('\\b(' + MON_RX + ') (\\d{1,2})(?:st|nd|rd|th)?\\b(?: (20\\d\\d))?')) && [m[0], m[2], m[1], m[3]])){
    const dayN = +m[1], mon = MONTHS.findIndex(x => x.startsWith(m[2].slice(0, 3))); if(mon >= 0 && dayN >= 1 && dayN <= 31){
      const cur = new Date(now); let y = m[3] ? +m[3] : cur.getFullYear(); let s = new Date(y, mon, dayN).getTime(); if(!m[3] && s > now) s = new Date(y - 1, mon, dayN).getTime();
      return mk('day', s, addDays(s, 1), fmtDate(s, now)); }
  }
  // a named month: "in october", "for march 2026", "june"
  { m = n.match(new RegExp('\\b(' + MON_RX + ')\\b(?:\\s+(20\\d\\d))?')) || n.match(/\b(?:in|for|during|of|from|throughout)\s+(may|mar)\b(?:\s+(20\d\d))?/);
    if(m){
      const name = m[1], idx = MONTHS.findIndex(x => x === name || x.startsWith(name.slice(0, 3)));
      // "mar"/"may" alone could be a word; they only get here with a preposition in front
      if(idx >= 0){ const cur = new Date(now); let y = m[2] ? +m[2] : cur.getFullYear(); if(!m[2] && idx > cur.getMonth()) y -= 1;
        return mk('month', monthStart(y, idx), monthStart(y, idx + 1), titleCase(MONTHS[idx]) + ' ' + y); }
    } }
  // a weekday: "on monday", "last friday"
  if((m = n.match(new RegExp('\\b(last |on |this )?(' + WEEKDAYS.join('|') + ')s?\\b')))){
    const want = WEEKDAYS.indexOf(m[2]); let diff = (new Date(now).getDay() - want + 7) % 7; if(diff === 0 && m[1] === 'last ') diff = 7;
    const s = addDays(today, -diff); if(m[1] || /\b(on|last|this)\b/.test(n)) return mk('day', s, addDays(s, 1), diff === 0 ? 'today' : diff === 1 ? 'yesterday' : (m[1] === 'last ' ? 'last ' : 'on ') + dayName(want) + ' ' + fmtDate(s, now));
  }
  return null;
}
// the stretch to compare a period against ("this month so far" → the same number of days at the start of last month)
function previousPeriod(p, now){
  const today = sod(now);
  if(p.key === 'all') return null;
  if(p.key === 'today') return { key: 'yesterday', start: addDays(today, -1), end: today, label: 'yesterday' };
  if(p.key === 'this_week'){ const s = addDays(p.start, -7); return { key: 'last_week', start: s, end: Math.min(p.start, s + (p.end - p.start)), label: 'the same stretch of last week' }; }
  if(p.key === 'this_month'){ const d = new Date(p.start), s = monthStart(d.getFullYear(), d.getMonth() - 1); return { key: 'last_month', start: s, end: Math.min(p.start, s + (p.end - p.start)), label: 'the same stretch of last month' }; }
  if(p.key === 'this_year'){ const d = new Date(p.start), s = monthStart(d.getFullYear() - 1, 0); return { key: 'last_year', start: s, end: Math.min(p.start, s + (p.end - p.start)), label: 'the same stretch of last year' }; }
  if(p.key === 'last_month' || p.key === 'month'){ const d = new Date(p.start), s = monthStart(d.getFullYear(), d.getMonth() - 1); return { key: 'month', start: s, end: p.start, label: titleCase(MONTHS[new Date(s).getMonth()]) }; }
  if(p.key === 'last_year'){ const d = new Date(p.start), s = monthStart(d.getFullYear() - 1, 0); return { key: 'last_year', start: s, end: p.start, label: String(d.getFullYear() - 1) }; }
  const len = p.end - p.start; return { key: 'prev', start: p.start - len, end: p.start, label: 'the ' + Math.round(len / DAY) + ' day' + (Math.round(len / DAY) === 1 ? '' : 's') + ' before' };
}

/* ---------- where things are ---------- */
const NAV = [
  { page: 'dashboard', label: 'Dashboard', names: ['dashboard', 'home', 'home page', 'main page', 'overview', 'start page', 'homepage'] },
  { page: 'sales', label: 'Sales (receipts)', names: ['sales', 'receipts', 'sales history', 'transactions', 'sales list', 'receipt list', 'orders'] },
  { page: 'sales-by-product', label: 'Sales by product', names: ['sales by product', 'product sales', 'best sellers', 'best sellers report', 'sales per product'] },
  { page: 'products', label: 'Products', names: ['products', 'product list', 'items', 'inventory', 'catalogue', 'catalog', 'product catalogue', 'stock list'] },
  { page: 'purchases', label: 'Purchase orders', names: ['purchase orders', 'purchases', 'pos list', 'purchase order', 'po', 'pos'] },
  { page: 'goods-received', label: 'Goods received', names: ['goods received', 'grn', 'grns', 'goods received notes', 'receiving', 'deliveries'] },
  { page: 'stock-adjustments', label: 'Stock adjustments', names: ['stock adjustments', 'stock adjustment', 'adjustments', 'stocktake', 'stock take', 'stock counts'] },
  { page: 'stock-transfers', label: 'Stock transfers', names: ['stock transfers', 'transfers', 'transfer stock', 'stock transfer'] },
  { page: 'customers', label: 'Customers', names: ['customers', 'customer list', 'clients', 'loyalty', 'customer'] },
  { page: 'employees', label: 'Employees', names: ['employees', 'staff', 'employee list', 'team', 'workers', 'people', 'schedule', 'staff schedule', 'calendar', 'rota', 'roster', 'timesheets', 'hours'] },
  { page: 'suppliers', label: 'Suppliers', names: ['suppliers', 'supplier list', 'vendors'] },
  { page: 'accounting', label: 'Accounting', names: ['accounting', 'accounts', 'expenses', 'profit and loss', 'income statement', 'p and l', 'profit loss', 'books', 'finances', 'finance'] },
  { page: 'reports', label: 'Reports', names: ['reports', 'report', 'all reports'] },
  { page: 'reports', tab: 'lowstock', label: 'Low stock report', names: ['low stock', 'low stock report', 'negative stock', 'stock alerts', 'reorder report'] },
  { page: 'reports', tab: 'shifts', label: 'Shifts report', names: ['shifts', 'shift report', 'shift reports', 'cash up', 'shift closures', 'shifts report'] },
  { page: 'reports', tab: 'inventory', label: 'Available inventory', names: ['available inventory', 'inventory report', 'stock report', 'stock levels'] },
  { page: 'reports', tab: 'valuation', label: 'Inventory valuation', names: ['inventory valuation', 'stock valuation', 'stock value report', 'valuation'] },
  { page: 'reports', tab: 'staff', label: 'Staff snapshot', names: ['staff snapshot', 'staff report'] },
  { page: 'settings', tab: 'general', label: 'Business profile', names: ['settings', 'business profile', 'business settings', 'business details', 'general settings', 'my business'] },
  { page: 'settings', tab: 'stores', label: 'Stores (shops)', names: ['stores', 'shops', 'store settings', 'shop settings', 'my shops', 'my stores', 'branches', 'locations'] },
  { page: 'settings', tab: 'pos', label: 'POS devices', names: ['pos devices', 'devices', 'tills', 'registers', 'printers', 'receipt printers', 'till settings'] },
  { page: 'settings', tab: 'taxes', label: 'Taxes', names: ['taxes', 'tax settings', 'vat', 'tax', 'vat settings'] },
  { page: 'settings', tab: 'receipts', label: 'Receipts settings', names: ['receipt settings', 'receipt template', 'receipt design'] },
  { page: 'settings', tab: 'payments', label: 'Payment methods', names: ['payment methods', 'payments', 'payment settings', 'stripe', 'ecocash settings'] },
  { page: 'settings', tab: 'notifications', label: 'Notifications', names: ['notifications', 'alerts settings', 'email alerts'] },
  { page: 'settings', tab: 'users', label: 'Users & permissions', names: ['users', 'users and permissions', 'permissions', 'roles', 'user settings', 'team access'] },
  { page: 'settings', tab: 'billing', label: 'Billing & subscription', names: ['billing', 'subscription', 'billing and subscription', 'my plan', 'plan', 'invoices', 'my subscription'] },
  { page: 'settings', tab: 'fiscal', label: 'Fiscalisation', names: ['fiscalisation', 'fiscalization', 'fiscal', 'fiscal device', 'fiscal settings', 'zimra'] },
  { page: 'settings', tab: 'help', label: 'Help & FAQ', names: ['help', 'help and faq', 'faq', 'support', 'my tickets', 'tickets'] },
];
const navMatch = phrase => {
  phrase = phrase.replace(/^(the|my|our|a)\s+/, '').replace(/\s+(page|screen|section|tab|area|menu|window|list|view)$/, '').trim();
  if(!phrase) return null;
  let best = null;
  for(const t of NAV) for(const nm of t.names){ if(nm === phrase) return t; if(!best && phrase.length >= 5 && lev(phrase, nm, 1) <= 1) best = t; }
  return best;
};

/* ---------- the engine ---------- */
function create(getData){
  const data = () => { const d = getData() || {}; return Object.assign({ now: Date.now(), currency: '$', role: null, shop: 'All Shops', shops: [], taxPct: 0, products: [], receipts: [], expenses: [], customers: [], openShifts: [] }, d); };
  const money = (d, v) => (v < 0 ? '-' : '') + d.currency + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = v => (Math.round(v * 10) / 10) + '%';
  const canSeeMoney = d => !d.role || /owner|manager|admin/i.test(d.role);
  const isAll = s => !s || s === 'All Shops';
  const shopName = s => isAll(s) ? 'all shops' : s;
  const noMoney = (what) => ({ text: "I can only share " + what + " with an **owner** or **manager** login. If you need it, ask your manager — or I can help with sales, stock and product questions.", nav: [] });

  /* aggregate everything in one pass for a period + shop */
  function agg(d, period, shop){
    const rs = d.receipts.filter(r => r.t >= period.start && r.t < period.end && (isAll(shop) || r.shop === shop));
    const a = { rs, gross: 0, refunds: 0, count: 0, refundCount: 0, items: new Map(), cats: new Map(), pay: new Map(), emp: new Map(), shops: new Map(), cust: new Map(), dow: [0, 0, 0, 0, 0, 0, 0], dowN: [0, 0, 0, 0, 0, 0, 0], hour: new Array(24).fill(0), hourN: new Array(24).fill(0), saleGross: 0, saleCost: 0, units: 0 };
    const catOf = new Map(d.products.map(p => [norm(p.name), p.cat || 'Uncategorised']));
    for(const r of rs){
      const tot = Number(r.total) || 0, sign = r.refund ? -1 : 1, dt = new Date(r.t);
      if(r.refund){ a.refunds += tot; a.refundCount++; } else { a.gross += tot; a.count++; }
      const bump = (map, k, v, n) => { const o = map.get(k) || { rev: 0, n: 0 }; o.rev += v; o.n += n; map.set(k, o); };
      bump(a.pay, (r.payment || 'Other').toString(), sign * tot, r.refund ? 0 : 1);
      bump(a.emp, r.employee || 'Unknown', sign * tot, r.refund ? 0 : 1);
      bump(a.shops, r.shop || 'Unknown', sign * tot, r.refund ? 0 : 1);
      if(!r.refund){
        a.dow[dt.getDay()] += tot; a.dowN[dt.getDay()]++; a.hour[dt.getHours()] += tot; a.hourN[dt.getHours()]++;
        const ck = norm(r.customer); if(!NOT_A_CUSTOMER.has(ck)) bump(a.cust, r.customer, tot, 1);
      }
      for(const it of (r.items || [])){
        const q = (Number(it.qty) || 0) * sign, rev = q * (Number(it.price) || 0), cost = q * (Number(it.cost) || 0);
        const o = a.items.get(it.name) || { name: it.name, qty: 0, rev: 0, cost: 0 }; o.qty += q; o.rev += rev; o.cost += cost; a.items.set(it.name, o);
        const cat = catOf.get(norm(it.name)) || 'Uncategorised'; const c = a.cats.get(cat) || { name: cat, qty: 0, rev: 0, cost: 0 }; c.qty += q; c.rev += rev; c.cost += cost; a.cats.set(cat, c);
        if(!r.refund){ a.saleGross += (Number(it.qty) || 0) * (Number(it.price) || 0); a.saleCost += (Number(it.qty) || 0) * (Number(it.cost) || 0); a.units += Number(it.qty) || 0; }
      }
    }
    a.revenue = a.gross - a.refunds;
    a.ratio = a.saleGross > 0 ? a.saleCost / a.saleGross : 0.45;           // same fall-back the Accounting screen uses
    a.cogs = Math.max(0, a.revenue) * a.ratio;
    a.grossProfit = a.revenue - a.cogs;
    const ex = d.expenses.filter(e => e.t >= period.start && e.t < period.end);
    a.expList = ex; a.opex = ex.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    a.net = a.grossProfit - a.opex;
    const tp = Math.max(0, Math.min(100, Number(d.taxPct) || 0));
    a.tax = a.net > 0 ? a.net * tp / 100 : 0; a.taxPct = tp; a.after = a.net - a.tax;
    return a;
  }
  const stockAt = (p, shop) => { const st = p.stocks || {}; return isAll(shop) ? Object.keys(st).reduce((s, k) => s + (Number(st[k]) || 0), 0) : (Number(st[shop]) || 0); };
  const tracked = p => p.stockControl !== false;
  const lowOf = p => (p.low == null ? 15 : p.low);
  /* units sold per day over the last 30 days (shop-scoped) */
  function velocity(d, name, shop){
    // one pass over the receipts per question (not one per product), remembered on the snapshot
    const key = isAll(shop) ? '*' : shop; d.__vel = d.__vel || {};
    if(!d.__vel[key]){
      const from = sod(d.now) - 29 * DAY, m = new Map();
      for(const r of d.receipts){ if(r.t < from || (!isAll(shop) && r.shop !== shop)) continue; for(const it of (r.items || [])) m.set(it.name, (m.get(it.name) || 0) + (r.refund ? -1 : 1) * (Number(it.qty) || 0)); }
      d.__vel[key] = m;
    }
    return Math.max(0, d.__vel[key].get(name) || 0) / 30;
  }
  function findProducts(d, text, extraStop){
    const stop = new Set(('a an the of in on at to for from with by and or but is are was were be do does did have has had i me my we our us it its this that these those there here can could would should will how what which who when where why much many any all some more most least '
      + 'much price priced cost costs costing stock stocks stocked level levels left remaining remain qty quantity quantities units unit items item product products sell sells sold selling margin margins profit profits worth value many do we you sale sales '
      + 'run out running ran long last lasts lasting days day days cover available availability tell show give list please about info information details detail whats hows today yesterday week month year shop shops store stores much each per one two '
      + 'low high reorder restock order buy get check find look see need needed want selling sell currently now still got enough finished gone plenty').split(/\s+/).concat(extraStop || []));
    const qt = norm(text).split(' ').filter(w => w && !stop.has(w) && !/^\d+$/.test(w)).map(wstem);
    if(!qt.length) return [];
    const scored = [];
    for(const p of d.products){
      const pn = norm(p.name), pt = pn.split(' ').filter(w => w.length >= 2).map(wstem); if(!pt.length) continue;
      if(norm(text).includes(pn) && pn.length >= 3){ scored.push({ p, s: 2 + pn.length / 100 }); continue; }
      let matched = 0, strong = 0;
      for(const w of qt){ const hit = pt.some(x => x === w || (w.length >= 4 && x.length >= 4 && w[0] === x[0] && lev(w, x, 1) <= 1) || (w.length >= 4 && x.length > w.length && x.startsWith(w))); if(hit){ matched++; if(w.length >= 4) strong++; } }
      if(!matched || !strong && qt.length > 1) continue;
      const cover = matched / qt.length, comp = matched / pt.length;
      if(cover < 0.99 && !(cover >= 0.6 && matched >= 2)) continue;
      scored.push({ p, s: cover * 1 + comp * 0.5 - pt.length * 0.001 });
    }
    scored.sort((a, b) => b.s - a.s);
    if(!scored.length) return [];
    const top = scored[0].s; return scored.filter(x => x.s >= top - 0.02).map(x => x.p);
  }
  function findShop(d, n){
    if(/\b(all (the |my |our )?(shops|stores|branches|locations)|every (shop|store|branch)|across (the |my |our )?(shops|stores|business)|whole business|all outlets|overall|company wide|combined)\b/.test(n)) return 'All Shops';
    let best = null;
    for(const s of d.shops){ const sn = norm(s); if(sn && (' ' + n + ' ').includes(' ' + sn + ' ') && (!best || sn.length > norm(best).length)) best = s; }
    if(!best) for(const s of d.shops){ const sn = norm(s).replace(/\b(shop|store|branch|outlet)\b/g, '').trim(); if(sn.length >= 4 && (' ' + n + ' ').includes(' ' + sn + ' ') && (!best || sn.length > norm(best).length)) best = s; }
    return best;
  }
  const arrow = (cur, prev) => { if(prev == null) return ''; if(!prev) return cur > 0 ? ' (up from nothing)' : ''; const ch = (cur - prev) / Math.abs(prev) * 100; return ' (' + (ch >= 0 ? '▲ ' : '▼ ') + pct(Math.abs(ch)) + ')'; };
  const topN = (n) => n >= 3 && n <= 25 ? n : null;

  /* ---------- reply builders ---------- */
  const out = (text, spec, extra) => Object.assign({ type: 'insight', text, id: null, related: [], choices: [], ticket: false, confidence: 1, nav: [], asks: [], insight: spec }, extra || {});
  const scope = (d, shop) => isAll(shop) ? (d.shops.length > 1 ? ' across all shops' : '') : ' at **' + shop + '**';
  const noData = (d, spec, what, period) => out("I can't see any " + what + " for **" + period.label + "**" + scope(d, spec.shop) + " in Back Office yet." + (period.key === 'today' || period.key === 'yesterday' ? ' Try *this week* or *this month*.' : ' Try a wider period, or check the shop filter at the top.'), spec, { nav: [{ label: 'Open Sales', page: 'sales' }], asks: ['Sales this month', 'Sales all time'] });

  function runSales(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop), prev = previousPeriod(P, d.now), pa = prev ? agg(d, prev, spec.shop) : null;
    if(!a.count && !a.refundCount) return noData(d, spec, 'sales', P);
    const avg = a.count ? a.gross / a.count : 0;
    let t = '**Sales for ' + P.label + '**' + scope(d, spec.shop) + ':\n\n';
    t += '- Net sales (after refunds): **' + money(d, a.revenue) + '**' + (pa ? arrow(a.revenue, pa.revenue) + ' vs ' + prev.label : '') + '\n';
    t += '- ' + pluralise(a.count, 'sale') + ', average **' + money(d, avg) + '** each\n';
    if(a.refundCount) t += '- ' + pluralise(a.refundCount, 'refund') + ' totalling ' + money(d, a.refunds) + '\n';
    if(a.units) t += '- ' + Math.round(a.units * 100) / 100 + ' items sold\n';
    const best = [...a.items.values()].sort((x, y) => y.rev - x.rev)[0]; if(best) t += '- Best seller: **' + best.name + '** (' + money(d, best.rev) + ')\n';
    if(spec.shop === 'All Shops' || (isAll(spec.shop) && a.shops.size > 1)){ const bs = [...a.shops.entries()].sort((x, y) => y[1].rev - x[1].rev); if(bs.length > 1) t += '- Strongest shop: **' + bs[0][0] + '** (' + money(d, bs[0][1].rev) + ')\n'; }
    spec.method = 'Net sales = all sales receipts in the period minus refunds' + (isAll(spec.shop) ? '' : ' for ' + spec.shop) + '. Counted from the receipts in Back Office' + (prev ? '; compared with ' + prev.label + '.' : '.');
    return out(t, spec, { nav: [{ label: 'Open Sales', page: 'sales' }], asks: ['Compare with ' + (prev ? prev.label : 'last month'), 'Top products ' + P.label, 'Sales by payment method'] });
  }
  function runProfit(d, spec){
    if(!canSeeMoney(d)) return out(noMoney('profit and cost figures').text, spec);
    const P = spec.period, a = agg(d, P, spec.shop), prev = previousPeriod(P, d.now), pa = prev ? agg(d, prev, spec.shop) : null;
    if(!a.count && !a.refundCount && !a.expList.length) return noData(d, spec, 'sales or expenses', P);
    let t = '**Profit for ' + P.label + '**' + scope(d, spec.shop) + ' (same sums as the Accounting screen):\n\n';
    t += '- Revenue: **' + money(d, a.revenue) + '**\n- Cost of goods: ' + money(d, a.cogs) + ' (' + pct(a.ratio * 100) + ' of sales)\n- Gross profit: **' + money(d, a.grossProfit) + '** (' + pct(a.revenue > 0 ? a.grossProfit / a.revenue * 100 : 0) + ' margin)\n';
    t += '- Expenses: ' + money(d, a.opex) + '\n- **Profit before tax: ' + money(d, a.net) + '**' + (pa ? arrow(a.net, pa.net) + ' vs ' + prev.label : '') + '\n';
    if(a.taxPct) t += '- After ' + a.taxPct + '% income tax: **' + money(d, a.after) + '**' + (a.net <= 0 ? ' (no tax on a loss)' : '') + '\n';
    if(a.net < 0) t += '\nExpenses are higher than gross profit for this period.' + (a.opex > 0 ? ' Biggest expense: ' + biggestExpense(d, a) + '.' : '');
    spec.method = 'Revenue = sales − refunds. Cost of goods = revenue × the cost-to-price ratio of the items actually sold (' + pct(a.ratio * 100) + ' here). Gross profit = revenue − cost of goods. Profit before tax = gross profit − expenses recorded in Accounting. Income tax is only taken when there is a profit.';
    return out(t, spec, { nav: [{ label: 'Open Accounting', page: 'accounting' }], asks: ['Expenses ' + P.label, 'Compare with ' + (prev ? prev.label : 'last month'), 'Which products make the most profit?'] });
  }
  const biggestExpense = (d, a) => { const m = new Map(); a.expList.forEach(e => m.set(e.category || 'Other', (m.get(e.category || 'Other') || 0) + e.amount)); const b = [...m.entries()].sort((x, y) => y[1] - x[1])[0]; return b ? '**' + b[0] + '** (' + money(d, b[1]) + ')' : 'none'; };
  function runExpenses(d, spec){
    if(!canSeeMoney(d)) return out(noMoney('expenses').text, spec);
    const P = spec.period, a = agg(d, P, spec.shop);
    if(!a.expList.length) return out("No expenses are recorded for **" + P.label + "**. You can add them in Accounting.", spec, { nav: [{ label: 'Open Accounting', page: 'accounting' }] });
    const m = new Map(); a.expList.forEach(e => m.set(e.category || 'Other', (m.get(e.category || 'Other') || 0) + e.amount));
    const rows = [...m.entries()].sort((x, y) => y[1] - x[1]);
    let t = '**Expenses for ' + P.label + ':** ' + money(d, a.opex) + ' across ' + pluralise(a.expList.length, 'entry') + '.\n\n' + rows.slice(0, 6).map(([k, v]) => '- ' + k + ': ' + money(d, v) + ' (' + pct(v / a.opex * 100) + ')').join('\n');
    if(a.revenue > 0) t += '\n\nThat is ' + pct(a.opex / a.revenue * 100) + ' of revenue.';
    spec.method = 'Added up the expense entries in Accounting dated inside the period, grouped by category.';
    return out(t, spec, { nav: [{ label: 'Open Accounting', page: 'accounting' }], asks: ['Profit ' + P.label] });
  }
  function runRefunds(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop);
    if(!a.count && !a.refundCount) return noData(d, spec, 'sales', P);
    if(!a.refundCount) return out("No refunds were made in **" + P.label + "**" + scope(d, spec.shop) + ' — out of ' + pluralise(a.count, 'sale') + '. 👍', spec, { nav: [{ label: 'Open Sales', page: 'sales' }] });
    const rate = a.gross > 0 ? a.refunds / a.gross * 100 : 0, by = new Map();
    a.rs.filter(r => r.refund).forEach(r => { const k = r.employee || 'Unknown'; by.set(k, (by.get(k) || 0) + 1); });
    const top = [...by.entries()].sort((x, y) => y[1] - x[1]);
    let t = '**Refunds for ' + P.label + '**' + scope(d, spec.shop) + ':\n\n- ' + pluralise(a.refundCount, 'refund') + ' totalling **' + money(d, a.refunds) + '** (' + pct(rate) + ' of sales)\n';
    if(top.length) t += '- Most processed by: ' + top.slice(0, 3).map(([k, v]) => k + ' (' + v + ')').join(', ') + '\n';
    if(rate > 5) t += '\nThat is a fairly high refund rate — it may be worth looking at the receipts.';
    spec.method = 'Counted the refund receipts in the period and compared their total with the sales total.';
    return out(t, spec, { nav: [{ label: 'Open Sales', page: 'sales' }], asks: ['Sales ' + P.label] });
  }
  function runTop(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop), by = spec.by || 'rev', slow = spec.intent === 'slow', n = spec.n || 5;
    if(by === 'profit' && !canSeeMoney(d)) return out(noMoney('product profit').text, spec);
    let list = [...a.items.values()].filter(x => x.qty > 0);
    if(!list.length) return noData(d, spec, 'sales', P);
    const key = x => by === 'qty' ? x.qty : by === 'profit' ? x.rev - x.cost : x.rev;
    if(slow){
      // products that sold the least, including ones that did not sell at all
      const sold = new Set(list.map(x => x.name)); const idle = d.products.filter(p => !sold.has(p.name) && (isAll(spec.shop) || stockAt(p, spec.shop) !== 0 || (p.stocks && spec.shop in p.stocks)));
      list.sort((x, y) => key(x) - key(y));
      let t = '**Slowest sellers in ' + P.label + '**' + scope(d, spec.shop) + ':\n\n';
      if(idle.length) t += '- **Did not sell at all:** ' + idle.slice(0, 8).map(p => p.name).join(', ') + (idle.length > 8 ? ' and ' + (idle.length - 8) + ' more' : '') + '\n';
      t += list.slice(0, n).map(x => '- ' + x.name + ': ' + (Math.round(x.qty * 100) / 100) + ' sold (' + money(d, x.rev) + ')').join('\n');
      t += '\n\nSlow lines tie up cash — consider a promotion, or not reordering them.';
      spec.method = 'Ranked every product by units sold in the period, lowest first, and listed products with no sales separately.';
      return out(t, spec, { nav: [{ label: 'Sales by product', page: 'sales-by-product' }], asks: ['Best sellers ' + P.label] });
    }
    list.sort((x, y) => key(y) - key(x));
    const lab = by === 'qty' ? 'by units sold' : by === 'profit' ? 'by profit' : 'by sales value';
    let t = '**Top products in ' + P.label + '** (' + lab + ')' + scope(d, spec.shop) + ':\n\n';
    t += list.slice(0, n).map((x, i) => (i + 1) + '. **' + x.name + '** — ' + (Math.round(x.qty * 100) / 100) + ' sold, ' + money(d, x.rev) + (canSeeMoney(d) && by === 'profit' ? ', profit ' + money(d, x.rev - x.cost) : '')).join('\n');
    const tot = list.reduce((s, x) => s + x.rev, 0); if(tot > 0 && list.length > 1) t += '\n\nThe top ' + Math.min(3, list.length) + ' bring in ' + pct(list.slice(0, 3).reduce((s, x) => s + x.rev, 0) / tot * 100) + ' of product sales.';
    spec.method = 'Added up quantity and value per product from the sale lines, minus refunded lines, then ranked them ' + lab + '.';
    return out(t, spec, { nav: [{ label: 'Sales by product', page: 'sales-by-product' }], asks: [by === 'profit' ? 'Top products by units' : 'Which products make the most profit?', 'Slowest sellers ' + P.label, 'Compare with ' + (previousPeriod(P, d.now) || { label: 'last month' }).label] });
  }
  function runCategory(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop), list = [...a.cats.values()].filter(c => c.rev > 0).sort((x, y) => y.rev - x.rev);
    if(!list.length) return noData(d, spec, 'sales', P);
    const tot = list.reduce((s, x) => s + x.rev, 0);
    spec.method = 'Grouped the sale lines by the category of each product.';
    return out('**Sales by category, ' + P.label + '**' + scope(d, spec.shop) + ':\n\n' + list.slice(0, 8).map(c => '- ' + c.name + ': ' + money(d, c.rev) + ' (' + pct(c.rev / tot * 100) + ')').join('\n'), spec, { nav: [{ label: 'Sales by product', page: 'sales-by-product' }], asks: ['Top products ' + P.label] });
  }
  function productCard(d, p, shop, wantMargin){
    const st = stockAt(p, shop), v = velocity(d, p.name, shop), mg = p.price > 0 ? (p.price - (p.cost || 0)) / p.price * 100 : null;
    let t = '**' + p.name + '**' + (p.cat ? ' (' + p.cat + ')' : '') + ':\n\n- Price: **' + money(d, p.price) + '**\n';
    if(canSeeMoney(d)) t += '- Cost: ' + money(d, p.cost || 0) + (mg != null ? ' → margin **' + pct(mg) + '** (' + money(d, p.price - (p.cost || 0)) + ' per item)' : '') + '\n';
    if(tracked(p)){
      t += '- In stock' + (isAll(shop) ? '' : ' at ' + shop) + ': **' + (Math.round(st * 100) / 100) + '**' + (st < 0 ? ' ⚠️ negative' : st <= lowOf(p) ? ' ⚠️ low (alert at ' + lowOf(p) + ')' : '') + '\n';
      if(isAll(shop) && p.stocks && Object.keys(p.stocks).length > 1) t += '- By shop: ' + Object.keys(p.stocks).map(k => k + ' ' + p.stocks[k]).join(', ') + '\n';
      if(v > 0) t += '- Selling about ' + (Math.round(v * 10) / 10) + ' a day lately' + (st > 0 ? ' — roughly **' + Math.floor(st / v) + ' days** of stock left' : '') + '\n';
      else t += '- No sales in the last 30 days\n';
    } else t += '- Stock is not tracked for this product\n';
    return t;
  }
  function runProduct(d, spec){
    const list = spec.productIds ? d.products.filter(p => spec.productIds.includes(p.id)) : [];
    if(!list.length) return out(spec.asked ? "I couldn't find anything like that in your product list, so it looks like you don't sell it yet. You can add it from Products." : "I couldn't find a product like that. Try the product name as it appears in your list, or open Products to search.", spec, { nav: [{ label: 'Open Products', page: 'products' }] });
    spec.method = 'Read the product record (price, cost, stock by shop) and the last 30 days of sales to estimate days of stock left.';
    if(list.length === 1){ const p = list[0]; return out(productCard(d, p, spec.shop), spec, { nav: [{ label: 'Open Products', page: 'products' }], asks: ['When will ' + p.name + ' run out?', 'How much ' + p.name + ' did we sell this month?'] }); }
    const t = 'I found **' + list.length + ' products** that fit:\n\n' + list.slice(0, 8).map(p => '- **' + p.name + '** — ' + money(d, p.price) + (tracked(p) ? ', ' + (Math.round(stockAt(p, spec.shop) * 100) / 100) + ' in stock' : '')).join('\n') + (list.length > 8 ? '\n…and ' + (list.length - 8) + ' more.' : '') + '\n\nTell me which one for the full picture.';
    return out(t, spec, { asks: list.slice(0, 4).map(p => p.name), nav: [{ label: 'Open Products', page: 'products' }] });
  }
  function runProductSales(d, spec){
    const list = spec.productIds ? d.products.filter(p => spec.productIds.includes(p.id)) : [];
    if(!list.length) return runProduct(d, spec);
    const P = spec.period, a = agg(d, P, spec.shop); const rows = list.map(p => a.items.get(p.name)).filter(Boolean);
    if(!rows.length) return out('**' + list.map(p => p.name).join(', ') + '** had no sales in **' + P.label + '**' + scope(d, spec.shop) + '.', spec, { nav: [{ label: 'Sales by product', page: 'sales-by-product' }] });
    spec.method = 'Added up the sale lines for the product in the period (minus refunded lines).';
    return out(rows.map(x => '**' + x.name + '** — ' + (Math.round(x.qty * 100) / 100) + ' sold in ' + P.label + ' for **' + money(d, x.rev) + '**' + (canSeeMoney(d) ? ' (profit ' + money(d, x.rev - x.cost) + ')' : '')).join('\n\n') + scope(d, spec.shop) + '.', spec, { nav: [{ label: 'Sales by product', page: 'sales-by-product' }] });
  }
  function runRunout(d, spec){
    const list = spec.productIds ? d.products.filter(p => spec.productIds.includes(p.id)) : [];
    if(!list.length) return out("Which product? Tell me its name — for example *\"when will Sparkling Water run out?\"*", spec);
    spec.method = 'Stock now ÷ average units sold per day over the last 30 days. It is an estimate: busy days, promotions and deliveries change it.';
    const t = list.slice(0, 5).map(p => {
      const st = stockAt(p, spec.shop), v = velocity(d, p.name, spec.shop);
      if(!tracked(p)) return '**' + p.name + '** is not stock-tracked, so I can\'t forecast it.';
      if(st <= 0) return '**' + p.name + '** is already out of stock' + (st < 0 ? ' (' + st + ' — negative, check the counts)' : '') + '.';
      if(v <= 0) return '**' + p.name + '**: ' + st + ' in stock and no sales in the last 30 days — it won\'t run out soon.';
      const days = Math.floor(st / v), when = new Date(addDays(sod(d.now), days));
      return '**' + p.name + '**: ' + st + ' left, selling about ' + (Math.round(v * 10) / 10) + ' a day → lasts roughly **' + pluralise(days, 'day') + '** (around ' + fmtDate(when.getTime(), d.now) + ').' + (days <= 7 ? ' ⚠️ Time to reorder.' : '');
    }).join('\n\n');
    return out(t, spec, { nav: [{ label: 'Open Purchase orders', page: 'purchases' }], asks: ['What should I reorder?'] });
  }
  function stockIssues(d, shop){
    const neg = [], low = [];
    for(const p of d.products){
      if(!tracked(p)) continue;
      const shops = isAll(shop) ? Object.keys(p.stocks || {}) : [shop];
      shops.forEach(sh => { const q = Number((p.stocks || {})[sh]) || 0; if(q < 0) neg.push({ p, shop: sh, q }); });
      const q = stockAt(p, shop); if(q < 0) continue;
      if(q <= (p.safety != null ? Math.max(p.safety, 0) : -1) || q <= lowOf(p)) low.push({ p, q });
    }
    return { neg, low };
  }
  function runStockAlerts(d, spec){
    const { neg, low } = stockIssues(d, spec.shop); const wantNeg = spec.only === 'negative', wantOut = spec.only === 'out';
    const outOf = low.filter(x => x.q === 0);
    if(wantNeg){
      if(!neg.length) return out('No product has **negative stock**' + scope(d, spec.shop) + ' right now. ✅', spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }] });
      spec.method = 'Checked every stock-tracked product, shop by shop, for a count below zero.';
      return out('**' + pluralise(neg.length, 'negative-stock line') + '**' + scope(d, spec.shop) + ':\n\n' + neg.slice(0, 8).map(x => '- ' + x.p.name + (isAll(spec.shop) ? ' @ ' + x.shop : '') + ': **' + x.q + '**').join('\n') + '\n\nNegative stock usually means sales were made before the delivery was recorded — receive the stock (GRN) or do a stock adjustment to correct it.', spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }], asks: ['How do I fix negative stock?'] });
    }
    if(wantOut){
      if(!outOf.length) return out('Nothing is completely **out of stock**' + scope(d, spec.shop) + '.' + (low.length ? ' ' + pluralise(low.length, 'product') + ' ' + (low.length === 1 ? 'is' : 'are') + ' running low, though.' : ''), spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }], asks: low.length ? ['What is low on stock?'] : [] });
      spec.method = 'Listed stock-tracked products with exactly zero in stock.';
      return out('**Out of stock' + scope(d, spec.shop) + ':** ' + outOf.slice(0, 12).map(x => x.p.name).join(', ') + (outOf.length > 12 ? ' and ' + (outOf.length - 12) + ' more' : '') + '.', spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }], asks: ['What should I reorder?'] });
    }
    if(!neg.length && !low.length) return out('Stock looks healthy' + scope(d, spec.shop) + ' — nothing is low or negative. ✅', spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }] });
    low.sort((x, y) => x.q - y.q);
    let t = '**Stock check' + scope(d, spec.shop) + ':** ' + pluralise(neg.length, 'negative line') + ' and ' + pluralise(low.length, 'low-stock product') + '.\n\n';
    if(neg.length) t += '**Negative:** ' + neg.slice(0, 5).map(x => x.p.name + ' (' + x.q + (isAll(spec.shop) ? ' @ ' + x.shop : '') + ')').join(', ') + (neg.length > 5 ? '…' : '') + '\n\n';
    if(low.length) t += '**Low:**\n' + low.slice(0, 8).map(x => '- ' + x.p.name + ': ' + x.q + ' left (alert at ' + (x.p.safety != null ? Math.max(x.p.safety, lowOf(x.p)) : lowOf(x.p)) + ')').join('\n') + (low.length > 8 ? '\n…and ' + (low.length - 8) + ' more.' : '');
    spec.method = 'A product is low when its stock is at or under its low-stock alert (or safety stock). Negative is a count below zero in any shop.';
    return out(t, spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }], asks: ['What should I reorder?'] });
  }
  function runReorder(d, spec){
    const rows = [];
    for(const p of d.products){
      if(!tracked(p)) continue;
      const st = stockAt(p, spec.shop), v = velocity(d, p.name, spec.shop), alert = Math.max(lowOf(p), p.safety != null ? p.safety : 0);
      const days = v > 0 ? st / v : Infinity;
      if(st <= alert || days <= 10){
        const target = Math.max(Math.ceil(v * 21), alert * 2, 1);
        const need = Math.max(Math.ceil(target - st), 0); if(need > 0) rows.push({ p, st, v, days, need });
      }
    }
    if(!rows.length) return out('Nothing needs reordering right now' + scope(d, spec.shop) + ' — everything is above its alert level with enough cover. ✅', spec, { nav: [{ label: 'Low stock report', page: 'reports', tab: 'lowstock' }] });
    rows.sort((x, y) => (x.st <= 0 ? -1 : 0) - (y.st <= 0 ? -1 : 0) || x.days - y.days);
    const cost = rows.reduce((s, r) => s + r.need * (r.p.cost || 0), 0);
    let t = '**Suggested reorder' + scope(d, spec.shop) + '** — ' + pluralise(rows.length, 'product') + ':\n\n' + rows.slice(0, 10).map(r => '- **' + r.p.name + '**: ' + r.st + ' left' + (r.v > 0 ? ' (~' + (isFinite(r.days) ? Math.max(0, Math.floor(r.days)) : '∞') + ' days)' : '') + ' → order about **' + r.need + '**').join('\n');
    if(rows.length > 10) t += '\n…and ' + (rows.length - 10) + ' more.';
    if(canSeeMoney(d) && cost > 0) t += '\n\nRough cost of the suggestions: **' + money(d, cost) + '** at your current cost prices.';
    t += '\n\nThese are suggestions — check them against supplier minimums and what is already on order.';
    spec.method = 'A product is suggested when it is at/under its alert level or has under ~10 days of cover. The quantity aims for 3 weeks of sales (from the last 30 days), or twice the alert level if that is higher, minus what you hold.';
    return out(t, spec, { nav: [{ label: 'Create a purchase order', page: 'purchases' }], asks: ['How do I create a purchase order?', 'When will ' + rows[0].p.name + ' run out?'] });
  }
  function runValuation(d, spec){
    if(!canSeeMoney(d)) return out(noMoney('stock value').text, spec);
    let cost = 0, retail = 0, units = 0, lines = 0;
    d.products.forEach(p => { if(!tracked(p)) return; const q = Math.max(0, stockAt(p, spec.shop)); if(q > 0){ lines++; units += q; cost += q * (p.cost || 0); retail += q * (p.price || 0); } });
    spec.method = 'Units in stock × cost price (and × selling price for retail value), for stock-tracked products with a positive count.';
    return out('**Stock value' + scope(d, spec.shop) + ':**\n\n- At cost: **' + money(d, cost) + '**\n- At selling price: **' + money(d, retail) + '**\n- Potential gross profit: ' + money(d, retail - cost) + '\n- ' + pluralise(lines, 'product line') + ', ' + Math.round(units) + ' units', spec, { nav: [{ label: 'Inventory valuation', page: 'reports', tab: 'valuation' }] });
  }
  function runCustomers(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop), list = [...a.cust.entries()].map(([name, o]) => ({ name, rev: o.rev, n: o.n })).sort((x, y) => y.rev - x.rev);
    if(spec.sub === 'count' || spec.sub === 'overview'){
      const seg = new Map(); d.customers.forEach(c => seg.set(c.segment || 'Other', (seg.get(c.segment || 'Other') || 0) + 1));
      const order = ['VIP', 'Regular', 'Occasional', 'New', 'At risk', 'Lost', 'Inactive'];
      const rows = [...seg.entries()].sort((x, y) => (order.indexOf(x[0]) + 99) % 99 - (order.indexOf(y[0]) + 99) % 99);
      spec.method = 'Counted the customer records and their segment (VIP, Regular, At risk…), which AUREUM works out from how recently and how often each customer buys.';
      return out('**You have ' + pluralise(d.customers.length, 'customer') + '**' + (rows.length ? ':\n\n' + rows.map(([k, v]) => '- ' + k + ': ' + v).join('\n') : '.') + (a.cust.size ? '\n\n' + pluralise(a.cust.size, 'named customer') + ' bought in ' + P.label + '.' : ''), spec, { nav: [{ label: 'Open Customers', page: 'customers' }], asks: ['Who are my best customers?', 'Which customers are at risk?'] });
    }
    if(spec.sub === 'segment'){
      const want = spec.segment, rows = d.customers.filter(c => (c.segment || '').toLowerCase() === want);
      if(!rows.length) return out('No customers are currently marked **' + titleCase(want) + '**. ✅', spec, { nav: [{ label: 'Open Customers', page: 'customers' }] });
      spec.method = 'Customers are grouped automatically: At risk = no purchase in 60+ days, Lost = 120+ days, VIP = 8+ purchases in 90 days, Regular = 3+.';
      return out('**' + pluralise(rows.length, titleCase(want) + ' customer') + ':** ' + rows.slice(0, 10).map(c => c.name).join(', ') + (rows.length > 10 ? ' and ' + (rows.length - 10) + ' more' : '') + '.' + (want === 'at risk' || want === 'lost' ? '\n\nA friendly message or a small offer is the quickest way to win them back.' : ''), spec, { nav: [{ label: 'Open Customers', page: 'customers' }], asks: ['Who are my best customers?'] });
    }
    if(!list.length) return out('No named customers bought in **' + P.label + '**' + scope(d, spec.shop) + '. Sales without a customer name can\'t be ranked.', spec, { nav: [{ label: 'Open Customers', page: 'customers' }] });
    spec.method = 'Added up each named customer\'s sales in the period. Sales with no customer name (walk-ins) are left out.';
    return out('**Top customers, ' + P.label + '**' + scope(d, spec.shop) + ':\n\n' + list.slice(0, spec.n || 5).map((c, i) => (i + 1) + '. **' + c.name + '** — ' + money(d, c.rev) + ' over ' + pluralise(c.n, 'visit')).join('\n'), spec, { nav: [{ label: 'Open Customers', page: 'customers' }], asks: ['Which customers are at risk?'] });
  }
  function runCustomerLookup(d, spec){
    const c = d.customers.find(x => x.name === spec.customerName); if(!c) return out("I couldn't find that customer.", spec, { nav: [{ label: 'Open Customers', page: 'customers' }] });
    const all = { key: 'all', start: 0, end: addDays(sod(d.now), 1), label: 'all time' }, rs = d.receipts.filter(r => !r.refund && norm(r.customer) === norm(c.name));
    const total = rs.reduce((s, r) => s + (Number(r.total) || 0), 0), last = rs.reduce((m, r) => Math.max(m, r.t), 0);
    spec.method = 'Added up every sale recorded under this customer\'s name.';
    return out('**' + c.name + '**' + (c.segment ? ' (' + c.segment + ')' : '') + ':\n\n- ' + pluralise(rs.length, 'purchase') + ' totalling **' + money(d, total) + '**' + (rs.length ? ', average ' + money(d, total / rs.length) : '') + '\n' + (last ? '- Last bought ' + (Math.floor((sod(d.now) - sod(last)) / DAY) === 0 ? 'today' : pluralise(Math.floor((sod(d.now) - sod(last)) / DAY), 'day') + ' ago') + ' (' + fmtDate(last, d.now) + ')' : '- No purchases recorded yet'), spec, { nav: [{ label: 'Open Customers', page: 'customers' }] });
  }
  function runPayments(d, spec){
    const P = spec.period, a = agg(d, P, spec.shop), rows = [...a.pay.entries()].filter(([, o]) => o.rev !== 0 || o.n).sort((x, y) => y[1].rev - x[1].rev);
    if(!rows.length) return noData(d, spec, 'sales', P);
    const tot = rows.reduce((s, [, o]) => s + o.rev, 0);
    spec.method = 'Grouped the receipts in the period by how they were paid (refunds subtract).';
    return out('**How customers paid, ' + P.label + '**' + scope(d, spec.shop) + ':\n\n' + rows.map(([k, o]) => '- ' + k + ': ' + money(d, o.rev) + (tot > 0 ? ' (' + pct(o.rev / tot * 100) + ')' : '') + ' · ' + pluralise(o.n, 'sale')).join('\n'), spec, { nav: [{ label: 'Open Sales', page: 'sales' }], asks: ['Sales ' + P.label] });
  }
  function runBusiest(d, spec){
    const P = (spec.period.key === 'today' || spec.period.key === 'day') ? { key: 'lastn', start: addDays(sod(d.now), -89), end: addDays(sod(d.now), 1), label: 'the last 90 days' } : spec.period, a = agg(d, P, spec.shop);
    if(!a.count) return noData(d, spec, 'sales', P);
    const days = a.dow.map((v, i) => ({ i, v, n: a.dowN[i] })), hours = a.hour.map((v, h) => ({ h, v, n: a.hourN[h] }));
    const bd = [...days].sort((x, y) => y.v - x.v)[0], wd = days.filter(x => x.n).sort((x, y) => x.v - y.v)[0], bh = [...hours].sort((x, y) => y.v - x.v)[0];
    const hr = h => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
    spec.method = 'Added up the sales in the period by day of the week and by hour of the day (using the time each receipt was created).';
    return out('**Trading pattern, ' + P.label + '**' + scope(d, spec.shop) + ':\n\n- Best day: **' + dayName(bd.i) + '** (' + money(d, bd.v) + ' in total, ' + pluralise(bd.n, 'sale') + ')\n- Quietest day: ' + dayName(wd.i) + ' (' + money(d, wd.v) + ')\n- Busiest hour: **' + hr(bh.h) + '–' + hr((bh.h + 1) % 24) + '** (' + money(d, bh.v) + ')\n\nStaff the till well around those times.', spec, { nav: [{ label: 'Open Employees', page: 'employees' }] });
  }
  function runStaff(d, spec){
    if(!canSeeMoney(d)) return out(noMoney('staff sales figures').text, spec);
    const P = spec.period, a = agg(d, P, spec.shop), rows = [...a.emp.entries()].filter(([, o]) => o.n).sort((x, y) => y[1].rev - x[1].rev);
    if(!rows.length) return noData(d, spec, 'sales', P);
    spec.method = 'Added up the receipts each person rang through in the period (refunds they processed subtract).';
    return out('**Sales by team member, ' + P.label + '**' + scope(d, spec.shop) + ':\n\n' + rows.slice(0, 8).map(([k, o], i) => (i + 1) + '. **' + k + '** — ' + money(d, o.rev) + ' (' + pluralise(o.n, 'sale') + ')').join('\n'), spec, { nav: [{ label: 'Staff snapshot', page: 'reports', tab: 'staff' }] });
  }
  function runShops(d, spec){
    const P = spec.period, a = agg(d, P, 'All Shops'), rows = [...a.shops.entries()].sort((x, y) => y[1].rev - x[1].rev);
    if(!rows.length) return noData(d, spec, 'sales', P);
    const tot = rows.reduce((s, [, o]) => s + o.rev, 0);
    spec.method = 'Added up the receipts in the period for each shop.';
    return out('**Sales by shop, ' + P.label + ':**\n\n' + rows.map(([k, o], i) => (i + 1) + '. **' + k + '** — ' + money(d, o.rev) + (tot > 0 ? ' (' + pct(o.rev / tot * 100) + ')' : '') + ' · ' + pluralise(o.n, 'sale')).join('\n'), spec, { nav: [{ label: 'Open Sales', page: 'sales' }] });
  }
  function runShifts(d, spec){
    const o = d.openShifts || [];
    if(!o.length) return out('**No shift is open** right now. A till opens a shift when someone starts selling.', spec, { nav: [{ label: 'Shifts report', page: 'reports', tab: 'shifts' }] });
    spec.method = 'Read the list of shifts that tills have opened and not yet closed.';
    return out('**' + pluralise(o.length, 'shift') + ' open right now:**\n\n' + o.slice(0, 8).map(s => '- ' + (s.employee || 'Someone') + ' at ' + (s.shop || 'a till') + (s.since ? ' — since ' + fmtDate(s.since, d.now) + ' ' + new Date(s.since).toTimeString().slice(0, 5) : '') + (s.since && sod(s.since) < sod(d.now) ? ' ⚠️ from an earlier day, not closed' : '')).join('\n'), spec, { nav: [{ label: 'Shifts report', page: 'reports', tab: 'shifts' }] });
  }
  function runCompare(d, spec){
    const P = spec.period, prev = spec.compareTo || previousPeriod(P, d.now); if(!prev) return out("I need a period to compare — for example *\"compare this month with last month\"*.", spec);
    const a = agg(d, P, spec.shop), b = agg(d, prev, spec.shop); if(!a.count && !b.count) return noData(d, spec, 'sales', P);
    const row = (lab, x, y, isMoney) => '- ' + lab + ': **' + (isMoney ? money(d, x) : x) + '** vs ' + (isMoney ? money(d, y) : y) + arrow(x, y);
    let t = '**' + titleCase(P.label) + '** compared with **' + prev.label + '**' + scope(d, spec.shop) + ':\n\n' + row('Net sales', a.revenue, b.revenue, true) + '\n' + row('Number of sales', a.count, b.count, false) + '\n' + row('Average sale', a.count ? a.gross / a.count : 0, b.count ? b.gross / b.count : 0, true);
    if(canSeeMoney(d)) t += '\n' + row('Profit before tax', a.net, b.net, true);
    const ch = b.revenue ? (a.revenue - b.revenue) / Math.abs(b.revenue) * 100 : null;
    if(ch != null) t += '\n\n' + (Math.abs(ch) < 2 ? 'Sales are roughly flat.' : ch > 0 ? 'Sales are **up ' + pct(ch) + '** 🎉' : 'Sales are **down ' + pct(-ch) + '**.');
    if(ch != null && ch < -10){ const ia = a.items, ib = b.items; let worst = null; ib.forEach((o, k) => { const cur = ia.get(k); const dlt = (cur ? cur.rev : 0) - o.rev; if(!worst || dlt < worst.dlt) worst = { name: k, dlt }; }); if(worst && worst.dlt < 0) t += ' The biggest drop is **' + worst.name + '** (' + money(d, worst.dlt) + ').'; }
    spec.method = 'Added up both periods the same way (net sales = sales − refunds) and compared them. For a period still in progress I compare with the same stretch of the previous one so it is fair.';
    return out(t, spec, { nav: [{ label: 'Open Dashboard', page: 'dashboard' }], asks: ['Top products ' + P.label, 'Profit ' + P.label] });
  }
  function runBriefing(d, spec){
    const today = { key: 'today', start: sod(d.now), end: addDays(sod(d.now), 1), label: 'today' }, week = { key: 'this_week', start: addDays(sod(d.now), -((new Date(d.now).getDay() + 6) % 7)), end: addDays(sod(d.now), 1), label: 'this week' };
    const mo = { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' };
    const sh = spec.shop, aT = agg(d, today, sh), aW = agg(d, week, sh), aM = agg(d, mo, sh), pM = agg(d, previousPeriod(mo, d.now), sh), yest = agg(d, previousPeriod(today, d.now), sh);
    const { neg, low } = stockIssues(d, sh), risk = d.customers.filter(c => /at risk/i.test(c.segment || '')).length, old = (d.openShifts || []).filter(s => s.since && sod(s.since) < sod(d.now));
    let t = '**Business briefing' + scope(d, sh) + '**\n\n';
    t += '- **Today:** ' + money(d, aT.revenue) + ' from ' + pluralise(aT.count, 'sale') + (yest.count ? arrow(aT.revenue, yest.revenue) + ' vs yesterday' : '') + '\n';
    t += '- **This week:** ' + money(d, aW.revenue) + ' · **This month:** ' + money(d, aM.revenue) + (pM.revenue ? arrow(aM.revenue, pM.revenue) + ' vs same stretch of last month' : '') + '\n';
    if(canSeeMoney(d) && (aM.count || aM.opex)) t += '- **Profit this month so far:** ' + money(d, aM.net) + ' before tax\n';
    const flags = [];
    if(neg.length) flags.push('⚠️ ' + pluralise(neg.length, 'product line') + ' with **negative stock**');
    if(low.length) flags.push('📦 ' + pluralise(low.length, 'product') + ' **low on stock**');
    if(risk) flags.push('👥 ' + pluralise(risk, 'customer') + ' **at risk** of drifting away');
    if(old.length) flags.push('🕐 ' + pluralise(old.length, 'shift') + ' still open from an earlier day');
    if(aM.refundCount && aM.gross > 0 && aM.refunds / aM.gross > 0.05) flags.push('↩️ refunds are ' + pct(aM.refunds / aM.gross * 100) + ' of sales this month');
    if(pM.revenue > 0 && aM.revenue < pM.revenue * 0.85) flags.push('📉 sales are running ' + pct((1 - aM.revenue / pM.revenue) * 100) + ' behind last month');
    t += flags.length ? '\n**Needs attention:**\n' + flags.map(f => '- ' + f).join('\n') : '\nNothing needs attention right now. ✅';
    spec.method = 'Pulled today\'s, this week\'s and this month\'s sales, compared this month with the same stretch of last month, then checked stock levels, customer segments, refunds and open shifts.';
    const asks = []; if(neg.length || low.length) asks.push('What should I reorder?'); if(risk) asks.push('Which customers are at risk?'); asks.push('Top products this month');
    return out(t, spec, { nav: [{ label: 'Open Dashboard', page: 'dashboard' }], asks });
  }

  const RUN = { sales: runSales, profit: runProfit, expenses: runExpenses, refunds: runRefunds, top: runTop, slow: runTop, category: runCategory, product: runProduct, productsales: runProductSales, runout: runRunout, stock: runStockAlerts, reorder: runReorder, valuation: runValuation,
    customers: runCustomers, customer: runCustomerLookup, payments: runPayments, busiest: runBusiest, staff: runStaff, shops: runShops, shifts: runShifts, compare: runCompare, briefing: runBriefing };

  /* ---------- reading the question ---------- */
  const HOWTO = /^(how (do|does|can|could|should|would|will|to)\b|can (the )?(bot|aureum|you)\b|what can\b|what (is|are|was)\b.*\b(summary|segments?|difference|threshold|levels?|mean|means|meaning|definition|popup|button)\b|how (is|are|was|were|does|do|did) .*\b(calculated|worked out|computed|determined|decided|counted|measured)\b|how to\b|how does (it|that|this|the)\b|where (do|can|could|would) (i|we)\b|what('?s| is) the (way|steps|process|procedure)|steps (to|for)|can (i|we|you)\b|could (i|we|you)\b|is it possible|is there a way|why (can'?t|cant|won'?t|wont|isn'?t|isnt|doesn'?t|doesnt|is (my|the|it)|does|did)\b|what does\b|what is a\b|what are\b.*\b(for|mean)|what happens|explain how|tell me how|show me how|help me (to )?(add|create|make|set|fix|change|edit|delete|remove)|i (want|need|would like) to (add|create|make|set|change|edit|delete|remove|fix|print|import|export)|do i (need|have)|should i\b)/;
  function detect(text, n, d, ctx){
    const last = ctx && ctx.lastInsight && (Date.now() - (ctx.lastInsightAt || Date.now()) < 6 * 3600 * 1000 || true) ? ctx.lastInsight : null;
    const period = parsePeriod(n, d.now), shopHit = findShop(d, n);
    const has = rx => rx.test(n);
    const words = n.split(' ').length;
    const numM = n.match(/\btop (\d{1,2})\b|\b(\d{1,2}) (best|top|worst|slowest)\b|\b(?:best|top|worst|slowest) (\d{1,2})\b/); const nn = numM ? topN(+(numM[1] || numM[2] || numM[4])) : null;
    const base = (intent, extra) => Object.assign({ intent, period: period || null, shop: shopHit || null, n: nn }, extra || {});

    // 0. explain / working out
    if(last && has(/\b(how did you (get|work|calculate|come up|figure)|how (is|was|are|were) (that|this|it|those|these|the (number|figure|total|profit)s?) (calculated|worked out|worked|worked it out|worked out)|where (did|does|do) (that|this|those|these|the) (number|figure|total|amount|come)|explain (that|this|those|the (number|figure|result|answer|sums?|calculation))|show (me )?(your |the )?(working|workings|sums|calculation|maths|math)|how come|what is that based on|what('?s| is) (that|this) based on|why that (number|figure)|are you sure|is that right|can i trust (that|this|it)|double.?check)\b/)) return { intent: 'explain' };
    // 1. navigation: "take me to products", "open reports", "go to settings"
    { const m = n.match(/^(?:please |pls |can you |could you |can i |let me |i want to |i would like to |id like to |i need to )?(?:take me to|bring me to|go to|goto|open up|open|show me|bring up|navigate to|jump to|switch to|visit|head to|launch|pull up|display|view|see|find)\s+(?:the |my |our |a )?(.+?)$/);
      if(m){ const nav = navMatch(m[1]); if(nav) return { intent: 'nav', nav }; } }
    if(HOWTO.test(n) || /^where (are|is|do|can)\b/.test(n) || /\b(popup|pop up|button|buttons|missing|disappear\w*|not showing|can'?t see|cant see|subscription|at the till|on the till|at the pos)\b/.test(n)) return null;
    // 2. morning briefing / health check
    if(has(/\b(briefing|brief me|rundown|catch me up|business (summary|overview|health|report|update|status)|(daily|morning|weekly|today'?s) (summary|overview|update|report)|state of (the |my |our )?(business|shop|store)|how('?s| is| are) (the |my |our )?(business|shop|store|trading|things|everything|we doing|we|i doing|it going)|how am i doing|how are we doing|how('?s| is) (it|everything) going|what('?s| is) (happening|going on|new)|anything (i should|to) (know|worry|check)|(give|get) me (a |an |the )?(summary|update|overview|snapshot)|any (problems|issues|alerts)|what needs (my )?attention|what should i (know|look at|do today|focus on|worry about)|status update|summary of (the )?(business|day|shop|store)|snapshot)\b/)) return base('briefing');
    // 3. shifts
    if(has(/\b(who('?s| is| are)? (on shift|working|on duty|clocked in|at the till|open)|open shifts?|shifts? (are )?(open|running|active)|is (a |any )?(shift|till) open|any (open )?shifts?|which tills? (are )?open)\b/)) return base('shifts');
    // 4. customers
    if(has(/\b(at.?risk|lost) customers?\b|\bcustomers? (who|that) (have ?n.?t|haven.?t|has ?n.?t|stopped|have stopped|havent|not) (been back|come back|returned|bought|visited|shopped)\b|\bwho (has ?n.?t|have ?n.?t|hasn.?t|haven.?t|stopped|havent)\b.*\b(back|returned|bought|visited|shopped|come)\b|\bwin back\b|\bcustomers? (are )?(drifting|slipping|leaving)\b|\bwhich customers? (are )?(at risk|lost|inactive|drifting)\b|\binactive customers?\b/)) return base('customers', { sub: 'segment', segment: has(/\blost\b/) ? 'lost' : has(/inactive/) ? 'inactive' : 'at risk' });
    if(has(/\bvip (customers?|clients?)\b|\bwho are my vips?\b|\bmy vips?\b/)) return base('customers', { sub: 'segment', segment: 'vip' });
    if(has(/\b(best|top|biggest|loyal(est)?|most valuable|highest.?spending|big spenders?|favou?rite)\b.*\b(customers?|clients?|buyers?|shoppers?|spenders?)\b|\bwho (spends|buys|spent|bought|shops).*\bmost\b|\bwho are my best\b|\btop spenders?\b|\bbiggest spenders?\b/)) return base('customers', { sub: 'top', period: period || { key: 'all', start: 0, end: addDays(sod(d.now), 1), label: 'all time' } });
    if(has(/\bhow many (customers?|clients?)\b|\bnumber of (customers?|clients?)\b|\bcustomer (count|numbers?|base|breakdown|segments?|overview)\b|\bmy customers\b$|\bnew customers?\b|\bcustomer summary\b/)) return base('customers', { sub: 'overview' });
    { const hit = has(/\b(customer|client|spent|spend|bought|buy|buys|purchas|loyal|points|visits?|orders?|last (seen|visit|came))\b/) ? d.customers.find(c => { const cn = norm(c.name); return cn.length >= 3 && (' ' + n + ' ').includes(' ' + cn + ' '); }) || d.customers.find(c => { const parts = norm(c.name).split(' ').filter(x => x.length >= 4); return parts.some(x => (' ' + n + ' ').includes(' ' + x + ' ')) && has(/\b(spent|spend|bought|buy|buys|purchas|visit|order|last|points|loyal|customer|client)\b/); }) : null;
      if(hit && !has(/\bproducts?\b/)) return base('customer', { customerName: hit.name }); }
    // 5. reorder / stock
    if(has(/\b(reorder|re.?order|restock|re.?stock|replenish)\b|\bwhat (should|do|must|need) (i|we) (order|buy|restock|reorder|get)\b|\bwhat (needs?|to) (ordering|restocking|reordering|buying)\b|\bwhat (do|should) (i|we) need to (order|buy|restock)\b|\bshopping list\b|\bpurchase suggestion/)) return base('reorder');
    if(has(/\b(when|how soon|how long|how many days)\b.*\b(run|ran|runs|running)\s*out\b|\bhow long (will|would|does|do|until|before)\b.*\b(last|lasts|run out)\b|\bdays? (of stock|of cover|left|remaining)\b|\bstock cover\b|\bwill (we|i) run out\b|\brun out of\b/)) { const ps = findProducts(d, text); return base('runout', { productIds: ps.map(p => p.id) }); }
    if(has(/\bnegative (stock|quantity|quantities|levels?|inventory|count)s?\b|\bminus stock\b|\bstock (is |has )?(gone |gone in)?negative\b|\bbelow zero\b/)) return base('stock', { only: 'negative' });
    if(has(/\bout of stock\b|\bsold out\b|\bstock.?outs?\b|\bno stock\b|\bzero stock\b|\bempty shel(f|ves)\b|\bwhat('?s| is| has| have) (run|ran) out\b/) && !findProducts(d, text).length) return base('stock', { only: 'out' });
    if(has(/\b(low|running low|short|lowest|critical|dwindling|depleted|depleting)\b.*\b(stock|inventory|items|products|supply|supplies)\b|\b(stock|inventory|items|products)\b.*\b(low|running low|running out|short|dwindling|critical)\b|\bwhat('?s| is| are) (running|getting|almost) (low|out)\b|\bstock (alerts?|warnings?|problems?|issues?|check|health|status)\b|\bwhat needs (restocking|reordering)\b|\balmost out\b|\bnearly out\b|\bwhat('?s| is) low\b|\bmissing stock\b/)) return base('stock', {});
    if(has(/\b(stock|inventory) (value|worth|valuation)\b|\bvalue of (my |our |the )?(stock|inventory)\b|\bhow much (is |are )?(my |our |the )?(stock|inventory) worth\b|\bwhat('?s| is) (my |our |the )?(stock|inventory) worth\b|\bworth of (stock|inventory)\b|\btied up in stock\b/)) return base('valuation');
    // 6. staff / shops / payments / busiest
    if(has(/\b(best|top|highest)\b.*\b(employee|cashier|staff|seller|salesperson|team member|worker)\b|\bwho (sold|sells|made|rang|has sold)\b.*\bmost\b|\bsales (by|per) (employee|cashier|staff|person|team)\b|\bstaff (sales|performance)\b|\bemployee (sales|performance)\b|\bwho is (my )?(top|best)\b/)) return base('staff');
    if(has(/\b(which|best|top|worst|strongest|weakest|busiest)\b.*\b(shop|store|branch|outlet|location)\b|\bsales (by|per) (shop|store|branch|location)\b|\bby (shop|store|branch)\b|\beach (shop|store|branch)\b|\bshop (comparison|breakdown|ranking)\b|\bcompare (my |the |our )?(shops|stores|branches)\b/)) return base('shops');
    if(has(/\b(payment (method|type|mix|split|breakdown)s?|(cash|card|ecocash|swipe|mobile money|stripe).*\b(vs|versus|or|and)\b.*\b(cash|card|ecocash|swipe|mobile money|stripe)|how (do|did|are) (customers?|people|they) (pay|paying|paid)|paid (by|with|in) (cash|card|ecocash)|by payment|cash (sales|takings|total)|card (sales|takings|total))\b/)) return base('payments');
    if(has(/\b(busiest|quietest|slowest|peak|rush|best|worst|strongest|weakest)\b.*\b(day|days|time|times|hour|hours|period|weekday)\b|\b(what|which) (day|time|hour)s?\b.*\b(busy|busiest|best|most|quiet|slowest|peak|sales)\b|\bwhen (are|is) (we|the shop|the store|it|business) (busy|busiest|quiet|quietest)\b|\bpeak (hours?|times?|days?)\b|\bday of the week\b|\btrading (pattern|hours|times)\b|\bhow busy\b|\bbusy (on|at|during|in)\b|\bwhen do (we|customers|people) (sell|buy|shop)\b/)) return base('busiest');
    // 7. top / slow / category
    if(has(/\b(slow(est)?|worst|least|poor(ly)?|dead|weak(est)?|bottom)\b.*\b(sell|sellers?|selling|moving|products?|items?|stock|lines?|performers?)\b|\bnot (selling|moving|sold)\b|\bwhat('?s| is| are) not (selling|moving)\b|\bdead stock\b|\bnever sold\b|\bhaven.?t sold\b|\bunsold\b|\bslow.?mov(ing|ers?)\b|\bwhich (products?|items?) (are )?(don.?t|doesn.?t|do not|not|never) sell\b|\bno sales\b.*\bproducts?\b/)) return base('slow', { by: 'qty' });
    if(has(/\b(best|top|most popular|popular|fastest|hot|biggest|leading|number one|favou?rite|highest)\b.*\b(sell|sellers?|selling|products?|items?|lines?|performers?|moving|earners?|sold)\b|\bwhat sells (the )?(most|best|well)\b|\b(what|which|whats)\b.*\bselling (the )?(best|most|well|fast|quickly)\b|\bwhich (products?|items?|lines?)\b.*\b(most|best) (profitable|popular|successful)\b|\bmost profitable (products?|items?|lines?)\b|\b(products?|items?) (that |which )?(are |is )?(the )?most profitable\b|\bwhich (products?|items?) (sell|sold|are selling) (the )?(most|best)\b|\bbest.?sellers?\b|\bmost sold\b|\bsells? (the )?most\b|\bfast.?mov(ing|ers?)\b|\bwhat (do|did) (we|i|customers) (sell|buy) (the )?most\b|\btop (\d+ )?(products?|items?)\b|\b(products?|items?) (that )?(make|made|earn|earned|bring|brings|generate|generates) (me |us )?(the )?(most|more)\b/)){
      const by = has(/\bprofit|profitable|margin|make the most money|earn(er)?s?\b|most money|make (me |us )?(the )?most|bring (me |us )?(the )?most|generate/) ? 'profit' : has(/\b(units?|quantity|qty|number sold|pieces|most sold|how many)\b/) ? 'qty' : 'rev';
      return base('top', { by, period: period || { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } }); }
    if(has(/\b(sales|revenue|income|takings) (by|per) (category|categories|department|group)\b|\b(which|best|top|biggest) (product )?(category|categories|department)\b|\bby category\b|\bcategory (sales|breakdown|performance)\b/)) return base('category');
    // 8. margin / price / stock of a named product
    { const prodWords = has(/\b(finished|enough|gone|plenty|price|priced|cost|costs|margin|margins|stock|in stock|have|got|left|remaining|sell|sells|sold|profit|how many|how much|qty|quantity|levels?|selling|available|value|worth)\b/);
      if(prodWords && words <= 14){
        const ps = findProducts(d, text);
        if(ps.length && ps.length <= 12){
          const sales = has(/\b(sold|sell|sales|revenue|made|earn|earned|turnover|profit)\b/) && !has(/\b(do (we|you) sell|can (we|you) sell|sell for|sells for|selling price|selling for)\b/) && (period || has(/\bhow (many|much)\b.*\b(sold|sell|sales|made|earned)\b/));
          return base(sales ? 'productsales' : 'product', { productIds: ps.map(p => p.id), period: period || (sales ? { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } : null) });
        } }
      if(has(/^(do|did|does|will|would) (we|you|i) (sell|stock|have|carry|got)\b|^(is|are) there\b|^got any\b|^have (we|you|i) got\b/) && words <= 10){ const ps = findProducts(d, text); if(!ps.length && !/^(do|did|does|will|would) /.test(n) && !/^have (we|you|i) got/.test(n)) return null; return base('product', { productIds: ps.map(p => p.id), asked: true }); }
      if(has(/^(tell me (about|more about)|info (on|about)|information (on|about)|details (of|on|for|about)|show (me )?(the )?(details|info)( of| for| on)?|what about|status of|look up|lookup|check|find|show( me)?|get( me)?|give me)\b/) && words <= 8){ const ps = findProducts(d, text); if(ps.length && ps.length <= 6) return base('product', { productIds: ps.map(p => p.id) }); } }
    // 9. compare
    if(has(/\b(compare|compared|comparison|versus|vs|against|than (last|the previous|previous)|growth|growing|trend|trending|improv(e|ed|ing)|better than|worse than|up or down|going up|going down|up on|down on|change (in|on|from)|difference between)\b/)){
      const two = n.match(/\b(?:compare )?(.+?)\s+(?:with|to|vs|versus|against|and)\s+(.+)$/);
      if(two){ const p1 = parsePeriod(two[1], d.now), p2 = parsePeriod(two[2], d.now); if(p1 && p2) return base('compare', { period: p1, compareTo: p2 }); }
      return base('compare', { period: period || { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } }); }
    // 10. profit / expenses / refunds / sales
    if(has(/\b(profit|profits|profitable|profitability|net income|net profit|gross profit|gross margin|margins?|earn(ed|ings)?|bottom line|p and l|profit and loss|income statement|making money|make money|made money|in the black|in the red|losing money|loss)\b/)){
      if(has(/\bmargins?\b/) && findProducts(d, text).length) { const ps = findProducts(d, text); return base('product', { productIds: ps.map(p => p.id) }); }
      return base('profit', { period: period || { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } }); }
    if(has(/\b(expenses?|overheads?|opex|running costs?|operating costs?|outgoings?|bills|what (did|have|do) (i|we) spen[dt]|how much (did|have|do) (i|we) spen[dt]|spending|spent)\b/) && !has(/\bcustomers?\b/)) return base('expenses', { period: period || { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } });
    if(has(/\brefunds?\b|\brefunded\b|\breturns\b|\bmoney back\b|\bcredit notes?\b/) && has(/\b(how (many|much)|total|count|number|show|list|any|what|rate|percent|percentage|did|have|were|are|this|last|today|yesterday)\b/)) return base('refunds', { period: period || { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' } });
    if(has(/\b(sales|sale|sold|sell|selling|revenue|takings|turnover|income|trading|taken|took|banked|made|make|earned|ringing|rang|transactions?|receipts?|orders?|average (sale|basket|ticket|spend|order|transaction)|basket size)\b/) && (period || has(/\b(how (much|many)|total|what('?s| is| was| were| are)|show|tell|give|did (we|i)|have (we|i)|do (we|i)|are (we|my)|number of|average|count|so far|today|yesterday|this|last|past|in (the )?(last|past)|since|for|during|\d)\b/)) && !has(/\bcustomers? (who|that)\b/)){
      const dflt = { key: 'today', start: sod(d.now), end: addDays(sod(d.now), 1), label: 'today' };
      return base('sales', { period: period || (last && last.period && words <= 6 ? last.period : dflt) }); }
    if(/^(sales|revenue|takings|turnover)\??$/.test(n)) return base('sales', { period: { key: 'today', start: sod(d.now), end: addDays(sod(d.now), 1), label: 'today' } });
    // 11. a bare follow-up: "and last month?", "what about yesterday", "for Harare", "top 10"
    if(last && words <= 8){
      const fu = /^(and |what about |how about |same (for|in|but) |now |also |then |what if |try |show |do |for )?/.exec(n)[0];
      const rest = n.slice(fu.length);
      if(period || shopHit || (nn && /^(top|best|worst|slowest|\d)/.test(rest)) || /^(show|give) (me )?(more|all|everything)$/.test(rest) || /^(more|the rest|show more|see more|go on|top \d+)$/.test(rest)){
        const sp = Object.assign({}, last, { period: period || last.period, shop: shopHit || last.shop });
        if(nn) sp.n = nn; if(/more|rest|all|everything/.test(rest) && !nn) sp.n = Math.min(25, ((last.n || 5) + 5));
        return sp;
      }
    }
    return null;
  }

  function answer(text, ctx){
    ctx = ctx || {};
    const d = data(), n = norm(text);
    if(!n) return null;
    let spec; try{ spec = detect(text, n, d, ctx); }catch(e){ return null; }
    if(!spec) return null;
    if(spec.intent === 'nav'){
      const t = spec.nav; return out('Sure — here\'s **' + t.label + '**. Tap the button and I\'ll take you there.', { intent: 'nav' }, { explicit: true, nav: [{ label: 'Go to ' + t.label, page: t.page, tab: t.tab || null, go: true }] });
    }
    if(spec.intent === 'explain'){
      const l = ctx.lastInsight; return out(l && l.method ? '**How I worked that out:** ' + l.method + '\n\nI only use the data already loaded in Back Office, so the figures match your screens. If a number looks off, check the receipts and the shop filter at the top.' : "I worked that out from the sales, products and expenses loaded in Back Office.", l || {}, { asks: [] });
    }
    // fill in the blanks: shop falls back to the shop being viewed; period to what the question implies
    if(!spec.shop) spec.shop = d.shop || 'All Shops';
    if(!spec.period) spec.period = (ctx.lastInsight && ctx.lastInsight.period && /^(and |what about |how about )/.test(n) ? ctx.lastInsight.period : { key: 'this_month', start: monthStart(new Date(d.now).getFullYear(), new Date(d.now).getMonth()), end: addDays(sod(d.now), 1), label: 'this month so far' });
    const fn = RUN[spec.intent]; if(!fn) return null;
    // "explicit" = clearly about THIS business's numbers (a period, "my/our/we", "how many/much") rather than a help-library topic
    spec.explicit = !!(parsePeriod(n, d.now) || /\b(my|our|we|did|how (many|much)|today|tonight|any|anyone|anything|who|whos|right now|currently|at the moment|doing|business|this (week|month|year))\b/.test(n));
    try{ const r = fn(d, spec); if(r) r.explicit = spec.explicit; return r; }catch(e){ return null; }
  }
  return { answer, parsePeriod: t => parsePeriod(norm(t), data().now), agg: (period, shop) => agg(data(), period, shop), findProducts: t => findProducts(data(), t), nav: navMatch };
}
const api = { create, parsePeriod: (t, now) => parsePeriod(norm(t), now), previousPeriod, NAV, navMatch, norm };
if(typeof module !== 'undefined' && module.exports) module.exports = api; else root.AureumInsights = api;
})(typeof window !== 'undefined' ? window : globalThis);
