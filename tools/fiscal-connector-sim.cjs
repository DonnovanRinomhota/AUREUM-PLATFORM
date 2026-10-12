#!/usr/bin/env node
/* AUREUM fiscal connector SIMULATOR — for testing and for connector authors. NOT a real fiscal device.
   Implements the connector protocol (FISCALISATION.md → "Connector protocol") on 127.0.0.1 so the till, Settings → Fiscalisation
   and your own connector can be checked end to end. Every reference it returns starts with "SIMULATED-", and AUREUM prints
   such receipts as "TEST ONLY — NOT A REAL FISCAL INVOICE".

   Run:   node tools/fiscal-connector-sim.cjs [--port 8787] [--mode ok|reject|fail|garbage|slow|down|notready]
   Then in Settings → Fiscalisation → Add device: connection type "Local connector", address http://127.0.0.1:8787 */
'use strict';
const http = require('http');
const PROTOCOL = 'aureum.fiscal.connector/1';

function start(opts){
  opts = opts || {};
  const state = { mode: opts.mode || 'ok', seen: new Map(), calls: [], counter: 0 };
  const send = (res, code, obj, extra) => { res.writeHead(code, Object.assign({ 'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type', 'Access-Control-Allow-Methods':'GET,POST,OPTIONS', 'Access-Control-Allow-Private-Network':'true' }, extra || {})); res.end(JSON.stringify(obj)); };
  const server = http.createServer((req, res) => {
    if(req.method === 'OPTIONS'){ send(res, 204, {}); return; }
    let body = ''; req.on('data', c => { body += c; if(body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      let j = null; try{ j = body ? JSON.parse(body) : null; }catch(e){}
      state.calls.push({ method: req.method, url: req.url, body: j });
      if(state.mode === 'down'){ req.socket.destroy(); return; }   // the connection just drops, like a stopped program
      const go = () => {
        if(req.url === '/aureum/v1/health' && req.method === 'GET') return send(res, 200, state.mode === 'notready' ? { protocol: PROTOCOL, ok:false, device:{ ready:false }, message:'Fiscal device not ready (simulated).' } : { protocol: PROTOCOL, ok:true, device:{ ready:true, model:'SIMULATOR', serial:'SIM-0001' } });
        if(state.mode === 'garbage') return send(res, 200, { hello:'world' });
        if(req.method !== 'POST' || !j || j.protocol !== PROTOCOL || !j.idempotencyKey) return send(res, 400, { status:'failed', message:'Bad request (simulated).' });
        if(req.url === '/aureum/v1/status'){
          const s = state.seen.get(j.idempotencyKey);
          return send(res, 200, s ? Object.assign({ idempotencyKey: j.idempotencyKey }, s) : { status:'not_found', idempotencyKey: j.idempotencyKey });
        }
        if(req.url === '/aureum/v1/fiscalise' || req.url === '/aureum/v1/credit-note'){
          if(state.mode === 'reject') return send(res, 200, { status:'rejected', code:'SIM-REJECT', message:'Rejected by the simulated authority.', idempotencyKey: j.idempotencyKey });
          if(state.mode === 'fail')   return send(res, 200, { status:'failed',   code:'SIM-FAIL',   message:'The simulated device could not print.', idempotencyKey: j.idempotencyKey });
          if(state.mode === 'error500') return send(res, 500, { message:'boom' });
          const prev = state.seen.get(j.idempotencyKey);
          const out = prev || { status:'fiscalised', fiscalRef:'SIMULATED-' + String(++state.counter).padStart(6, '0'), verificationCode:'SIM' + state.counter, qrData:'SIMULATED' };
          state.seen.set(j.idempotencyKey, out);               // same key twice => same answer, never a second receipt
          return send(res, 200, Object.assign({ idempotencyKey: j.idempotencyKey }, out));
        }
        send(res, 404, { status:'failed', message:'Unknown path.' });
      };
      if(state.mode === 'slow') setTimeout(go, opts.slowMs || 30000); else go();
    });
  });
  return new Promise(resolve => server.listen(opts.port || 0, '127.0.0.1', () => resolve({ server, state, port: server.address().port, url: 'http://127.0.0.1:' + server.address().port, close: () => new Promise(r => { server.closeAllConnections && server.closeAllConnections(); server.close(r); }) })));
}
module.exports = { start, PROTOCOL };
if(require.main === module){
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
  start({ port: Number(arg('port', 8787)), mode: arg('mode', 'ok') }).then(s => console.log('AUREUM fiscal connector SIMULATOR on ' + s.url + '  (mode: ' + s.state.mode + ') — TEST ONLY, not a real fiscal device. Ctrl+C to stop.'));
}
