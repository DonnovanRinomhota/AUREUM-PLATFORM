/* AUREUM fiscalisation — DEVICE ADAPTER: ZIMRA "virtual fiscalisation" (software talks to FDMS through the API).
   ZIMRA lists this as an approved route next to hardware fiscal devices (Public Notice 26 of 2024).
   STATUS: IN DEVELOPMENT. It would call a SERVER-SIDE gateway (edge function) that holds the device certificate,
   signs receipts and manages the fiscal day. That gateway does not exist yet, so every call here honestly reports
   "awaiting" and can never produce a fiscalised result. The browser never holds certificates or private keys.
   Hardware fiscal devices from ZIMRA Approved Suppliers have their own manufacturer protocols; none is implemented. */
(function(root, factory){
  if(typeof module === 'object' && module.exports) module.exports = factory(require('../fiscal-core.js'));
  else factory(root.AureumFiscal);
})(typeof self !== 'undefined' ? self : this, function(F){
  'use strict';
  const MSG = 'ZIMRA virtual fiscalisation needs the server-side FDMS gateway (device certificate, signing, fiscal day), which is not built yet — nothing was sent.';
  const adapter = {
    id: 'zw-virtual-fdms', label: 'ZIMRA virtual fiscal device (API)', supported: false, countries: ['ZW'], version: '0.1-draft',
    testConnection(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message: MSG }); },
    getDeviceStatus(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message: MSG }); },
    submitFiscalTransaction(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message: MSG }); },
    submitCreditNote(){ return Promise.resolve({ ok:false, status:'awaiting_adapter', message: MSG }); },
    disconnect(){ return Promise.resolve({ ok:true }); }
  };
  if(F && F.registerDeviceAdapter) F.registerDeviceAdapter('zw-virtual-fdms', adapter);
  return adapter;
});
