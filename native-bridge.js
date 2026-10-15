/* AUREUM — Android app bridge (loaded by the POS and the Back Office; does NOTHING in a normal web browser).
   Inside the two Android apps (Capacitor) the web page gets native help for the few things a WebView cannot do:
     • store-app mode (no payment buttons — the store rules), set by the app opening the page with ?store=1
     • Bluetooth (BLE) receipt printer / cash drawer      → AureumNative.ble*   (used by the POS's existing print code)
     • camera barcode scanning                            → AureumNative.scan()
     • saving / sharing downloaded files (CSV, XLSX, PDF) → automatic, intercepts "download" links
     • "Print" in a WebView does nothing, so it shares the receipt text instead
     • update notice if this app is older than the website needs (reads /app-compat.json)
   Every native call is wrapped so that a failure shows a plain message and never breaks the page. */
(function(){
  'use strict';
  var C = window.Capacitor;
  var isNative = !!(C && typeof C.isNativePlatform === 'function' && C.isNativePlatform());
  var P = isNative ? (C.Plugins || {}) : {};
  var params = new URLSearchParams(location.search);
  var appName = params.get('app');
  try{ if(appName) localStorage.setItem('aureum_native_app', appName); else appName = localStorage.getItem('aureum_native_app') || ''; }catch(e){}
  var AN = window.AureumNative = { isNative: isNative, app: appName || '', build: 0 };
  if(!isNative) return;

  document.documentElement.classList.add('native-app');
  try{ localStorage.setItem('aureum_store_app', '1'); }catch(e){}
  document.documentElement.classList.add('store-app');

  var toast = function(m, k){ try{ if(typeof window.aureumToast === 'function') window.aureumToast(m, k || 'danger'); else alert(m); }catch(e){} };
  var err = function(e){ return (e && (e.message || e.errorMessage)) ? String(e.message || e.errorMessage) : String(e || 'Something went wrong'); };

  /* ---------- app version + "please update" notice ---------- */
  (function(){
    if(!P.App || !P.App.getInfo) return;
    P.App.getInfo().then(function(info){
      AN.build = parseInt(info && info.build, 10) || 0; AN.version = info && info.version;
      return fetch('/app-compat.json?t=' + Date.now(), { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null; }).then(function(j){
        var c = j && j[AN.app]; if(!c) return;
        if(AN.build && c.minNativeVersionCode && AN.build < c.minNativeVersionCode){
          var bar = document.createElement('div'); bar.setAttribute('role', 'alert');
          bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#C9A24B;color:#1b1408;padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));font:600 14px system-ui,sans-serif;text-align:center';
          bar.textContent = 'A newer version of this app is available on Google Play. Please update.';
          document.body.appendChild(bar);
        }
      });
    }).catch(function(){});
  })();

  /* ---------- saving / sharing downloaded files ---------- */
  function b64(blob){ return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(String(r.result).split(',')[1] || ''); }; r.onerror = rej; r.readAsDataURL(blob); }); }
  function saveAndShare(href, name){
    if(!P.Filesystem || !P.Share) { toast('Saving files is not available in this app version.'); return Promise.resolve(); }
    return fetch(href).then(function(r){ return r.blob(); }).then(b64).then(function(data){
      var safe = String(name || 'aureum-file').replace(/[^\w.\- ]+/g, '_');
      return P.Filesystem.writeFile({ path: safe, data: data, directory: 'CACHE' }).then(function(w){
        return P.Share.share({ title: safe, url: w.uri, dialogTitle: 'Save or share ' + safe });
      });
    }).catch(function(e){ if(!/cancel/i.test(err(e))) toast('Could not save the file: ' + err(e)); });
  }
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function(){
    if(this.download && /^blob:|^data:/.test(this.href)){ saveAndShare(this.href, this.download); return; }
    return origClick.apply(this, arguments);
  };
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest && ev.target.closest('a[download]');
    if(a && /^blob:|^data:/.test(a.href)){ ev.preventDefault(); ev.stopPropagation(); saveAndShare(a.href, a.download); }
  }, true);

  /* ---------- "Print" in a WebView does nothing -> share the receipt text ---------- */
  window.print = function(){
    var text = typeof window.AureumReceiptText === 'function' ? window.AureumReceiptText() : '';
    if(!text || !P.Share){ toast('Nothing to print yet.'); return; }
    P.Share.share({ title: 'Receipt', text: text, dialogTitle: 'Print or share receipt' }).catch(function(e){ if(!/cancel/i.test(err(e))) toast(err(e)); });
  };

  /* ---------- camera barcode scanning (POS) ---------- */
  AN.canScan = function(){ return !!(P.BarcodeScanner && P.BarcodeScanner.scan); };
  AN.scan = function(){
    var B = P.BarcodeScanner; if(!B) return Promise.reject(new Error('Camera scanning is not available in this app.'));
    return B.requestPermissions().then(function(p){
      if(p && p.camera && p.camera !== 'granted' && p.camera !== 'limited') throw new Error('Camera permission is needed to scan. Allow it in Android settings.');
      return (B.isGoogleBarcodeScannerModuleAvailable ? B.isGoogleBarcodeScannerModuleAvailable() : Promise.resolve({ available: true }));
    }).then(function(m){
      if(m && m.available === false && B.installGoogleBarcodeScannerModule){ toast('Preparing the scanner for first use, try again in a moment.', 'ok'); return B.installGoogleBarcodeScannerModule().then(function(){ throw new Error('Scanner is installing. Please tap Scan again in a few seconds.'); }); }
      return B.scan({ formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'QR_CODE'] });
    }).then(function(r){ var b = r && r.barcodes && r.barcodes[0]; return b ? String(b.rawValue || b.displayValue || '') : ''; });
  };

  /* ---------- Bluetooth LE receipt printer + cash drawer (POS) ----------
     Same two common printer UART services as the browser version. Bytes go as a hex string (that is what the native side takes).
     NOTE: printers that only speak classic Bluetooth (SPP) will not appear here — see android/README.md. */
  var BLE = null;   // { deviceId, service, characteristic, noResp }
  var SERVICES = [
    { service: '000018f0-0000-1000-8000-00805f9b34fb', write: '00002af1-0000-1000-8000-00805f9b34fb' },
    { service: '0000ff00-0000-1000-8000-00805f9b34fb', write: '0000ff02-0000-1000-8000-00805f9b34fb' }
  ];
  AN.hasBle = function(){ return !!(P.BluetoothLe && P.BluetoothLe.requestDevice); };
  AN.bleConnected = function(){ return !!BLE; };
  AN.bleConnect = function(){
    var L = P.BluetoothLe; if(!L) return Promise.reject(new Error('Bluetooth printing is not available in this app.'));
    if(BLE) return Promise.resolve(BLE);
    var found = null;
    return L.initialize({ androidNeverForLocation: true })
      .then(function(){ return L.requestDevice({ services: SERVICES.map(function(s){ return s.service; }), optionalServices: SERVICES.map(function(s){ return s.service; }) }); })
      .then(function(dev){ found = dev; return L.connect({ deviceId: dev.deviceId }); })
      .then(function(){ return L.getServices({ deviceId: found.deviceId }); })
      .then(function(r){
        var svcs = (r && r.services) || [];
        for(var i = 0; i < SERVICES.length; i++){
          var s = svcs.filter(function(x){ return String(x.uuid).toLowerCase() === SERVICES[i].service; })[0]; if(!s) continue;
          var ch = (s.characteristics || []).filter(function(x){ return String(x.uuid).toLowerCase() === SERVICES[i].write; })[0]; if(!ch) continue;
          BLE = { deviceId: found.deviceId, service: SERVICES[i].service, characteristic: SERVICES[i].write, noResp: !!(ch.properties && ch.properties.writeWithoutResponse && !ch.properties.write) };
          return BLE;
        }
        throw new Error('Connected, but this printer uses a Bluetooth printing method this app does not support yet.');
      });
  };
  function hex(u8){ var s = ''; for(var i = 0; i < u8.length; i++){ s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); } return s; }
  AN.bleWrite = function(data){
    var u8 = data instanceof Uint8Array ? data : (data instanceof ArrayBuffer ? new Uint8Array(data) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    return AN.bleConnect().then(function(c){
      var fn = c.noResp ? 'writeWithoutResponse' : 'write';
      return P.BluetoothLe[fn]({ deviceId: c.deviceId, service: c.service, characteristic: c.characteristic, value: hex(u8) });
    }).catch(function(e){ BLE = null; throw e; });
  };
  window.addEventListener('beforeunload', function(){ try{ if(BLE && P.BluetoothLe) P.BluetoothLe.disconnect({ deviceId: BLE.deviceId }); }catch(e){} });
})();
