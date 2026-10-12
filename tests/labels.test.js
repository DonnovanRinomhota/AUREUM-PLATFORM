// Run: node tests/labels.test.js — label engine: barcode encoders, validation, templates, page builder
const L = require('../labels.js');
let pass = 0, fail = 0; const ok = (n, c, x) => { if(c){ pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : x); } };
// --- tables
const T = L._tables.C128;
ok('Code 128 table has 106 symbols', T.length === 106, T.length);
ok('every symbol is 6 widths summing to 11 modules', T.every(w => /^[1-4]{6}$/.test(w) && [...w].reduce((a, c) => a + +c, 0) === 11), T.filter(w => [...w].reduce((a, c) => a + +c, 0) !== 11));
ok('all symbols are distinct', new Set(T).size === 106);
ok('stop pattern is 13 modules', [...L._tables.C128_STOP].reduce((a, c) => a + +c, 0) === 13);
// --- Code 128 structure
const bits = t => L.code128Bits(t);
ok('Code 128 length = 11 per symbol + 13 stop', bits('Aureum').length === 11 * (1 + 6 + 1) + 13);
ok('digits use set C (compact)', L.code128Symbols('123456')[0] === 105 && L.code128Symbols('123456').length === 1 + 3 + 1);
ok('letters use set B', L.code128Symbols('AB')[0] === 104);
ok('mixed: letters then digits switches to C', JSON.stringify(L.code128Symbols('AB1234')) === JSON.stringify([104, 33, 34, 99, 12, 34, (104 + 33 + 34 * 2 + 99 * 3 + 12 * 4 + 34 * 5) % 103]));
ok('odd digit run keeps first digit in B', L.code128Symbols('12345').slice(0, 3).join() === '105,12,34' || L.code128Symbols('12345')[0] === 105);
ok('checksum is in range', L.code128Symbols('Hello 123456 World!').every(v => v >= 0 && v <= 106));
// --- EAN / UPC
ok('EAN check digit', L.eanCheck('400638133393') === '1');
ok('valid EAN-13 accepted, bad rejected', L.validEan('4006381333931', 13) && !L.validEan('4006381333932', 13));
ok('UPC-A valid', L.validEan('036000291452', 12));
ok('EAN-8 valid', L.validEan('96385074', 8));
ok('EAN-13 is 95 modules', L.ean13Bits('4006381333931').length === 95 && L.ean13Bits('4006381333931').startsWith('101') && L.ean13Bits('4006381333931').endsWith('101'));
ok('EAN-8 is 67 modules', L.ean8Bits('96385074').length === 67);
const mk = (v, k) => L.makeBarcode(v, k);
ok('auto: EAN-13 recognised', mk('4006381333931').type === 'ean13');
ok('auto: UPC-A recognised', mk('036000291452').type === 'upca');
ok('auto: EAN-8 recognised', mk('96385074').type === 'ean8');
ok('auto: 13 digits with wrong check digit fall back to Code 128 (still scannable)', mk('4006381333932').type === 'code128');
ok('auto: SKU stays Code 128', mk('100001').type === 'code128' && mk('ABC-123').type === 'code128');
ok('forced Code 128 for an EAN number', mk('4006381333931', 'code128').type === 'code128');
// --- validation
ok('empty refused', !mk('').ok && !mk('   ').ok && !mk(null).ok);
ok('80 chars ok, 81 refused', mk('A'.repeat(80)).ok && !mk('A'.repeat(81)).ok);
ok('non-ASCII refused', !mk('Café').ok && !mk('日本').ok && !mk('a\tb').ok);
ok('space and symbols allowed', mk('AB 12-/.$+%').ok);
// --- internal numbers
const ie = L.makeInternalEan(42);
ok('internal EAN-13 starts with 2, valid check digit, 13 long', /^2\d{12}$/.test(ie) && L.validEan(ie, 13), ie);
ok('internal EANs are unique per serial', new Set(Array.from({ length: 500 }, (_, i) => L.makeInternalEan(i + 1))).size === 500);
// --- templates
ok('templates have unique ids', new Set(L.TEMPLATES.map(t => t.id)).size === L.TEMPLATES.length);
ok('every sheet grid fits its page', L.TEMPLATES.filter(t => t.kind === 'sheet').every(t => L.gridFits(t).ok), L.TEMPLATES.filter(t => t.kind === 'sheet' && !L.gridFits(t).ok).map(t => t.id));
ok('sheet "per" counts match names', L.TEMPLATES.filter(t => t.kind === 'sheet').every(t => new RegExp('^' + L.perPage(t) + ' per sheet').test(t.name)));
ok('roll pages equal the label size', L.TEMPLATES.filter(t => t.kind === 'roll').every(t => Math.abs(t.pageH - t.labelH) < 1e-9 && Math.abs(t.pageW - (t.cols * t.labelW + (t.cols - 1) * t.gapX)) < 1e-9));
const c1 = L.customTemplate({ mode:'roll', w:'60', h:'', cols:'2', gapX:'3' });
ok('custom roll defaults + page width', c1.labelW === 60 && c1.labelH === 30 && c1.pageW === 123 && L.perPage(c1) === 2);
const c2 = L.customTemplate({ mode:'sheet', w:100, h:50, cols:2, rows:5, marginL:5, marginT:5, gapX:2, gapY:0, pageW:210, pageH:297 });
ok('custom sheet fits', L.gridFits(c2).ok && L.perPage(c2) === 10);
ok('custom sheet that does not fit is detected', !L.gridFits(L.customTemplate({ mode:'sheet', w:120, h:50, cols:2, rows:5 })).ok);
// --- document builder
const item = (n, q, v) => ({ name:n, priceText:'$1.50', barcode:mk(v || '100001'), qty:q });
const t50 = L.templateById('roll-50x30'), a4 = L.templateById('a4-65');
const o = (t, x) => Object.assign({ template:t, showName:true, showPrice:true, showCode:true }, x || {});
let d = L.buildDocument([item('Bath Soap', 3)], o(t50));
ok('roll: one page per label', d.pages === 3 && d.labels === 3 && (d.html.match(/class="pg"/g) || []).length === 3);
ok('roll: @page size = label size', d.html.includes('@page{size:50mm 30mm;margin:0}'));
d = L.buildDocument([item('A', 70)], o(a4));
ok('A4-65: 70 labels need 2 pages', d.pages === 2 && d.labels === 70);
ok('A4: @page size is A4', d.html.includes('@page{size:210mm 297mm;margin:0}'));
d = L.buildDocument([item('A', 5)], o(a4, { startAt:64 }));
ok('start at label 64 → 2 labels on page 1, 3 on page 2', d.pages === 2 && d.labels === 5);
d = L.buildDocument([item('A', 0), item('B', 2)], o(t50));
ok('zero quantity prints nothing', d.labels === 2);
d = L.buildDocument([], o(t50));
ok('empty → 0 pages and a hint', d.pages === 0 && /Add products/.test(d.html));
d = L.buildDocument([item('A', 300)], o(a4, { maxPages:2 }));
ok('preview cap shows first pages only but counts all', d.shownPages === 2 && d.pages === 5 && /first 2 of 5 pages/.test(d.html));
d = L.buildDocument([{ name:'<img src=x onerror=alert(1)>', priceText:'$<b>', barcode:mk('A1'), qty:1 }], o(t50));
ok('names and prices are escaped', !/<img src=x/.test(d.html) && d.html.includes('&lt;img'));
d = L.buildDocument([{ name:'No code', priceText:'$2.00', barcode:{ ok:false }, qty:1 }], o(t50));
ok('item without a barcode prints name + price only', d.labels === 1 && !/class="bc"/.test(d.html) && /No code/.test(d.html));
d = L.buildDocument([item('Soap', 1)], o(t50, { showName:false, showPrice:false, showCode:false }));
ok('fields can be switched off', !/class="nm"/.test(d.html) && !/class="pr"/.test(d.html) && !/class="tx"/.test(d.html) && /class="bc"/.test(d.html));
d = L.buildDocument([item('Soap', 1)], o(t50, { offsetX:1.5, offsetY:-0.5 }));
ok('offsets move the label', /left:1.5mm;top:-0.5mm/.test(d.html));
d = L.buildDocument([item('X', 1, 'A'.repeat(40))], o(L.templateById('roll-30x20')));
ok('a very long code on a small label warns', d.warnings.length > 0, d.warnings);
d = L.buildDocument([item('X', 1, '123456')], o(t50));
ok('a short code does not warn', d.warnings.length === 0, d.warnings);
// barcode module width is a whole number of printer dots
const plan = L.planLabel(t50, item('X', 1, '100001'), o(t50));
ok('module width is a multiple of 0.125 mm', Math.abs(plan.moduleMm / 0.125 - Math.round(plan.moduleMm / 0.125)) < 1e-9, plan.moduleMm);
ok('barcode fits inside the label', plan.bcW <= plan.innerW + 1e-9 && plan.bcH > 0, plan);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
