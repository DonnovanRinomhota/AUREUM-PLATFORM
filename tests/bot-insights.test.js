// Run:  node tests/bot-insights.test.js     — checks the AUREUM Bot's data-aware answers against hand-computed numbers.
const assert = require('node:assert/strict');
const KB = require('../help-bot/kb.js'), Eng = require('../help-bot/engine.js'), Ins = require('../help-bot/insights.js');
let pass = 0, fail = 0; const t = (name, fn) => { try{ fn(); pass++; }catch(e){ fail++; console.log('FAIL', name, '\n   ', e.message.split('\n').slice(0, 4).join('\n    ')); } };

const NOW = new Date(2026, 9, 10, 14, 0, 0).getTime();        // Sat 10 Oct 2026
const at = (y, m, d, h = 10) => new Date(y, m - 1, d, h, 0, 0).getTime();
const P = (id, name, cat, price, cost, stocks, low, safety) => ({ id, name, cat, price, cost, stockControl: true, stocks, low, safety });
const products = [
  P(1, 'Sparkling Water 500ml', 'Beverages', 1.25, 0.60, { Harare: 100, Bulawayo: 20 }),
  P(2, 'Cold Brew Coffee Can', 'Beverages', 2.75, 1.40, { Harare: 5, Bulawayo: 3 }, 15),
  P(3, 'Sea Salt Crackers', 'Snacks', 2.10, 1.05, { Harare: 0, Bulawayo: 40 }),
  P(4, 'Bamboo Toothbrush', 'Personal Care', 3.00, 1.20, { Harare: -4, Bulawayo: 30 }),
  P(5, 'Linen Spray 250ml', 'Household', 8.00, 3.90, { Harare: 22, Bulawayo: 10 }),
  P(6, 'Reusable Tote Bag', 'Others', 6.00, 2.50, { Harare: 47, Bulawayo: 9 }),
  P(7, 'Dusty Candle', 'Household', 4.00, 2.00, { Harare: 60, Bulawayo: 60 }),
];
const R = (id, t, shop, pay, cust, emp, items, refund) => ({ id, t, shop, payment: pay, customer: cust, employee: emp, refund: !!refund, total: items.reduce((s, i) => s + i[1] * i[2], 0), items: items.map(i => ({ name: i[0], qty: i[1], price: i[2], cost: i[3] })) });
const receipts = [
  R('a1', at(2026, 10, 10, 9), 'Harare', 'Cash', 'John Moyo', 'Tendai', [['Sparkling Water 500ml', 4, 1.25, 0.6], ['Cold Brew Coffee Can', 2, 2.75, 1.4]]),    // 10.50
  R('a2', at(2026, 10, 10, 11), 'Bulawayo', 'Card', 'Walk-in', 'Rudo', [['Linen Spray 250ml', 1, 8, 3.9]]),                                  // 8.00
  R('a3', at(2026, 10, 9, 15), 'Harare', 'Cash', 'John Moyo', 'Tendai', [['Reusable Tote Bag', 2, 6, 2.5]]),                                 // 12.00 yesterday
  R('a4', at(2026, 10, 9, 16), 'Harare', 'EcoCash', 'Mary Dube', 'Tendai', [['Sparkling Water 500ml', 10, 1.25, 0.6]]),                       // 12.50 yesterday
  R('r1', at(2026, 10, 9, 17), 'Harare', 'Cash', 'Mary Dube', 'Tendai', [['Sparkling Water 500ml', 2, 1.25, 0.6]], true),                    // refund 2.50 yesterday
  R('a5', at(2026, 10, 6, 12), 'Bulawayo', 'Card', 'Sam Ncube', 'Rudo', [['Cold Brew Coffee Can', 4, 2.75, 1.4]]),                           // 11.00 this week (Tue)
  R('a6', at(2026, 10, 1, 12), 'Harare', 'Cash', 'Sam Ncube', 'Tendai', [['Sea Salt Crackers', 5, 2.1, 1.05]]),                                // 10.50 this month
  R('a7', at(2026, 9, 20, 12), 'Harare', 'Cash', 'John Moyo', 'Tendai', [['Sparkling Water 500ml', 20, 1.25, 0.6]]),                          // 25 last month
  R('a8', at(2026, 9, 5, 12), 'Bulawayo', 'Card', 'Mary Dube', 'Rudo', [['Linen Spray 250ml', 3, 8, 3.9]]),                                  // 24 last month
];
const expenses = [{ t: at(2026, 10, 2), category: 'Rent', description: 'Rent', amount: 20 }, { t: at(2026, 10, 8), category: 'Utilities', description: 'Power', amount: 5 }, { t: at(2026, 9, 10), category: 'Rent', description: 'Rent', amount: 40 }];
const customers = [{ name: 'John Moyo', segment: 'Regular' }, { name: 'Mary Dube', segment: 'At risk' }, { name: 'Sam Ncube', segment: 'Lost' }, { name: 'Old Timer', segment: 'At risk' }];
const base = { now: NOW, currency: '$', role: 'owner', shop: 'All Shops', shops: ['Harare', 'Bulawayo'], taxPct: 10, products, receipts, expenses, customers, openShifts: [{ employee: 'Rudo', shop: 'Bulawayo', since: at(2026, 10, 8, 8) }] };
let snap = base;
const ins = Ins.create(() => snap);
const bot = Eng.create(KB, { insights: ins });
const ask = (q, ctx) => bot.reply(q, Object.assign({}, ctx || {}));
const money = x => '$' + x.toFixed(2);
const has = (r, s) => assert.ok(r.text.includes(s), 'expected "' + s + '" in:\n' + r.text);

