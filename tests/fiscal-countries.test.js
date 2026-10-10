// Run: node tests/fiscal-countries.test.js   (multi-country architecture + Zimbabwe adapter)
const F = require('../fiscal/fiscal-core.js');
const ZW = require('../fiscal/countries/zw.js');
require('../fiscal/devices/zw-virtual-fdms.js');
let pass = 0, fail = 0;
const ok = (n, c, x) => { if(c){ pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : JSON.stringify(x)); } };
const memStore = () => { const m = new Map(); return { m, get: async k => m.get(k) ? JSON.parse(JSON.stringify(m.get(k))) : null, save: async tx => { m.set(tx.idempotency_key, JSON.parse(JSON.stringify(tx))); return JSON.parse(JSON.stringify(tx)); } }; };
// TEST-ONLY numbers; they are NOT ZIMRA's real tax setup
const CFG = { deviceID: 1001, applicableTaxes: [ { taxID:1, taxPercent:0, taxName:'Zero rated', taxValidFrom:'2020-01-01' }, { taxID:2, taxName:'Exempt', taxValidFrom:'2020-01-01' }, { taxID:3, taxPercent:15, taxName:'Test 15', taxValidFrom:'2020-01-01' } ],
              next: { receiptCounter:1, receiptGlobalNo:1, invoiceNo:'INV-1' } };
const sale = (o) => Object.assign({ uid:'u1', orderNo:'No. 1', shop:'Harare', dateTime:'2026-10-10T10:00:00Z', currency:'USD', total:11.5, subtotal:11.5, tax:1.5, taxInclusive:true, payment:'Cash', customer:'N/A', discountAmount:0, items:[{ name:'Tea', qty:1, price:11.5, taxable:true }] }, o || {});
const std = (s, kind, opts) => F.toStandardTransaction(s || sale(), kind || 'sale', Object.assign({ taxPercent:15 }, opts || {}));

