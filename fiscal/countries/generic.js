/* AUREUM fiscalisation — GENERIC COUNTRY ADAPTER (any country without a dedicated adapter).

   What it does: checks that the taxpayer details the shop saved are present, then wraps AUREUM's standard transaction in a
   neutral request envelope ("aureum.fiscal.request/1") for a fiscal connector to deliver. The connector (supplied with, or
   approved for, the device or the authority's system) is the part that knows the authority's exact message format, signing
   and certificates. This file knows NONE of that and never invents it.

   What it never does: contact an authority, sign anything, or decide that a sale is fiscalised. Only a connector response that
   carries a fiscal reference does that (see fiscal-core.js), and only for a country whose integration the AUREUM team approved. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory(require('../fiscal-core.js'), require('../profiles.js'));
  else factory(root.AureumFiscal, root.AureumFiscalProfiles);
})(typeof self !== 'undefined' ? self : this, function(F, Profiles){
  'use strict';
  const near = (a, b) => Math.abs(a - b) < 0.011;
  const clean = o => { const r = {}; Object.keys(o).forEach(k => { if(o[k] != null && o[k] !== '') r[k] = o[k]; }); return r; };

  function make(code){
    const prof = Profiles.get(code);
    return {
      name: prof.name, authority: prof.authority, jurisdiction: prof.name, integrationVersion: 'AUREUM connector protocol 1 (generic)', defaultStatus: 'in_development',
      supportedDeviceAdapters: ['local-connector'], generic: true,
      docs: { name: 'Generic connector envelope', version: '1', verified: ['Neutral envelope with taxpayer details, device details and the standard transaction'],
              unverified: ['The authority\'s own message format, signing and QR rules — these live in the connector, not here'], notImplemented: ['Direct transport to the authority', 'Signing and certificates'] },
      buildRequest(std, ctx){
        const device = (ctx && ctx.device) || {}, conn = device.connection || {}, req = conn.requirements || {};
        if(prof.regime === 'none') return { ok:false, notReady:true, errors:['No fiscal device is known to be required for ' + prof.name + '.'] };
        const missing = Profiles.validateRequirements(code, req, { strict:true });
        if(missing.length) return { ok:false, notReady:true, errors:['Tax details are incomplete: ' + missing.join(' ')] };
        if(!std.currency) return { ok:false, errors:['Receipt currency is missing.'] };
        return { ok:true, request: {
          schema: 'aureum.fiscal.request/1', country: String(code).toUpperCase(), authority: prof.authority,
          route: conn.route || null,
          taxpayer: clean({ taxId: req.taxId, name: req.taxpayerName, vatNumber: req.vatNumber, branchId: req.branchId, bpNumber: req.bpNumber }),
          device: clean({ manufacturer: device.manufacturer, model: device.model, serial: device.serial_number, authorityDeviceId: device.zimra_device_id, registration: device.registration_status }),
          transaction: std
        } };
      },
      validate(request){
        const e = [], t = request && request.transaction;
        if(!t) return ['No transaction to validate.'];
        if(!t.lines || !t.lines.length) e.push('A sale needs at least one line.');
        (t.lines || []).forEach(l => { if(!(Number(l.qty) > 0)) e.push('Quantity must be greater than 0 ("' + l.name + '").'); });
        if(t.kind !== 'credit_note' && Number(t.total) < 0) e.push('A sale total cannot be negative.');
        const paid = (t.payments || []).reduce((s, p) => s + Number(p.amount), 0);
        if(!near(paid, Number(t.total))) e.push('Payments (' + paid.toFixed(2) + ') do not equal the total (' + Number(t.total).toFixed(2) + ').');
        if(!request.taxpayer || !request.taxpayer.taxId) e.push('The taxpayer number is missing.');
        return e;
      }
    };
  }
  const made = {};
  const genericCountry = code => { code = String(code).toUpperCase(); return made[code] || (made[code] = make(code)); };

  /* register a generic adapter for every country that has a profile AND no dedicated adapter of its own */
  if(F && F.registerCountry){
    Profiles.list().map(p => p.code).concat(Profiles.AFRICA).forEach(c => { if(!F.getCountry(c)) F.registerCountry(c, genericCountry(c)); });
    F.genericCountry = genericCountry;
  }
  return { genericCountry };
});