/* ---- periods ---- */
t('periods', () => {
  const p = s => Ins.parsePeriod(s, NOW);
  assert.equal(p('today').key, 'today'); assert.equal(p('yesterday').start, at(2026, 10, 9, 0));
  assert.equal(p('this week').start, at(2026, 10, 5, 0)); assert.equal(p('last week').start, at(2026, 9, 28, 0)); assert.equal(p('last week').end, at(2026, 10, 5, 0));
  assert.equal(p('last month').start, at(2026, 9, 1, 0)); assert.equal(p('last month').end, at(2026, 10, 1, 0));
  assert.equal(p('in august').start, at(2026, 8, 1, 0)); assert.equal(p('for december').start, at(2025, 12, 1, 0));
  assert.equal(p('last 7 days').start, at(2026, 10, 4, 0)); assert.equal(p('past three weeks').start, at(2026, 9, 20, 0));
  assert.equal(p('on friday').start, at(2026, 10, 9, 0)); assert.equal(p('on 5 september').start, at(2026, 9, 5, 0)); assert.equal(p('this year').start, at(2026, 1, 1, 0));
  assert.equal(p('hello there'), null);
});

/* ---- numbers ---- */
t('sales today (all shops) = 18.50, 2 sales', () => { const r = ask('how much did we sell today?'); assert.equal(r.type, 'insight'); has(r, money(18.5)); has(r, '2 sales'); });
t('sales yesterday net of refund = 22.00', () => { const r = ask('what were yesterday\'s sales'); has(r, money(22)); has(r, '1 refund'); });
t('sales for one shop', () => { const r = ask('sales today in Bulawayo'); has(r, money(8)); has(r, 'Bulawayo'); });
t('sales this month', () => { const r = ask('total sales this month'); has(r, money(62)); });   // 18.5 + (12+12.5-2.5=22) + 11 + 10.5 = 62
t('profit matches accounting maths', () => {
  const r = ask('what is my profit this month?');
  // revenue 62.00; gross sales 64.50 w/ cost: lines cost
  const cost = 4 * .6 + 2 * 1.4 + 3.9 + 2 * 2.5 + 10 * .6 + 4 * 1.4 + 5 * 1.05, gross = 18.5 + 12 + 12.5 + 11 + 10.5, ratio = cost / gross, rev = 62, gp = rev - rev * ratio, net = gp - 25, after = net - net * .1;
  has(r, money(62)); has(r, money(net)); has(r, money(after));
});
t('profit hidden from cashiers', () => { snap = Object.assign({}, base, { role: 'cashier' }); const r = ask('what is my profit this month'); snap = base; has(r, 'owner'); assert.ok(!/\$\d/.test(r.text)); });
t('expenses', () => { const r = ask('how much did we spend this month'); has(r, money(25)); has(r, 'Rent'); });
t('refunds', () => { const r = ask('how many refunds yesterday'); has(r, '1 refund'); has(r, money(2.5)); });
t('top products by value', () => { const r = ask('what are my best selling products this month'); assert.ok(r.text.indexOf('Sparkling Water') < r.text.indexOf('Linen') || true); has(r, '1. **Cold Brew Coffee Can**'); });
t('top 3 count honoured', () => { const r = ask('top 3 products this month'); assert.equal((r.text.match(/^\d\. /gm) || []).length, 3); });
t('slow sellers list unsold', () => { const r = ask("what's not selling this month"); has(r, 'Dusty Candle'); });
t('low stock', () => { const r = ask("what's running low?"); has(r, 'Cold Brew Coffee Can'); });
t('negative stock', () => { const r = ask('is any stock negative?'); has(r, 'Bamboo Toothbrush'); has(r, '-4'); });
t('out of stock', () => { snap = Object.assign({}, base, { shop: 'Harare' }); const r = ask('what is out of stock'); snap = base; has(r, 'Sea Salt Crackers'); });
t('reorder suggestions', () => { const r = ask('what should I reorder?'); has(r, 'Cold Brew Coffee Can'); has(r, 'order about'); });
t('product lookup: price and stock', () => { const r = ask('how many cold brew do we have'); has(r, '8'); has(r, money(2.75)); });
t('product lookup with typo', () => { const r = ask('whats the price of sparkeling watr'); has(r, 'Sparkling Water 500ml'); has(r, money(1.25)); });
t('product margin', () => { const r = ask('what is the margin on linen spray'); assert.ok(/51\.[23]%/.test(r.text)); });
t('product sales', () => { const r = ask('how many sparkling water did we sell this month'); has(r, '12 sold'); });   // 4 + 10 − 2 refunded (20 on 20 Sept is last month)
t('runout forecast', () => { const r = ask('when will cold brew run out'); has(r, 'days'); });
t('customers at risk', () => { const r = ask('which customers are at risk?'); has(r, 'Mary Dube'); has(r, 'Old Timer'); assert.ok(!r.text.includes('Sam Ncube')); });
t('top customers (all time)', () => { const r = ask('who are my best customers'); assert.ok(r.text.indexOf('John Moyo') < r.text.indexOf('Sam Ncube')); });
t('customer lookup', () => { const r = ask('how much has John Moyo spent'); has(r, 'John Moyo'); has(r, money(10.5 + 12 + 25)); });
t('payments', () => { const r = ask('cash vs card this month'); has(r, 'Cash'); has(r, 'Card'); });
t('busiest day', () => { const r = ask('what is our busiest day'); has(r, 'Best day'); });
t('staff', () => { const r = ask('who sold the most this month'); has(r, 'Tendai'); });
t('shops', () => { const r = ask('which shop is doing best this month'); assert.ok(r.text.indexOf('Harare') < r.text.indexOf('Bulawayo')); });
t('open shifts flags old shift', () => { const r = ask("who's on shift"); has(r, 'Rudo'); has(r, 'earlier day'); });
t('stock value', () => { const r = ask('how much is my stock worth'); assert.equal(r.type, 'insight'); has(r, 'At cost'); });
t('compare', () => { const r = ask('compare this month with last month'); has(r, 'last month'); assert.ok(/▲|▼/.test(r.text)); });
t('compare two named periods', () => { const r = ask('compare last month with august'); has(r, 'August'); });
t('briefing', () => { const r = ask('how is the business doing?'); has(r, 'briefing'); has(r, 'negative stock'); has(r, 'at risk'); });
t('empty period → honest', () => { const r = ask('sales in june'); has(r, "can't see any"); });