(async () => {
  // ---------- registry & pairing
  ok('country code must be ISO alpha-2', (() => { try{ F.registerCountry('ZIM', { buildRequest(){}, validate(){} }); return false; }catch(e){ return true; } })());
  ok('country adapter needs buildRequest + validate', (() => { try{ F.registerCountry('QQ', {}); return false; }catch(e){ return true; } })());
  ok('ZW registered with its authority', F.getCountry('zw').authority.includes('ZIMRA') && F.listCountries().some(c => c.code === 'ZW'));
  ok('unknown country -> null', F.getCountry('XX') === null);
  ok('ZW device allowed for ZW', F.deviceAllowedForCountry('zw-virtual-fdms', 'ZW'));
  ok('a device approved in one country is NOT allowed in another', !F.deviceAllowedForCountry('zw-virtual-fdms', 'KE'));
  F.registerCountry('TC', { name:'Testland', authority:'Test Authority', supportedDeviceAdapters:['zw-virtual-fdms'], buildRequest: s => ({ ok:true, request:{ n:s.id } }), validate: () => [] });
  ok('both sides must agree (country lists device, device does not list country)', !F.deviceAllowedForCountry('zw-virtual-fdms', 'TC'));
  ok('placeholder adapter harmless anywhere', F.deviceAllowedForCountry('unsupported', 'TC'));
  ok('only approved is selectable', F.isSelectable('approved') && !['disabled','in_development','testing'].some(F.isSelectable));
  ok('ZW default status is in_development (not approved)', ZW.defaultStatus === 'in_development');
  ok('ZW lists what is unverified / not implemented', ZW.docs.unverified.length >= 5 && ZW.docs.notImplemented.length >= 4 && /v7\.2/.test(ZW.docs.version));

  // ---------- standard transaction
  { const t = std(); ok('standard tx shape', t.schema === 'aureum.fiscal.tx/1' && t.lines.length === 1 && t.lines[0].taxRate === 15 && t.payments[0].amount === 11.5 && t.buyer === null); }
  { const t = std(sale({ items:[{ name:'Bread', qty:2, price:1, taxable:false }] })); ok('non-taxable line has no rate', t.lines[0].taxRate === null && t.lines[0].total === 2); }

  // ---------- Zimbabwe mapping (formulas from the spec; test numbers)
  { const r = ZW.buildRequest(std(), { config: CFG }); ok('ZW builds a FiscalInvoice', r.ok && r.request.receipt.receiptType === 'FiscalInvoice', r);
    const rc = r.request.receipt;
    ok('inclusive tax = sum x p/(1+p)', rc.receiptTaxes[0].taxAmount === 1.5 && rc.receiptTaxes[0].salesAmountWithTax === 11.5 && rc.receiptTotal === 11.5, rc.receiptTaxes);
    ok('payment mapped to MoneyType', rc.receiptPayments[0].moneyTypeCode === 'Cash' && rc.receiptPayments[0].paymentAmount === 11.5);
    ok('request is unsigned (signing is server-side)', r.request._unsigned === true && !('receiptDeviceSignature' in rc));
    ok('validate passes for good receipt', ZW.validate(r.request, { config: CFG }).length === 0, ZW.validate(r.request, { config: CFG })); }
  { const r = ZW.buildRequest(std(sale({ taxInclusive:false, total:11.5, items:[{ name:'Tea', qty:1, price:10, taxable:true }] })), { config: CFG });
    ok('exclusive tax = sum x p', r.ok && r.request.receipt.receiptTaxes[0].taxAmount === 1.5 && r.request.receipt.receiptTotal === 11.5, r.request && r.request.receipt.receiptTaxes); }
  { const r = ZW.buildRequest(std(sale({ items:[{ name:'Tea', qty:1, price:11.5, taxable:true }, { name:'Bread', qty:2, price:1, taxable:false }], total:13.5 })), { config: CFG });
    ok('exempt lines use the exempt tax ID; two tax groups', r.ok && r.request.receipt.receiptTaxes.length === 2 && r.request.receipt.receiptLines[1].taxID === 2 && !('taxPercent' in r.request.receipt.receiptLines[1]), r); }
  { const r = ZW.buildRequest(std(), { config: { deviceID:1, applicableTaxes:[{ taxID:2, taxName:'Exempt', taxValidFrom:'2020-01-01' }], next:CFG.next } });
    ok('no matching tax ID -> not submitted, clear message', r.ok === false && /No ZIMRA tax ID/.test(r.errors[0]), r); }
  { const r = ZW.buildRequest(std(), { config: { deviceID:1, applicableTaxes:[{ taxID:3, taxPercent:15, taxName:'x', taxValidFrom:'2030-01-01' }], next:CFG.next } });
    ok('tax not yet valid on the receipt date is refused', r.ok === false); }
  ok('no gateway config -> notReady (not an error)', ZW.buildRequest(std(), { config:{} }).notReady === true);
  ok('discounted sales refused (rules unverified)', ZW.buildRequest(std(sale({ discountAmount:1 })), { config: CFG }).notReady === true);
  ok('currency required', ZW.buildRequest(std(sale({ currency:null }), 'sale', { currency:null }), { config: CFG }).ok === false);

  // ---------- Zimbabwe validation rules
  const good = () => JSON.parse(JSON.stringify(ZW.buildRequest(std(), { config: CFG }).request));
  const bad = (mut, re, cfg) => { const q = good(); mut(q.receipt); const errs = ZW.validate(q, { config: cfg || CFG }); return errs.some(x => re.test(x)); };
  ok('RCPT016 no lines', bad(r => { r.receiptLines = []; }, /RCPT016/));
  ok('RCPT017 no taxes', bad(r => { r.receiptTaxes = []; }, /RCPT017/));
  ok('RCPT018 no payments', bad(r => { r.receiptPayments = []; }, /RCPT018/));
  ok('RCPT023 quantity > 0', bad(r => { r.receiptLines[0].receiptLineQuantity = 0; }, /RCPT023/));
  ok('RCPT024 price x qty', bad(r => { r.receiptLines[0].receiptLineTotal = 99; }, /RCPT024/));
  ok('RCPT025 unknown tax ID', bad(r => { r.receiptLines[0].taxID = 99; }, /RCPT025/));
  ok('RCPT039 payments must equal total', bad(r => { r.receiptPayments[0].paymentAmount = 5; }, /RCPT039/));
  ok('RCPT040 invoice cannot be negative', bad(r => { r.receiptTotal = -1; }, /RCPT040/));
  ok('RCPT047 HS code needed for VAT payers', bad(r => {}, /RCPT047/, Object.assign({}, CFG, { vatNumber:'123456789' })));
  ok('HS code max 8', bad(r => { r.receiptLines[0].receiptLineHSCode = '123456789'; }, /8 characters/));
  ok('invoiceNo max 50', bad(r => { r.invoiceNo = 'x'.repeat(51); }, /invoiceNo/));
  ok('taxCode all-or-none', bad(r => { r.receiptLines.push(Object.assign({}, r.receiptLines[0], { receiptLineNo:2, receiptLineTotal:11.5, taxCode:'A' })); }, /taxCode/));

  // ---------- credit notes
  { const orig = { receiptID:555 };
    const r = ZW.buildRequest(std(sale({ note:'Customer returned item' }), 'credit_note', { original: orig }), { config: CFG });
    ok('credit note: negative values + reference + notes', r.ok && r.request.receipt.receiptType === 'CreditNote' && r.request.receipt.receiptTotal === -11.5 && r.request.receipt.receiptPayments[0].paymentAmount === -11.5 && r.request.receipt.creditDebitNote.receiptID === 555, r);
    ok('credit note validates', ZW.validate(r.request, { config: CFG }).length === 0, ZW.validate(r.request, { config: CFG }));
    const r2 = ZW.buildRequest(std(sale({ note:'x' }), 'credit_note'), { config: CFG });
    ok('RCPT015 credit note without original reference is refused', ZW.validate(r2.request, { config: CFG }).some(e => /RCPT015/.test(e)));
    const r3 = ZW.buildRequest(std(sale(), 'credit_note', { original: orig }), { config: CFG });
    ok('RCPT034 credit note without reason is refused', ZW.validate(r3.request, { config: CFG }).some(e => /RCPT034/.test(e)));
    const q = JSON.parse(JSON.stringify(r.request)); q.receipt.receiptTotal = 11.5;
    ok('RCPT040 positive credit note refused', ZW.validate(q, { config: CFG }).some(e => /RCPT040/.test(e))); }
  ok('MoneyType mapping', ['Cash:Cash','Card:Card','Mobile:MobileWallet','Voucher:Coupon','Bank transfer:BankTransfer','Whatever:Other'].every(p => { const [a, b] = p.split(':'); return ZW.buildRequest(std(sale({ payment:a })), { config: CFG }).request.receipt.receiptPayments[0].moneyTypeCode === b; }));

  // ---------- engine + country adapter
  const dev = (o) => Object.assign({ id:'d1', adapter:'mock-dev', active:true, registration_status:'test' }, o || {});
  let subs = 0, lastArg = null;
  F.registerDeviceAdapter('mock-dev', { countries:['TC'], testConnection: async()=>({ok:true}), getDeviceStatus: async()=>({ok:true}), disconnect: async()=>({ok:true}), submitFiscalTransaction: async (d, tx, req) => { subs++; lastArg = req; return { ok:true, fiscalRef:'T-1' }; } });
  F.getCountry('TC').supportedDeviceAdapters.push('mock-dev');
  const eng = (o) => F.createEngine(Object.assign({ store: memStore() }, o));
  { subs = 0; const tx = await eng({ country:F.getCountry('TC'), integrationStatus:'approved' }).fiscalise(sale(), dev());
    ok('approved integration + allowed device -> fiscalised; device received the country request', tx.state === 'fiscalised' && subs === 1 && lastArg && lastArg.n === 'u1', [tx.state, lastArg]);
    ok('country request stored in snapshot for audit', tx.request_snapshot.country === 'TC' && tx.request_snapshot.countryRequest.n === 'u1'); }
  for(const st of ['disabled','in_development','testing']){ subs = 0;
    const tx = await eng({ country:F.getCountry('TC'), integrationStatus:st }).fiscalise(sale({ uid:'s' + st }), dev());
    ok('integration "' + st + '" -> NOT fiscalised and device never called', tx.state === 'not_configured' && subs === 0 && /not approved/.test(tx.error_message), tx.error_message); }
  { subs = 0; const tx = await eng({ country:F.getCountry('TC'), integrationStatus:'approved' }).fiscalise(sale({ uid:'w' }), dev({ adapter:'zw-virtual-fdms' }));
    ok('device approved for another country is refused', tx.state === 'not_configured' && /not approved for/.test(tx.error_message) && subs === 0, tx.error_message); }
  { F.registerCountry('VV', { name:'Validland', supportedDeviceAdapters:['mock-dev'], buildRequest: () => ({ ok:true, request:{} }), validate: () => ['Rule 7 broken.'] });
    F.getCountry('VV'); const d2 = dev(); F.registerDeviceAdapter('mock-dev', Object.assign({}, { countries:['TC','VV'], testConnection: async()=>({ok:true}), getDeviceStatus: async()=>({ok:true}), disconnect: async()=>({ok:true}), submitFiscalTransaction: async()=>{ subs++; return { ok:true, fiscalRef:'X' }; } }));
    subs = 0; const tx = await eng({ country:F.getCountry('VV'), integrationStatus:'approved' }).fiscalise(sale({ uid:'v' }), d2);
    ok('country validation failure -> failed, nothing sent to the device', tx.state === 'failed' && subs === 0 && /Rule 7/.test(tx.error_message), tx.error_message);
    const tx2 = await eng({ country:F.getCountry('VV'), integrationStatus:'approved' }).fiscalise(sale({ uid:'v' }), d2); ok('validation failure is retry-able (failed, not final)', tx2.state === 'failed'); }
  { subs = 0; const tx = await eng({ country:F.getCountry('ZW'), integrationStatus:'approved', countryConfig:{} }).fiscalise(sale({ uid:'z1' }), dev({ adapter:'zw-virtual-fdms' }));
    ok('ZW without gateway config -> not_configured (honest), not an error', tx.state === 'not_configured' && /gateway/.test(tx.error_message), tx.error_message); }
  { const tx = await eng({ country:F.getCountry('ZW'), integrationStatus:'approved', countryConfig:CFG, standardOptions:{ taxPercent:15, currency:'USD' } }).fiscalise(sale({ uid:'z2' }), dev({ adapter:'zw-virtual-fdms' }));
    ok('ZW with full test config: request built, but the virtual device adapter cannot fiscalise -> NOT fiscalised', tx.state === 'not_configured' && !tx.fiscal_ref && tx.request_snapshot.countryRequest.receipt.receiptType === 'FiscalInvoice', [tx.state, tx.error_message]); }
  { const tx = await eng({ country:F.getCountry('ZW'), integrationStatus:'approved', countryConfig:CFG, standardOptions:{ taxPercent:15, currency:'USD' } }).fiscalise(sale({ uid:'z3' }), dev({ adapter:'unsupported' }));
    ok('"no device" placeholder + ZW still never fiscalises', tx.state === 'not_configured' && !tx.fiscal_ref); }
  { subs = 0; const tx = await F.createEngine({ store: memStore() }).fiscalise(sale({ uid:'old' }), dev());
    ok('no country adapter = v1 behaviour unchanged', tx.state === 'fiscalised' && subs === 1); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
