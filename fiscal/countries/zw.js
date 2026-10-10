/* AUREUM fiscalisation — COUNTRY ADAPTER: Zimbabwe (ZIMRA FDMS)
   Everything Zimbabwe-specific lives in this file and nowhere else.

   STATUS: IN DEVELOPMENT — NOT approved, NOT certified, NOT usable for real fiscalisation.
   It maps AUREUM's standard transaction to ZIMRA's "Fiscal Device Gateway API" Receipt structure and
   checks the receipt rules that are written down in the specification. It does NOT sign, does NOT call
   FDMS and does NOT manage fiscal days — those need a server-side gateway holding the device certificate.

   Source: ZIMRA "FISCAL DEVICE GATEWAY API SPECIFICATION", Doc. No. v7.2
   https://www.zimra.co.zw/downloads/9-domestic-taxes?download=3807%3Afiscalisation-api-documentation
   Also: ZIMRA "Fiscalisation Explained", Public Notice 26 of 2024 (virtual fiscalisation / API FDMS).
   Read on 2026-10-10 through an automated text extract that OMITS spec sections 9, 10.x, 11 and 13. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory(require('../fiscal-core.js'));
  else factory(root.AureumFiscal);
})(typeof self !== 'undefined' ? self : this, function(F){
  'use strict';
  const r2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const near = (a, b) => Math.abs(a - b) < 0.005;

  /* AUREUM payment label -> ZIMRA MoneyType (enum values as listed in the spec) */
  const MONEY = { cash:'Cash', card:'Card', mobile:'MobileWallet', 'mobile money':'MobileWallet', 'mobile wallet':'MobileWallet', coupon:'Coupon', voucher:'Coupon', credit:'Credit', 'store credit':'Credit', 'bank transfer':'BankTransfer' };
  const moneyType = label => MONEY[String(label || '').trim().toLowerCase()] || 'Other';

  const adapter = {
    name: 'Zimbabwe', authority: 'Zimbabwe Revenue Authority (ZIMRA)', jurisdiction: 'Zimbabwe',
    integrationVersion: 'FDMS Fiscal Device Gateway API v7.2 (adapter 0.1-draft)',
    defaultStatus: 'in_development',
    supportedDeviceAdapters: ['zw-virtual-fdms'],           // hardware fiscal devices from ZIMRA Approved Suppliers: no manufacturer protocol available yet
    docs: {
      name: 'ZIMRA Fiscal Device Gateway API Specification', version: 'v7.2',
      url: 'https://www.zimra.co.zw/downloads/9-domestic-taxes?download=3807%3Afiscalisation-api-documentation',
      readOn: '2026-10-10',
      /* things taken from the spec text and implemented */
      verified: [
        'Receipt structure & required fields (receiptType, receiptCurrency, receiptCounter, receiptGlobalNo, invoiceNo, receiptDate, receiptLinesTaxInclusive, receiptLines, receiptTaxes, receiptPayments, receiptTotal)',
        'Receipt types FiscalInvoice / CreditNote / DebitNote; credit/debit notes need creditDebitNote + receiptNotes (RCPT015, RCPT034)',
        'MoneyType values Cash, Card, MobileWallet, Coupon, Credit, BankTransfer, Other',
        'At least one line, tax and payment (RCPT016-018); quantity > 0 (RCPT023); line total = price x quantity (RCPT024); taxID must exist in getConfig applicableTaxes (RCPT025)',
        'Tax formula: inclusive = sum x p/(1+p); exclusive = sum x p',
        'Credit notes carry negative values, invoices non-negative (RCPT040)',
        'HS code (max 8 chars) mandatory for VAT payers (RCPT047)',
        'Production https://fdmsapi.zimra.co.zw, test https://fdmsapitest.zimra.co.zw, mutual-TLS device certificate, 30 s timeout'
      ],
      /* things NOT confirmed — must be read from the official PDF before this adapter can leave "in development" */
      unverified: [
        'Section 13: exact field order hashed for receiptDeviceSignature / fiscalDayDeviceSignature (extract omitted it)',
        'Section 11: QR-code format and verification-code derivation (extract omitted it)',
        'Tax rounding rules (RCPT026/027) — half-up to 2 dp is an ASSUMPTION',
        'How Discount lines are represented (line-type and sign rules) — discounted sales are refused for now',
        'Sign rules for credit-note line prices (RCPT022) — assumed negative price and total',
        'Fiscal counter composition for closeDay, offline file format, receipt print layout (section 10)',
        'Mapping of AUREUM products to ZIMRA tax IDs (currently matched by percentage against getConfig)',
        'ZIMRA approval / certification procedure for software providers (not stated in the notice)'
      ],
      notImplemented: ['Transport (mutual TLS to FDMS)', 'Device registration & certificate handling', 'Signing', 'openDay / closeDay / getStatus', 'Fiscal counters', 'Offline mode (submitFile)']
    },

    /* std = AUREUM standard transaction.  ctx.config comes from the server gateway:
         { deviceID, vatNumber?, applicableTaxes:[{taxID,taxPercent?,taxName,taxValidFrom,taxValidTill?}],
           next:{ receiptCounter, receiptGlobalNo, invoiceNo } }                                              */
    buildRequest(std, ctx){
      const cfg = (ctx && ctx.config) || {};
      if(!cfg.applicableTaxes || !cfg.next || cfg.deviceID == null)
        return { ok:false, notReady:true, errors:['ZIMRA fiscal-day state and tax configuration come from the server gateway, which is not available yet.'] };
      if(std.discount > 0)
        return { ok:false, notReady:true, errors:['Sales with a discount cannot be fiscalised yet (ZIMRA discount-line rules are not verified).'] };
      if(!std.currency) return { ok:false, errors:['Receipt currency is missing.'] };
      const credit = std.kind === 'credit_note';
      const sign = credit ? -1 : 1;
      const date = std.issuedAt ? new Date(std.issuedAt) : null;
      const taxFor = rate => {
        const ok = (cfg.applicableTaxes || []).filter(t => {
          if(rate == null) return t.taxPercent == null;                                    // exempt: taxPercent omitted
          return t.taxPercent != null && Number(t.taxPercent) === Number(rate);
        }).filter(t => !date || ((!t.taxValidFrom || new Date(t.taxValidFrom) <= date) && (!t.taxValidTill || new Date(t.taxValidTill) >= date)));
        return ok[0] || null;
      };
      const errors = [], lines = [], byTax = {};
      std.lines.forEach(l => {
        const tax = taxFor(l.taxable ? l.taxRate : null);
        if(!tax){ errors.push('No ZIMRA tax ID is configured for ' + (l.taxable ? (l.taxRate == null ? 'taxable' : l.taxRate + '%') : 'exempt') + ' items ("' + l.name + '").'); return; }
        const total = r2(sign * l.total), price = r2(sign * l.unitPrice);
        lines.push({ receiptLineType:'Sale', receiptLineNo:l.no, ...(l.hsCode ? { receiptLineHSCode:String(l.hsCode) } : {}), receiptLineName:String(l.name).slice(0, 200),
                     receiptLinePrice:price, receiptLineQuantity:l.qty, receiptLineTotal:total, taxID:tax.taxID, ...(tax.taxPercent != null ? { taxPercent:Number(tax.taxPercent) } : {}) });
        const k = tax.taxID; (byTax[k] = byTax[k] || { tax, sum:0 }).sum = r2(byTax[k].sum + total);
      });
      if(errors.length) return { ok:false, errors };
      const receiptTaxes = Object.keys(byTax).map(k => {
        const { tax, sum } = byTax[k], p = tax.taxPercent == null ? 0 : Number(tax.taxPercent) / 100;
        const taxAmount = std.taxInclusive ? r2(sum * p / (1 + p)) : r2(sum * p);          // formula from the spec; rounding = assumption (see docs.unverified)
        return { taxID:tax.taxID, ...(tax.taxPercent != null ? { taxPercent:Number(tax.taxPercent) } : {}), taxAmount, salesAmountWithTax: std.taxInclusive ? sum : r2(sum + taxAmount) };
      });
      const total = r2(receiptTaxes.reduce((s, t) => s + t.salesAmountWithTax, 0));
      const request = {
        deviceID: cfg.deviceID,
        receipt: {
          receiptType: credit ? 'CreditNote' : 'FiscalInvoice', receiptCurrency: String(std.currency).toUpperCase(),
          receiptCounter: cfg.next.receiptCounter, receiptGlobalNo: cfg.next.receiptGlobalNo, invoiceNo: String(cfg.next.invoiceNo || std.number || std.id).slice(0, 50),
          ...(std.buyer ? { buyerData: { buyerRegisterName: std.buyer.name } } : {}),
          ...(credit ? { receiptNotes: std.notes || '', creditDebitNote: std.original ? { receiptID: std.original.receiptID, deviceID: std.original.deviceID, receiptGlobalNo: std.original.receiptGlobalNo, fiscalDayNo: std.original.fiscalDayNo } : undefined } : {}),
          receiptDate: std.issuedAt, receiptLinesTaxInclusive: !!std.taxInclusive, receiptLines: lines, receiptTaxes,
          receiptPayments: std.payments.map(p => ({ moneyTypeCode: moneyType(p.method), paymentAmount: r2(sign * p.amount) })),
          receiptTotal: total, receiptPrintForm: 'Receipt48'
          /* receiptDeviceSignature is added by the signing step on the server — not here */
        },
        _unsigned: true
      };
      return { ok:true, request };
    },

    /* Rules written in the spec. Returns a list of problems (empty = passes). */
    validate(request, ctx){
      const e = [], cfg = (ctx && ctx.config) || {}, r = request && request.receipt;
      if(!r) return ['No receipt to validate.'];
      const credit = r.receiptType === 'CreditNote', debit = r.receiptType === 'DebitNote';
      if(!['FiscalInvoice','CreditNote','DebitNote'].includes(r.receiptType)) e.push('Unknown receipt type.');
      if(!r.receiptCurrency || String(r.receiptCurrency).length !== 3) e.push('receiptCurrency must be a 3-letter code.');
      if(!r.invoiceNo || String(r.invoiceNo).length > 50) e.push('invoiceNo is required (max 50 characters).');
      if(!(r.receiptLines || []).length) e.push('RCPT016: at least one receipt line is required.');
      if(!(r.receiptTaxes || []).length) e.push('RCPT017: at least one tax entry is required.');
      if(!(r.receiptPayments || []).length) e.push('RCPT018: at least one payment is required.');
      if(credit || debit){
        if(!r.receiptNotes || !String(r.receiptNotes).trim()) e.push('RCPT034: a credit/debit note needs receiptNotes (the reason).');
        if(!r.creditDebitNote || (!r.creditDebitNote.receiptID && !(r.creditDebitNote.deviceID != null && r.creditDebitNote.receiptGlobalNo != null && r.creditDebitNote.fiscalDayNo != null)))
          e.push('RCPT015: a credit/debit note must reference the original fiscal receipt (its fiscal receipt ID, or device + global number + fiscal day).');
      }
      const allowedTax = (cfg.applicableTaxes || []).map(t => t.taxID);
      const codes = (r.receiptLines || []).map(l => l.taxCode ? 1 : 0);
      if(codes.length && codes.some(c => c !== codes[0])) e.push('taxCode must be provided on all lines or none.');
      let lineSum = 0;
      (r.receiptLines || []).forEach(l => {
        if(!(Number(l.receiptLineQuantity) > 0)) e.push('RCPT023: quantity must be greater than 0 ("' + l.receiptLineName + '").');
        if(l.receiptLinePrice != null && !near(Number(l.receiptLinePrice) * Number(l.receiptLineQuantity), Number(l.receiptLineTotal))) e.push('RCPT024: line total must equal price x quantity ("' + l.receiptLineName + '").');
        if(allowedTax.length && allowedTax.indexOf(l.taxID) < 0) e.push('RCPT025: tax ID ' + l.taxID + ' is not an applicable tax.');
        if(cfg.vatNumber && !l.receiptLineHSCode) e.push('RCPT047: an HS code is required for every line when the taxpayer is VAT registered ("' + l.receiptLineName + '").');
        if(l.receiptLineHSCode && String(l.receiptLineHSCode).length > 8) e.push('HS code is longer than 8 characters ("' + l.receiptLineName + '").');
        lineSum += Number(l.receiptLineTotal);
      });
      const total = Number(r.receiptTotal);
      const taxSales = (r.receiptTaxes || []).reduce((s, t) => s + Number(t.salesAmountWithTax), 0);
      if(!near(taxSales, total)) e.push('RCPT019/037: the tax sales amounts do not add up to the receipt total.');
      if(r.receiptLinesTaxInclusive && !near(lineSum, total)) e.push('RCPT019: the lines do not add up to the receipt total.');
      const paid = (r.receiptPayments || []).reduce((s, p) => s + Number(p.paymentAmount), 0);
      if(!near(paid, total)) e.push('RCPT039: payments (' + r2(paid).toFixed(2) + ') do not equal the receipt total (' + total.toFixed(2) + ').');
      if(credit && total > 0) e.push('RCPT040: a credit note total cannot be positive.');
      if(!credit && total < 0) e.push('RCPT040: an invoice / debit note total cannot be negative.');
      if(!credit && (r.receiptPayments || []).some(p => Number(p.paymentAmount) < 0)) e.push('RCPT028: payment amounts cannot be negative on an invoice.');
      return e;
    }
  };
  if(F && F.registerCountry) F.registerCountry('ZW', adapter);
  return adapter;
});
