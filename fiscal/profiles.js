/* AUREUM fiscalisation — COUNTRY PROFILES (what each tax authority usually asks a business to have ready).

   HONESTY RULE: this file is a checklist of *what to collect*, not a tax-law reference and not an integration.
   Every profile is general knowledge that must be confirmed against the authority's current official documentation
   (profile.confirm is always true). Nothing in here sends anything to any authority, and no sale is ever marked
   "fiscalised" because of it — that only happens when an approved integration and a working device return a fiscal reference.

   A profile never defaults to any country: the shop's own country decides which profile is used. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory();
  else root.AureumFiscalProfiles = factory();
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  /* routes a business can use to report sales to the authority */
  const ROUTES = {
    hardware: { label:'Fiscal device (printer / ETR / EFD / EBM)', help:'A certified physical device or control unit supplied through the authority\'s approved suppliers.' },
    virtual:  { label:'Software / virtual fiscalisation (authority API)', help:'The till reports each sale to the authority\'s online system through an approved connector or API.' },
    portal:   { label:'Authority e-invoicing portal', help:'Invoices are issued or reported through the authority\'s portal, with or without the till.' }
  };
  const REGIMES = {
    device:  'Fiscal device required for most retailers',
    api:     'Online reporting / e-invoicing',
    mixed:   'Fiscal device or online reporting',
    none:    'No fiscal device is known to be required',
    unknown: 'Requirements not yet recorded in AUREUM'
  };

  /* Compact definitions. taxId = the main taxpayer number the authority issues; extra = other numbers it commonly asks for. */
  const P = [
    { code:'ZW', name:'Zimbabwe', authority:'Zimbabwe Revenue Authority', short:'ZIMRA', system:'Fiscal Device Management System (FDMS)', site:'https://www.zimra.co.zw', regime:'mixed', routes:['hardware','virtual'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'The TIN on your ZIMRA registration.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet code', help:'If ZIMRA registered this shop as a separate branch.' }, deviceId:{ label:'ZIMRA fiscal device ID', help:'The device ID ZIMRA gives you when the device is registered.' },
      extra:[{ key:'bpNumber', label:'BP number', help:'Your ZIMRA Business Partner number, if you have one.' }],
      tip:'ZIMRA lists approved fiscal-device suppliers and also allows virtual fiscalisation through its API. Ask your supplier which they provide.' },
    { code:'ZM', name:'Zambia', authority:'Zambia Revenue Authority', short:'ZRA', system:'Smart Invoice', site:'https://www.zra.org.zm', regime:'api', routes:['virtual','portal'],
      taxId:{ label:'TPIN (Taxpayer Identification Number)', help:'The 10-digit TPIN on your ZRA registration.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch ID', help:'The branch ID registered for this shop on Smart Invoice.' }, deviceId:{ label:'Smart Invoice device / SDC ID', help:'The ID given when the invoicing device or software is registered.' }, extra:[],
      tip:'Smart Invoice works through software that talks to ZRA. Ask your software or device supplier for the connector.' },
    { code:'MW', name:'Malawi', authority:'Malawi Revenue Authority', short:'MRA', system:'Electronic Invoicing System (EIS)', site:'https://www.mra.mw', regime:'api', routes:['virtual','portal'],
      taxId:{ label:'TPIN (Taxpayer Identification Number)', help:'The TPIN on your MRA registration.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet ID', help:'If the shop is registered as a separate outlet.' }, deviceId:{ label:'EIS terminal ID', help:'The terminal ID the authority gives you.' }, extra:[],
      tip:'Ask MRA or your approved solution provider which terminal or connector to use.' },
    { code:'TZ', name:'Tanzania', authority:'Tanzania Revenue Authority', short:'TRA', system:'Electronic Fiscal Devices (EFD) / Virtual Fiscal Device (VFD)', site:'https://www.tra.go.tz', regime:'device', routes:['hardware','virtual'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'The 9-digit TIN on your TRA registration.' }, vat:{ label:'VRN (VAT registration number)', help:'Only if you are VAT registered.' },
      branch:{ label:'Tax office / branch', help:'The TRA tax office or branch the device is registered under.' }, deviceId:{ label:'EFD / VFD unique identification number (UIN)', help:'Printed on the device or in your registration letter.' }, extra:[],
      tip:'TRA publishes the list of approved EFD and VFD suppliers.' },
    { code:'KE', name:'Kenya', authority:'Kenya Revenue Authority', short:'KRA', system:'eTIMS (Electronic Tax Invoice Management System)', site:'https://www.kra.go.ke', regime:'api', routes:['virtual','portal','hardware'],
      taxId:{ label:'KRA PIN', help:'Your KRA Personal Identification Number (this is a tax number, not a password).' }, vat:{ label:'VAT registration (if any)', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch ID', help:'The branch ID registered for this shop on eTIMS.' }, deviceId:{ label:'eTIMS device / control unit serial', help:'The control-unit or device identifier from your eTIMS registration.' }, extra:[],
      tip:'eTIMS can be used through software that connects to KRA (OSCU / VSCU) or through the KRA portal. Ask KRA or your solution provider which applies to you.' },
    { code:'UG', name:'Uganda', authority:'Uganda Revenue Authority', short:'URA', system:'EFRIS (Electronic Fiscal Receipting and Invoicing Solution)', site:'https://www.ura.go.ug', regime:'api', routes:['virtual','hardware','portal'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'The TIN on your URA registration.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet', help:'The branch registered on EFRIS for this shop.' }, deviceId:{ label:'EFRIS device number', help:'The device number issued when you registered on EFRIS.' }, extra:[],
      tip:'EFRIS works through software or an approved device that reports to URA. Ask your supplier for the integration.' },
    { code:'RW', name:'Rwanda', authority:'Rwanda Revenue Authority', short:'RRA', system:'Electronic Billing Machine (EBM)', site:'https://www.rra.gov.rw', regime:'device', routes:['hardware','virtual'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'The TIN on your RRA registration.' }, vat:{ label:'VAT registration (if any)', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch ID', help:'The branch ID registered for this shop.' }, deviceId:{ label:'EBM / SDC identifier', help:'The identifier of your EBM or sales data controller.' }, extra:[],
      tip:'RRA works with approved EBM software and hardware providers.' },
    { code:'ET', name:'Ethiopia', authority:'Ethiopian Customs and Revenue Authority (ERCA)', short:'ERCA', system:'Fiscal registration machines / e-invoicing', site:'https://www.erca.gov.et', regime:'mixed', routes:['hardware','virtual'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'The TIN on your ERCA registration.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet', help:'If the shop is registered as a separate branch.' }, deviceId:{ label:'Fiscal machine registration number', help:'The number given when the machine is registered.' }, extra:[],
      tip:'Ask ERCA for its current list of approved machines and e-invoicing providers.' },
    { code:'NG', name:'Nigeria', authority:'Nigeria Revenue Service (formerly FIRS)', short:'NRS', system:'e-Invoicing (Merchant-Buyer Solution)', site:'https://www.firs.gov.ng', regime:'api', routes:['virtual','portal'],
      taxId:{ label:'TIN (Tax Identification Number)', help:'Your TIN from the tax authority.' }, vat:{ label:'VAT registration (if any)', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet', help:'If the shop is registered as a separate branch.' }, deviceId:{ label:'e-Invoicing system / terminal ID', help:'The ID given when your invoicing system is onboarded.' }, extra:[],
      tip:'E-invoicing is done through an accredited solution provider. Ask the authority which providers are accredited.' },
    { code:'GH', name:'Ghana', authority:'Ghana Revenue Authority', short:'GRA', system:'E-VAT', site:'https://gra.gov.gh', regime:'api', routes:['virtual','portal'],
      taxId:{ label:'TIN (Tax Identification Number)', help:'Your TIN from GRA.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch / outlet', help:'If the shop is registered as a separate branch.' }, deviceId:{ label:'E-VAT device / terminal ID', help:'The ID given when your system is registered.' }, extra:[],
      tip:'Ask GRA which E-VAT providers or connectors are approved.' },
    { code:'EG', name:'Egypt', authority:'Egyptian Tax Authority', short:'ETA', system:'e-Receipt / e-Invoice', site:'https://www.eta.gov.eg', regime:'api', routes:['virtual','portal'],
      taxId:{ label:'Tax registration number', help:'Your tax registration number.' }, vat:{ label:'VAT registration (if any)', help:'Only if you are VAT registered.' },
      branch:{ label:'Branch code', help:'The branch code registered for this shop.' }, deviceId:{ label:'POS serial / registration', help:'The POS device registration given by the authority.' }, extra:[],
      tip:'E-receipts are issued through registered POS software. Ask the authority for its approved list.' },
    { code:'ZA', name:'South Africa', authority:'South African Revenue Service', short:'SARS', system:'No fiscal device requirement known', site:'https://www.sars.gov.za', regime:'none', routes:[],
      taxId:{ label:'Income tax reference number', help:'Your SARS tax reference.' }, vat:{ label:'VAT vendor number', help:'Only if you are a registered VAT vendor.' },
      branch:{ label:'Branch', help:'Optional.' }, deviceId:{ label:'Device identifier', help:'Only if an authority-issued one exists.' }, extra:[],
      tip:'As far as AUREUM knows, retail sales do not currently need a fiscal device in South Africa. Confirm with SARS — rules for e-invoicing are changing.' },
    { code:'BW', name:'Botswana', authority:'Botswana Unified Revenue Service', short:'BURS', system:'Not yet recorded', site:'https://www.burs.org.bw', regime:'unknown', routes:['hardware','virtual','portal'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'Your BURS TIN.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' }, branch:{ label:'Branch', help:'Optional.' }, deviceId:{ label:'Authority device ID', help:'If the authority issues one.' }, extra:[], tip:'Ask the authority what applies to your business and which devices or providers it approves.' },
    { code:'NA', name:'Namibia', authority:'Namibia Revenue Agency', short:'NamRA', system:'Not yet recorded', site:'https://www.namra.org.na', regime:'unknown', routes:['hardware','virtual','portal'],
      taxId:{ label:'TIN (Taxpayer Identification Number)', help:'Your NamRA TIN.' }, vat:{ label:'VAT registration number', help:'Only if you are VAT registered.' }, branch:{ label:'Branch', help:'Optional.' }, deviceId:{ label:'Authority device ID', help:'If the authority issues one.' }, extra:[], tip:'Ask the authority what applies to your business and which devices or providers it approves.' },
    { code:'MZ', name:'Mozambique', authority:'Autoridade Tributária de Moçambique', short:'AT', system:'Not yet recorded', site:'https://www.at.gov.mz', regime:'unknown', routes:['hardware','virtual','portal'],
      taxId:{ label:'NUIT (tax identification number)', help:'Your NUIT.' }, vat:{ label:'VAT registration (if any)', help:'Only if you are VAT registered.' }, branch:{ label:'Branch', help:'Optional.' }, deviceId:{ label:'Authority device ID', help:'If the authority issues one.' }, extra:[], tip:'Ask the authority what applies to your business and which devices or providers it approves.' }
  ];
  /* every African country AUREUM offers fiscal setup for (the same list the country picker uses) */
  const AFRICA = 'DZ AO BJ BW BF BI CV CM CF TD KM CG CD CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW'.split(' ');
  const byCode = {}; P.forEach(p => { p.confirm = true; byCode[p.code] = p; });

  /* Any country without its own profile above gets a neutral one: the same questions, no country-specific claims. */
  function nameOf(code){
    try{ const g = (typeof self !== 'undefined' ? self : this).AureumCountries; const c = g && g.byCode && g.byCode[code]; if(c) return c.name; }catch(e){}
    return code;
  }
  function generic(code){
    code = String(code || '').toUpperCase();
    const nm = nameOf(code);
    return { code, name:nm, authority:'The tax authority of ' + nm, short:'the tax authority', system:'Not yet recorded', site:null, regime:'unknown', routes:['hardware','virtual','portal'], confirm:true, generic:true,
      taxId:{ label:'Tax identification number', help:'The main taxpayer number your tax authority issued to the business.' }, vat:{ label:'VAT / sales-tax registration number', help:'Only if you are registered.' },
      branch:{ label:'Branch / outlet ID', help:'If the authority registered this shop separately.' }, deviceId:{ label:'Authority device / registration ID', help:'If the authority issues one for the device.' }, extra:[],
      tip:'AUREUM has not recorded this country\'s rules yet. You can still save your device details now; ask your tax authority which devices or providers it approves.' };
  }
  /* used only where the country tables are not installed yet, so the old country-less form keeps working */
  const neutral = () => Object.assign(generic('ZZ'), { name:'your country', authority:'your tax authority', short:'the tax authority' });
  const get = code => { code = String(code || '').toUpperCase(); return byCode[code] || (/^[A-Z]{2}$/.test(code) ? generic(code) : null); };
  const list = () => P.map(p => ({ code:p.code, name:p.name, authority:p.authority, short:p.short, regime:p.regime }));
  const hasOwnProfile = code => !!byCode[String(code || '').toUpperCase()];

  /* The questions asked for a country. `required` is deliberately small: only what no authority works without. */
  function requirementFields(code){
    const p = get(code); if(!p) return [];
    const f = [
      { key:'taxId', label:p.taxId.label, help:p.taxId.help, required:true, max:40 },
      { key:'taxpayerName', label:'Business name exactly as registered with the authority', help:'It must match the authority\'s records.', required:false, max:120 },
      { key:'vatNumber', label:p.vat.label, help:p.vat.help, required:false, max:40 },
      { key:'branchId', label:p.branch.label, help:p.branch.help, required:false, max:40 }
    ];
    (p.extra || []).forEach(e => f.push({ key:e.key, label:e.label, help:e.help, required:!!e.required, max:40 }));
    return f;
  }
  const ID_RE = /^[\p{L}\p{N} ._\/-]{1,120}$/u;
  /* returns a list of problems ('' = fine); never accepts anything secret-looking */
  function validateRequirements(code, req, opts){
    opts = opts || {}; req = req || {}; const errs = [];
    requirementFields(code).forEach(f => {
      const v = String(req[f.key] == null ? '' : req[f.key]).trim();
      if(!v){ if(f.required && opts.strict) errs.push(f.label + ' is required.'); return; }
      if(f.key === 'taxpayerName'){ if(v.length > 120) errs.push('The business name is too long (120 characters max).'); else if(/[<>\u0000-\u001f]/.test(v)) errs.push('The business name has unusual characters.'); return; }
      if(v.length > f.max) errs.push(f.label + ' is too long.');
      else if(!ID_RE.test(v)) errs.push(f.label + ' has unusual characters.');
    });
    return errs;
  }
  function validatePortal(url){
    const u = String(url || '').trim(); if(!u) return [];
    if(!/^https:\/\/[^\s/$.?#][^\s]*$/i.test(u)) return ['The portal address must start with https://'];
    if(/[?#&][^=&#]*(pass|pwd|token|secret|key)[^=&#]*=/i.test(u)) return ['Do not put passwords or keys in the portal address.'];
    return [];
  }
  const requirementsComplete = (code, req) => validateRequirements(code, req, { strict:true }).length === 0;

  /* A plain checklist of what stands between a shop and running fiscalisation. Each item: { id, label, done, hint }. */
  function readiness(i){
    i = i || {}; const p = i.country ? get(i.country) : null, items = [];
    items.push({ id:'country', label:'Shop country chosen', done:!!p, hint:p ? p.name + ' — ' + p.authority : 'Choose the country this shop trades in.' });
    if(p && p.regime === 'none'){
      items.push({ id:'none', label:'No fiscal device known to be required', done:true, hint:p.tip });
      return { items, ready:false, notRequired:true, summary:'No fiscal device is known to be required for ' + p.name + '. Confirm with ' + p.short + '.' };
    }
    items.push({ id:'device', label:'Fiscal device or provider recorded (model and serial)', done:!!i.deviceRecorded, hint:'Add the device model, serial number and how it connects.' });
    items.push({ id:'requirements', label:'Tax details entered' + (p ? ' (' + p.taxId.label + ')' : ''), done:!!i.requirementsComplete, hint:'The authority\'s taxpayer number is required before any sale can be reported.' });
    items.push({ id:'connection', label:'Device connection tested', done:!!i.connected, hint:'Press Test on the device. It must answer before sales can be reported.' });
    items.push({ id:'integration', label:'AUREUM ' + (p ? p.short : 'country') + ' integration approved', done:i.integrationStatus === 'approved', hint: i.integrationStatus ? 'Status: ' + String(i.integrationStatus).replace('_', ' ') + '. The AUREUM team approves it after testing with the authority.' : 'The AUREUM team approves each country after testing with the authority.' });
    const ready = items.every(x => x.done);
    return { items, ready, notRequired:false, summary: ready ? 'Everything is in place — fiscalisation can be switched on for this shop.' : 'Still to do: ' + items.filter(x => !x.done).map(x => x.label.toLowerCase()).join('; ') + '.' };
  }

  return { ROUTES, REGIMES, AFRICA, list, get, generic, neutral, hasOwnProfile, requirementFields, validateRequirements, validatePortal, requirementsComplete, readiness };
});