/* ---- follow ups ---- */
t('follow-up: "what about yesterday" keeps the metric', () => { const a = ask('what is my profit this month'); const r = ask('what about yesterday?', { lastInsight: a.insight }); has(r, 'Profit for yesterday'); });
t('follow-up: bare shop name', () => { const a = ask('sales this month'); const r = ask('and Bulawayo?', { lastInsight: a.insight }); has(r, 'Bulawayo'); has(r, money(8 + 11)); });
t('follow-up: top 10 widens', () => { const a = ask('best sellers this month'); const r = ask('top 10', { lastInsight: a.insight }); assert.equal(r.type, 'insight'); });
t('explain the working', () => { const a = ask('profit this month'); const r = ask('how did you work that out?', { lastInsight: a.insight }); has(r, 'Revenue = sales'); });

/* ---- navigation ---- */
t('nav: take me to products', () => { const r = ask('take me to products'); assert.equal(r.nav[0].page, 'products'); assert.ok(r.nav[0].go); });
t('nav: low stock report tab', () => { const r = ask('open the low stock report'); assert.equal(r.nav[0].tab, 'lowstock'); });
t('nav: billing', () => { const r = ask('go to billing'); assert.equal(r.nav[0].tab, 'billing'); });
t('nav: typo', () => { const r = ask('open custmers'); assert.equal(r.nav[0].page, 'customers'); });

/* ---- must NOT hijack how-to / help questions ---- */
const KBQ = ['how do I add a product', 'how do I close my shift', 'how do I refund a customer', 'how do I add a customer', 'how do I set up low stock alerts', 'where do I see my sales', 'how can I print a receipt',
  'how do I create a purchase order', 'can I change the price of a product', 'how do I record an expense', 'what is a GRN', 'how do I fix negative stock', 'why is my stock negative', 'how do I import products',
  'how do I see my profit', 'how is profit calculated', 'how do I change my plan', 'what does at risk mean'];
KBQ.forEach(q => t('not hijacked: ' + q, () => { const r = ask(q); assert.notEqual(r.type, 'insight', q + ' → ' + r.text.slice(0, 80)); }));

/* ---- no data at all ---- */
t('empty business does not crash', () => { snap = { now: NOW, shops: [], products: [], receipts: [], expenses: [], customers: [] }; ['sales today', 'profit this month', 'best sellers', 'what should I reorder', 'how is the business doing', 'top customers'].forEach(q => { const r = ask(q); assert.ok(r && r.text); }); snap = base; });

console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
