/* AUREUM Guide — interactive spotlight tours, Guide centre and first-run welcome.
   Shared by the Back Office and the POS. The engine knows nothing about sales or stock: each app supplies its own
   journeys (guide-pos.js, guide-bo.js) whose steps point at real, stable elements and detect progress from real
   application state. Nothing here ever performs a business action on the user's behalf.

   Privacy: usage counters (started / completed / skipped / where people leave) are kept in the user's own preferences.
   No names, customers, amounts or payment details are ever recorded and nothing is sent to any outside service. */
(function(root){
'use strict';
var doc = document, LS = 'aureum.guide.v1';
function rm(){ return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }

/* ---------- state ---------- */
var S = { app: '', cfg: null, journeys: [], data: null, run: null, ui: null, timer: null, saveT: null, center: null };
function blank(){ return { v: 1, done: {}, skipped: {}, progress: {}, hinted: {}, stats: {}, welcomedAt: null, welcomeShown: 0, centerOpened: 0 }; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function scopeKey(){ var k = ''; try{ k = (S.cfg && S.cfg.scope && S.cfg.scope()) || ''; }catch(e){} return LS + ':' + S.app + ':' + (k || 'anon'); }
function readLocal(){ try{ var j = JSON.parse(localStorage.getItem(scopeKey()) || 'null'); return j && typeof j === 'object' ? j : null; }catch(e){ return null; } }
function merge(a, b){   // two copies of the same person's progress (this device / their account): keep everything either one recorded
  var o = blank(); [a, b].forEach(function(x){ if(!x) return;
    ['done', 'skipped', 'progress', 'hinted'].forEach(function(k){ Object.keys(x[k] || {}).forEach(function(id){ if(o[k][id] == null || (k === 'progress' ? true : x[k][id] > o[k][id])) o[k][id] = x[k][id]; }); });
    Object.keys(x.stats || {}).forEach(function(j){ var s = x.stats[j], t = o.stats[j] = o.stats[j] || { started: 0, completed: 0, skipped: 0, opened: 0, abandoned: {} };
      ['started', 'completed', 'skipped', 'opened'].forEach(function(n){ t[n] = Math.max(t[n] || 0, s[n] || 0); });
      Object.keys(s.abandoned || {}).forEach(function(st){ t.abandoned[st] = Math.max(t.abandoned[st] || 0, s.abandoned[st]); }); });
    o.welcomedAt = o.welcomedAt || x.welcomedAt || null; o.welcomeShown = Math.max(o.welcomeShown, x.welcomeShown || 0); o.centerOpened = Math.max(o.centerOpened, x.centerOpened || 0); });
  Object.keys(o.done).forEach(function(id){ delete o.progress[id]; });
  return o;
}
function save(){
  clearTimeout(S.saveT);
  S.saveT = setTimeout(function(){
    try{ localStorage.setItem(scopeKey(), JSON.stringify(S.data)); }catch(e){}
    try{ if(S.cfg && S.cfg.remote && S.cfg.remote.save) S.cfg.remote.save(S.data); }catch(e){}
  }, 400);
}
function load(){
  var remote = null; try{ remote = S.cfg && S.cfg.remote && S.cfg.remote.load && S.cfg.remote.load(); }catch(e){}
  S.data = merge(readLocal(), remote);
}
/* privacy-light counters only */
function stat(j){ var s = S.data.stats[j] = S.data.stats[j] || { started: 0, completed: 0, skipped: 0, opened: 0, abandoned: {} }; return s; }
function track(ev, j, extra){
  try{ var a = JSON.parse(localStorage.getItem('aureum.guide.events') || '[]'); a.push({ t: Date.now(), e: ev, j: j || '', s: (extra && extra.step) || '', ms: (extra && extra.ms) || 0 }); localStorage.setItem('aureum.guide.events', JSON.stringify(a.slice(-200))); }catch(e){}
  if(S.cfg && typeof S.cfg.onEvent === 'function'){ try{ S.cfg.onEvent({ event: ev, journey: j || '', step: (extra && extra.step) || '', ms: (extra && extra.ms) || 0 }); }catch(e){} }
}

/* ---------- helpers ---------- */
function ctx(){ var c = {}; try{ c = (S.cfg && S.cfg.context && S.cfg.context()) || {}; }catch(e){} return c; }
function visible(el){ if(!el || !el.getBoundingClientRect) return false; var r = el.getBoundingClientRect(); if(r.width < 2 || r.height < 2) return false; var cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none'; }
function find(t){
  try{
    if(Array.isArray(t)){   // several elements acting as one highlighted area (e.g. payment buttons + amount + Complete Sale)
      var els = t.map(function(x){ return find(x); }).filter(Boolean); if(!els.length) return null;
      return { _union: true, _els: els, scrollIntoView: function(o){ els[0].scrollIntoView(o); },
        getBoundingClientRect: function(){ var L = 1e9, T = 1e9, R = -1e9, B = -1e9; els.forEach(function(e){ var r = e.getBoundingClientRect(); L = Math.min(L, r.left); T = Math.min(T, r.top); R = Math.max(R, r.right); B = Math.max(B, r.bottom); }); return { left: L, top: T, right: R, bottom: B, width: R - L, height: B - T }; } };
    }
    var el = typeof t === 'function' ? t() : (typeof t === 'string' ? doc.querySelector(t) : t); return visible(el) ? el : null;
  }catch(e){ return null; }
}
function journeyById(id){ return S.journeys.filter(function(j){ return j.id === id; })[0]; }
function usable(j){   // role / permission / state aware
  var c = ctx();
  if(j.roles && j.roles.length && c.role && j.roles.indexOf(c.role) < 0 && j.roles.indexOf('*') < 0) return false;
  if(typeof j.available === 'function'){ try{ if(!j.available(c)) return false; }catch(e){ return false; } }
  return true;
}
function status(j){
  if(S.data.done[j.id]) return 'done';
  if(S.data.progress[j.id] != null) return 'progress';
  if(S.data.skipped[j.id]) return 'skipped';
  return 'new';
}
function liveText(msg){ if(S.ui && S.ui.live){ S.ui.live.textContent = ''; setTimeout(function(){ S.ui.live.textContent = msg; }, 30); } }

/* ---------- styles ---------- */
function css(){
  if(doc.getElementById('agStyle')) return;
  var st = doc.createElement('style'); st.id = 'agStyle';
  st.textContent = [
    '.ag-dim{position:fixed;background:rgba(3,12,8,.66);z-index:2147482000;transition:all .25s ease;}',
    '.ag-ring{position:fixed;z-index:2147482001;border:2px solid var(--gold-bright,#E8C66A);border-radius:12px;pointer-events:none;box-shadow:0 0 0 4px rgba(232,198,106,.18),0 0 24px rgba(232,198,106,.28);transition:all .25s ease;}',
    '.ag-ring.pulse{animation:agPulse 1.8s ease-in-out infinite;}',
    '@keyframes agPulse{0%,100%{box-shadow:0 0 0 4px rgba(232,198,106,.18),0 0 24px rgba(232,198,106,.28)}50%{box-shadow:0 0 0 9px rgba(232,198,106,.10),0 0 30px rgba(232,198,106,.38)}}',
    '.ag-tip{position:fixed;z-index:2147482002;width:min(320px,calc(100vw - 24px));background:linear-gradient(180deg,#16301f,#10261a);color:var(--ivory,#F3EBD6);border:1px solid var(--gold,#C9A24B);border-radius:14px;box-shadow:0 22px 60px rgba(0,0,0,.6);padding:14px 16px 12px;font:13.5px/1.5 var(--font-body,Inter,system-ui,sans-serif);opacity:0;transition:opacity .2s ease,top .25s ease,left .25s ease;outline:none;}',
    '.ag-tip.show{opacity:1}.ag-tip:not(.show){pointer-events:none}',
    '.ag-tip .ag-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px}',
    '.ag-tip .ag-step{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-bright,#E8C66A);font-weight:600}',
    '.ag-tip .ag-x{background:none;border:0;color:var(--sage,#9DB5A5);font-size:16px;cursor:pointer;line-height:1;padding:2px 6px;border-radius:6px}',
    '.ag-tip .ag-x:hover{color:var(--ivory,#F3EBD6)}',
    '.ag-tip .ag-title{margin:0 0 4px;font-size:16px;font-weight:600;color:var(--ivory,#F3EBD6);font-family:var(--font-display,inherit)}',
    '.ag-tip .ag-body{color:var(--ivory-dim,#D8D2BD);margin:0}',
    '.ag-tip .ag-body b{color:var(--gold-bright,#E8C66A);font-weight:600}',
    '.ag-tip .ag-help{margin-top:8px;padding:7px 9px;border-radius:8px;background:rgba(227,154,75,.12);border:1px solid rgba(227,154,75,.4);color:#F1C48F;font-size:12.5px}',
    '.ag-tip .ag-ok{margin-top:8px;color:#8FE0A8;font-size:12.5px;font-weight:600}',
    '.ag-tip .ag-wait{margin-top:8px;color:var(--sage,#9DB5A5);font-size:12px}',
    '.ag-tip .ag-bar{height:3px;border-radius:3px;background:rgba(255,255,255,.1);margin:12px 0 10px;overflow:hidden}',
    '.ag-tip .ag-bar i{display:block;height:100%;background:var(--gold,#C9A24B);transition:width .3s}',
    '.ag-tip .ag-row{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}',
    '.ag-btn{font:inherit;font-size:12.5px;font-weight:600;border-radius:9px;padding:7px 13px;cursor:pointer;border:1px solid var(--line-strong,#3A5A45);background:transparent;color:var(--ivory,#F3EBD6)}',
    '.ag-btn:hover{border-color:var(--gold,#C9A24B)}',
    '.ag-btn.solid{background:linear-gradient(180deg,#E8C66A,#C9A24B);color:#20160A;border-color:transparent}',
    '.ag-btn[disabled]{opacity:.45;cursor:not-allowed}',
    '.ag-btn.link{border:0;background:none;color:var(--sage,#9DB5A5);padding:7px 6px;font-weight:500}',
    '.ag-btn:focus-visible,.ag-x:focus-visible,.ag-item:focus-visible{outline:2px solid #fff;outline-offset:2px}',
    '.ag-arrow{position:absolute;width:12px;height:12px;background:#14291c;border:1px solid var(--gold,#C9A24B);transform:rotate(45deg)}',
    '.ag-arrow.t{top:-7px;border-right:0;border-bottom:0}.ag-arrow.b{bottom:-7px;border-left:0;border-top:0}.ag-arrow.l{left:-7px;border-top:0;border-right:0}.ag-arrow.r{right:-7px;border-bottom:0;border-left:0}',
    '.ag-live{position:fixed;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}',
    '.ag-welcome{position:fixed;right:18px;bottom:18px;z-index:2147481000;width:min(340px,calc(100vw - 28px));background:linear-gradient(180deg,#16301f,#10261a);border:1px solid var(--gold,#C9A24B);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55);padding:16px;color:var(--ivory,#F3EBD6);font:13.5px/1.5 var(--font-body,Inter,system-ui,sans-serif)}',
    '.ag-welcome h3{margin:0 0 4px;font-size:16px}.ag-welcome p{margin:0 0 12px;color:var(--ivory-dim,#D8D2BD)}',
    '.ag-center-back{position:fixed;inset:0;z-index:2147481500;background:rgba(3,12,8,.55);display:flex;justify-content:flex-end}',
    '.ag-center{width:min(420px,100vw);height:100%;background:linear-gradient(180deg,#14291c,#0E2016);border-left:1px solid var(--gold,#C9A24B);color:var(--ivory,#F3EBD6);display:flex;flex-direction:column;font:13.5px/1.5 var(--font-body,Inter,system-ui,sans-serif)}',
    '.ag-center header{padding:18px 20px 12px;border-bottom:1px solid var(--line,#274433);display:flex;justify-content:space-between;gap:10px;align-items:flex-start}',
    '.ag-center header h2{margin:0;font-size:18px}.ag-center header p{margin:2px 0 0;color:var(--sage,#9DB5A5);font-size:12.5px}',
    '.ag-center .ag-scroll{overflow:auto;padding:12px 20px 20px;flex:1}',
    '.ag-center h3{margin:16px 0 8px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold-bright,#E8C66A)}',
    '.ag-prog{height:6px;border-radius:6px;background:rgba(255,255,255,.1);overflow:hidden;margin:10px 0 2px}.ag-prog i{display:block;height:100%;background:linear-gradient(90deg,#C9A24B,#E8C66A)}',
    '.ag-item{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;font:inherit;color:inherit;background:rgba(255,255,255,.03);border:1px solid var(--line,#274433);border-radius:12px;padding:11px 12px;margin-bottom:8px;cursor:pointer}',
    '.ag-item:hover{border-color:var(--gold,#C9A24B)}',
    '.ag-chk{flex:0 0 22px;height:22px;border-radius:50%;border:1.5px solid var(--line-strong,#3A5A45);display:flex;align-items:center;justify-content:center;font-size:12px;color:#20160A;margin-top:1px}',
    '.ag-item.done .ag-chk{background:#8FE0A8;border-color:#8FE0A8}.ag-item.progress .ag-chk{border-color:var(--gold-bright,#E8C66A);color:var(--gold-bright,#E8C66A)}',
    '.ag-item b{display:block;font-size:13.5px}.ag-item span.d{display:block;color:var(--sage,#9DB5A5);font-size:12px}.ag-item .go{margin-left:auto;font-size:11.5px;color:var(--gold-bright,#E8C66A);white-space:nowrap;align-self:center}',
    '.ag-launch-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--gold-bright,#E8C66A);margin-left:6px;vertical-align:middle}',
    '@media (prefers-reduced-motion:reduce){.ag-dim,.ag-ring,.ag-tip,.ag-bar i{transition:none!important}.ag-ring.pulse{animation:none!important}}',
    '.ag-tip .ag-x{position:absolute;top:10px;right:10px}',
    '@media (max-width:720px){.ag-tip{left:8px!important;right:8px;width:auto;top:auto!important;bottom:8px}.ag-arrow{display:none}}'
  ].join('\n');
  doc.head.appendChild(st);
}

/* ---------- spotlight + tooltip ---------- */
function buildUi(){
  if(S.ui) return;
  css();
  var dims = [0, 1, 2, 3].map(function(){ var d = doc.createElement('div'); d.className = 'ag-dim'; d.setAttribute('aria-hidden', 'true'); d.addEventListener('click', nudge); doc.body.appendChild(d); return d; });
  var ring = doc.createElement('div'); ring.className = 'ag-ring pulse'; ring.setAttribute('aria-hidden', 'true'); doc.body.appendChild(ring);
  var tip = doc.createElement('div'); tip.className = 'ag-tip'; tip.setAttribute('role', 'dialog'); tip.setAttribute('aria-label', 'AUREUM guide'); tip.tabIndex = -1; doc.body.appendChild(tip);
  var live = doc.createElement('div'); live.className = 'ag-live'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); doc.body.appendChild(live);
  S.ui = { dims: dims, ring: ring, tip: tip, live: live };
}
function destroyUi(){
  if(!S.ui) return;
  S.ui.dims.forEach(function(d){ d.remove(); }); S.ui.ring.remove(); S.ui.tip.remove(); S.ui.live.remove(); S.ui = null;
}
function nudge(){ if(!S.ui || rm()) return; S.ui.tip.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 260 }); }
function placeDims(r){
  var vw = root.innerWidth, vh = root.innerHeight, p = 6;
  var x = Math.max(0, r.left - p), y = Math.max(0, r.top - p), x2 = Math.min(vw, r.right + p), y2 = Math.min(vh, r.bottom + p);
  var d = S.ui.dims;
  function set(el, l, t, w, h){ el.style.left = l + 'px'; el.style.top = t + 'px'; el.style.width = Math.max(0, w) + 'px'; el.style.height = Math.max(0, h) + 'px'; }
  set(d[0], 0, 0, vw, y); set(d[1], 0, y2, vw, vh - y2); set(d[2], 0, y, x, y2 - y); set(d[3], x2, y, vw - x2, y2 - y);
  var g = S.ui.ring.style; g.left = x + 'px'; g.top = y + 'px'; g.width = (x2 - x) + 'px'; g.height = (y2 - y) + 'px'; g.display = 'block';
}
function dimAll(){ var vw = root.innerWidth, vh = root.innerHeight, d = S.ui.dims; d.forEach(function(el, i){ el.style.left = '0'; el.style.top = '0'; el.style.width = i === 0 ? vw + 'px' : '0'; el.style.height = i === 0 ? vh + 'px' : '0'; }); S.ui.ring.style.display = 'none'; }
function placeTip(r, pref){
  var tip = S.ui.tip, vw = root.innerWidth, vh = root.innerHeight, m = 12, gap = 14;
  tip.style.left = '0px'; tip.style.top = '0px';
  var w = tip.offsetWidth, h = tip.offsetHeight, arrow = tip.querySelector('.ag-arrow');
  if(arrow) arrow.remove();
  if(!r){ tip.style.left = Math.max(m, (vw - w) / 2) + 'px'; tip.style.top = Math.max(m, vh - h - 24) + 'px'; return; }
  var space = { right: vw - r.right - gap - m, left: r.left - gap - m, bottom: vh - r.bottom - gap - m, top: r.top - gap - m };
  var fits = { right: space.right >= w, left: space.left >= w, bottom: space.bottom >= h, top: space.top >= h };
  var order = (pref && pref !== 'auto') ? [pref, 'bottom', 'top', 'right', 'left'] : ['bottom', 'right', 'top', 'left'];
  var side = order.filter(function(s){ return fits[s]; })[0];
  if(!side){   // nothing fits whole: take a side that is almost big enough (the tip may overlap the target's border by a few pixels) before sitting inside it
    var best = order.map(function(s){ return { s: s, q: space[s] / ((s === 'right' || s === 'left') ? w : h) }; }).filter(function(x){ return x.q >= 0.9; }).sort(function(a, b){ return b.q - a.q; })[0];
    if(best) side = best.s;
  }
  var x, y, cls;
  if(!side){ side = 'in'; }   // target is huge: sit inside it, at the edge least likely to hide what must be clicked
  if(side === 'bottom'){ x = r.left + r.width / 2 - w / 2; y = r.bottom + gap; cls = 't'; }
  else if(side === 'top'){ x = r.left + r.width / 2 - w / 2; y = r.top - gap - h; cls = 'b'; }
  else if(side === 'right'){ x = r.right + gap; y = r.top + Math.min(r.height / 2, 60) - 30; cls = 'l'; }
  else if(side === 'left'){ x = r.left - gap - w; y = r.top + Math.min(r.height / 2, 60) - 30; cls = 'r'; }
  else { x = r.left + r.width / 2 - w / 2; y = Math.min(vh - h - m, r.bottom - h - m); cls = ''; }
  x = Math.max(m, Math.min(vw - w - m, x)); y = Math.max(m, Math.min(vh - h - m, y));
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  if(cls){
    var a = doc.createElement('i'); a.className = 'ag-arrow ' + cls;
    if(cls === 't' || cls === 'b') a.style.left = Math.max(14, Math.min(w - 26, r.left + r.width / 2 - x - 6)) + 'px'; else a.style.top = Math.max(14, Math.min(h - 26, r.top + Math.min(r.height / 2, 30) - y)) + 'px';
    tip.appendChild(a);
  }
}

/* ---------- running a journey ---------- */
function visibleSteps(j){ return j.steps; }
function startJourney(id, opts){
  opts = opts || {};
  var j = journeyById(id); if(!j) return false;
  closeCenter(); closeWelcome();
  if(S.run) stopRun('switch', true);
  var c = ctx();
  if(typeof j.prereq === 'function'){
    var pre = null; try{ pre = j.prereq(c); }catch(e){}
    if(pre){ buildUi(); S.run = { j: j, i: 0, t0: Date.now(), blocked: pre }; renderBlocked(pre); return true; }
  }
  var idx = 0;
  if(opts.resume && S.data.progress[id] != null){ idx = Math.max(0, Math.min(j.steps.length - 1, S.data.progress[id])); }
  stat(id)[opts.resume ? 'opened' : 'started']++; if(!opts.resume) delete S.data.done[id];
  S.data.skipped[id] && delete S.data.skipped[id];
  track(opts.resume ? 'guide_resumed' : 'guide_started', id);
  buildUi();
  S.run = { j: j, i: idx, t0: Date.now(), stepT0: Date.now(), sawSale: false, snap: null };
  save();
  showStep(idx, 1);
  return true;
}
function renderBlocked(pre){
  var tip = S.ui.tip; dimAll();
  tip.innerHTML = '<div class="ag-top"><span class="ag-step">Before we start</span></div><h3>' + esc(pre.title || 'One thing first') + '</h3><p class="ag-body">' + (pre.message || '') + '</p><div class="ag-row" style="margin-top:12px">' +
    (pre.action ? '<button class="ag-btn solid" data-a="pre">' + esc(pre.action.label) + '</button>' : '') + '<button class="ag-btn" data-a="exit">Close</button></div>';
  tip.classList.add('show'); placeTip(null); wireTip(pre);
  liveText((pre.title || '') + '. ' + String(pre.message || '').replace(/<[^>]+>/g, ''));
}
function wireTip(pre){
  S.ui.tip.querySelectorAll('[data-a]').forEach(function(b){ b.addEventListener('click', function(){
    var a = b.getAttribute('data-a');
    if(a === 'exit') stopRun('exit');
    else if(a === 'next') advance(1);
    else if(a === 'back') advance(-1);
    else if(a === 'skip') advance(1, true);
    else if(a === 'retry'){ showStep(S.run.i, 1); }
    else if(a === 'pre'){ var f = pre && pre.action && pre.action.run; stopRun('exit', true); if(f) try{ f(); }catch(e){} }
    else if(a.indexOf('act') === 0){ var st = S.run && S.run.j.steps[S.run.i], k = +a.slice(3); var act = st && st.actions && st.actions[k]; if(act){ try{ act.run && act.run(S.run); }catch(e){} if(act.finish) finish(); else if(act.next) advance(1); } }
  }); });
}
function showStep(i, dir){
  var run = S.run; if(!run) return;
  var j = run.j, st = j.steps[i];
  if(!st){ finish(); return; }
  if(st.when){ var ok = true; try{ ok = st.when(ctx(), run); }catch(e){ ok = false; } if(!ok){ if(dir < 0) return showStep(i - 1, -1); return showStep(i + 1, 1); } }
  run.i = i; run.stepT0 = Date.now(); run.doneAt = 0; run.misses = 0; run.snap = null; run.found = false; run.stepRendered = -1; run.announced = run.announced;
  S.data.progress[j.id] = i; save();
  try{ if(st.before) st.before(ctx(), run); }catch(e){}
  try{ if(st.snap) run.snap = st.snap(ctx(), run); }catch(e){}
  clearInterval(S.timer);
  var tries = 0;
  S.timer = setInterval(function(){ tick(true); if(++tries > 24 && !run.found){ clearInterval(S.timer); renderMissing(st); } }, 120);
  tick(true);
}
function renderMissing(st){
  var tip = S.ui.tip, run = S.run; if(!run) return;
  dimAll();
  tip.innerHTML = '<div class="ag-top"><span class="ag-step">Step ' + (run.i + 1) + ' of ' + run.j.steps.length + '</span></div><div class="ag-title">I can\'t find that on this screen</div><p class="ag-body">' + (st.missing || 'The part of AUREUM this step points at isn\'t showing right now (it may be hidden for your role, or still loading). Nothing has been changed.') + '</p><div class="ag-row" style="margin-top:12px">' +
    '<button class="ag-btn" data-a="exit">Exit</button>' + (run.i > 0 ? '<button class="ag-btn" data-a="back">Back</button>' : '') + (st.optional || st.missingSkip ? '<button class="ag-btn" data-a="skip">Skip this step</button>' : '') + '<button class="ag-btn solid" data-a="retry">Try again</button></div>';
  tip.classList.add('show'); placeTip(null); wireTip();
  track('step_target_missing', run.j.id, { step: st.id });
  liveText('This step could not find its target.');
}
function render(st, el){
  var run = S.run, j = run.j, n = j.steps.length, tip = S.ui.tip;
  var body = typeof st.body === 'function' ? st.body(ctx(), run) : st.body;
  var visIdx = 0, total = 0; j.steps.forEach(function(s, k){ var on = true; if(s.when){ try{ on = s.when(ctx(), run); }catch(e){ on = false; } } if(on){ total++; if(k <= run.i) visIdx++; } });
  var needs = !!st.done, manual = !needs;
  var isLast = true; for(var k = run.i + 1; k < n; k++){ var s2 = j.steps[k], on2 = true; if(s2.when){ try{ on2 = s2.when(ctx(), run); }catch(e){ on2 = false; } } if(on2){ isLast = false; break; } }
  var acts = (st.actions || []).map(function(a, q){ return '<button class="ag-btn' + (a.primary ? ' solid' : '') + '" data-a="act' + q + '">' + esc(a.label) + '</button>'; }).join('');
  var canBack = run.i > 0;
  tip.innerHTML = '<div class="ag-top"><span class="ag-step" style="padding-right:26px">Step ' + visIdx + ' of ' + total + ' · ' + esc(j.title) + '</span></div>' +
    '<div class="ag-title" id="agTitle">' + esc(st.title) + '</div><p class="ag-body">' + body + '</p><div class="ag-extra"></div>' +
    '<div class="ag-bar" aria-hidden="true"><i style="width:' + Math.round(visIdx / total * 100) + '%"></i></div>' +
    '<div class="ag-row">' + (canBack ? '<button class="ag-btn link" data-a="back">Back</button>' : '') + (st.optional && needs ? '<button class="ag-btn" data-a="skip">Skip this step</button>' : '') + acts +
    '<button class="ag-btn solid" data-a="next" ' + (needs ? 'disabled' : '') + '>' + esc(st.nextLabel || (isLast ? 'Finish' : (manual ? 'Got it' : 'Next'))) + '</button></div><button class="ag-x" aria-label="Exit guide (your place is saved)" data-a="exit">&#10005;</button>';
  wireTip();
  tip.classList.add('show');
  run.rendered = run.i + ':' + (typeof st.body === 'function' ? '' : '1');
  var first = !run.announced; run.announced = true;
  liveText('Step ' + visIdx + ' of ' + total + '. ' + st.title + '. ' + String(body).replace(/<[^>]+>/g, ''));
  if(first){ tip.focus({ preventScroll: true }); }
}
function tick(initial){
  var run = S.run; if(!run || run.blocked) return;
  var st = run.j.steps[run.i]; if(!st) return;
  var el = st.target ? find(st.target) : null;
  var hasTarget = !!st.target;
  if(hasTarget && !el){
    if(run.found){   // it was on screen and has gone (e.g. the pop-up this step was about got closed): finished, or lost?
      var dn0 = false; if(st.done){ try{ dn0 = !!st.done(ctx(), run.snap, run); }catch(e){} }
      if(dn0){ if(!run.doneAt) run.doneAt = Date.now(); advance(1); return; }
      if(!run.lostAt) run.lostAt = Date.now();
      if(Date.now() - run.lostAt > 1800){ clearInterval(S.timer); run.found = false; run.lostAt = 0; renderMissing(st); }
      return;
    }
    return;
  }
  run.lostAt = 0;
  if(!run.found || run.stepRendered !== run.i){
    run.found = true; run.stepRendered = run.i; clearInterval(S.timer); S.timer = setInterval(function(){ tick(false); }, 220);
    if(el){
      var r0 = el.getBoundingClientRect();
      if(r0.top < 0 || r0.bottom > root.innerHeight){ try{ el.scrollIntoView({ block: 'center', behavior: rm() ? 'auto' : 'smooth' }); }catch(e){} }
    }
    render(st, el); run.lastRect = '';
  }
  // a pop-up the person opened that this step is not about (customer, discount…): step aside until they close it
  var pms = S.cfg.modalSel ? Array.prototype.filter.call(doc.querySelectorAll(S.cfg.modalSel), visible) : [];
  var inModal = function(pm){ return !!el && (el._union ? el._els.some(function(e){ return pm.contains(e); }) : pm.contains(el)); };
  var paused = !!(pms.length && !pms.some(inModal) && !st.allowModal);
  if(paused){
    if(!run.paused){ run.paused = true; S.ui.dims.concat([S.ui.ring, S.ui.tip]).forEach(function(n){ n.style.visibility = 'hidden'; }); }
    var dn = false; if(st.done){ try{ dn = !!st.done(ctx(), run.snap, run); }catch(e){} } if(dn && !run.doneAt){ run.doneAt = Date.now(); }
    if(dn && Date.now() - run.doneAt > (st.delay || 800) && !st.manualAdvance) advance(1);
    return;
  }
  if(run.paused){ run.paused = false; S.ui.dims.concat([S.ui.ring, S.ui.tip]).forEach(function(n){ n.style.visibility = ''; }); run.lastRect = ''; }
  // position
  if(el){
    var r = el.getBoundingClientRect(), key = [r.left, r.top, r.width, r.height, root.innerWidth, root.innerHeight, S.ui.tip.offsetHeight].map(Math.round).join(',');
    if(key !== run.lastRect){ run.lastRect = key; placeDims(r); placeTip(r, st.placement); }
  } else if(run.lastRect !== 'none'){ run.lastRect = 'none'; dimAll(); placeTip(null); }
  // live help + completion
  var ex = S.ui.tip.querySelector('.ag-extra'); if(!ex) return;
  var done = false;
  if(st.done){ try{ done = !!st.done(ctx(), run.snap, run); }catch(e){ done = false; } }
  if(done){
    if(!run.doneAt){ run.doneAt = Date.now(); ex.innerHTML = '<div class="ag-ok">&#10003; ' + esc(st.doneText || 'Done') + '</div>'; var nb = S.ui.tip.querySelector('[data-a=next]'); if(nb) nb.disabled = false; liveText(st.doneText || 'Done'); track('step_done', run.j.id, { step: st.id, ms: Date.now() - run.stepT0 }); }
    if(!st.manualAdvance && Date.now() - run.doneAt > (st.delay || 800)) advance(1);
    return;
  }
  var h = null; if(st.help){ try{ h = st.help(ctx(), run.snap, run); }catch(e){} }
  if(h){ var wasH = ex.getAttribute('data-h'); if(wasH !== h){ ex.setAttribute('data-h', h); ex.innerHTML = '<div class="ag-help" role="alert">' + h + '</div>'; run.helpShown = (run.helpShown || 0) + 1; track('step_help_shown', run.j.id, { step: st.id }); } }
  else if(st.done){ if(ex.getAttribute('data-h') !== 'w'){ ex.setAttribute('data-h', 'w'); ex.innerHTML = '<div class="ag-wait">' + esc(st.waitText || 'Waiting for you to do this…') + '</div>'; } }
}
function advance(dir, skipped){
  var run = S.run; if(!run) return;
  var st = run.j.steps[run.i];
  if(dir > 0 && st && st.done && !run.doneAt && !skipped) return;   // a required step can only be passed by really doing it
  if(dir > 0 && st && st.onNext){ try{ st.onNext(ctx(), run); }catch(e){} }
  if(dir > 0 && skipped) track('step_skipped', run.j.id, { step: st && st.id });
  var ni = run.i + dir;
  if(ni < 0) return;
  if(ni >= run.j.steps.length){ finish(); return; }
  S.ui.tip.classList.remove('show');
  var lastStatic = run; setTimeout(function(){ if(S.run === lastStatic) showStep(ni, dir); }, rm() ? 0 : 120);
}
function finish(){
  var run = S.run; if(!run) return;
  var j = run.j, ms = Date.now() - run.t0;
  S.data.done[j.id] = Date.now(); delete S.data.progress[j.id]; stat(j.id).completed++;
  track('guide_completed', j.id, { ms: ms });
  var next = null; try{ next = j.next && j.next(ctx()); }catch(e){}
  save(); teardown();
  if(typeof j.onFinish === 'function'){ try{ j.onFinish(ctx()); }catch(e){} }
  notice('Guide complete: ' + j.title, next);
}
function stopRun(reason, silent){
  var run = S.run; if(!run) return;
  clearInterval(S.timer);
  if(!run.blocked && reason !== 'switch' || (reason === 'switch' && !run.blocked)){
    var st = run.j.steps[run.i]; var ab = stat(run.j.id).abandoned; if(st && reason !== 'finish'){ ab[st.id] = (ab[st.id] || 0) + 1; }
    track('guide_exited', run.j.id, { step: st && st.id, ms: Date.now() - run.t0 });
  }
  teardown(); save();
  if(!silent && !run.blocked) notice('Guide paused — open <b>Guide</b> any time to resume where you left off.');
}
function teardown(){ clearInterval(S.timer); S.run = null; destroyUi(); }
function notice(html, next){
  var d = doc.createElement('div'); d.className = 'ag-welcome'; d.setAttribute('role', 'status');
  d.innerHTML = '<p style="margin:0 0 ' + (next ? '10' : '0') + 'px">' + html + '</p>' + (next ? '<div class="ag-row" style="display:flex;gap:8px;justify-content:flex-end"><button class="ag-btn" data-n="no">Not now</button><button class="ag-btn solid" data-n="go">' + esc(next.label || 'Next guide') + '</button></div>' : '');
  doc.body.appendChild(d);
  var kill = function(){ d.remove(); };
  d.querySelectorAll('[data-n]').forEach(function(b){ b.addEventListener('click', function(){ kill(); if(b.getAttribute('data-n') === 'go' && next && next.id) startJourney(next.id); }); });
  if(!next) setTimeout(kill, 5200);
}
doc.addEventListener('keydown', function(e){
  if(!S.run) return;
  if(e.key === 'Escape' && !e.defaultPrevented){ stopRun('exit'); }
});
['resize', 'scroll'].forEach(function(ev){ root.addEventListener(ev, function(){ if(S.run) S.run.lastRect = ''; }, true); });

/* ---------- first-run welcome (small card, never a full-screen takeover) ---------- */
function closeWelcome(){ var w = doc.getElementById('agWelcome'); if(w) w.remove(); }
function maybeWelcome(opts){
  opts = opts || {};
  if(S.run || !S.data || S.data.welcomedAt || (S.data.welcomeShown || 0) >= 2) return false;
  var anyTouched = Object.keys(S.data.done).length || Object.keys(S.data.progress).length || Object.keys(S.data.skipped).length;
  if(anyTouched) return false;
  var j = opts.journey && journeyById(opts.journey); if(!j || !usable(j)) return false;
  if(doc.getElementById('agWelcome')) return true;
  S.data.welcomeShown = (S.data.welcomeShown || 0) + 1; save();
  /* auto: go straight into the highlighted tour (the person can still exit it at any time with Esc or Exit) */
  if(opts.auto){ S.data.welcomedAt = Date.now(); save(); track('guide_autostart', j.id); startJourney(j.id); return true; }
  var d = doc.createElement('div'); d.className = 'ag-welcome'; d.id = 'agWelcome'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'Welcome to AUREUM');
  d.innerHTML = '<h3>' + esc(opts.title || 'Welcome to AUREUM') + '</h3><p>' + (opts.text || '') + '</p><div class="ag-row" style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap"><button class="ag-btn link" data-w="never">Don\'t show again</button><button class="ag-btn" data-w="later">Not now</button><button class="ag-btn solid" data-w="go">' + esc(opts.cta || 'Show me') + '</button></div>';
  doc.body.appendChild(d);
  d.querySelector('[data-w=go]').focus();
  d.querySelectorAll('[data-w]').forEach(function(b){ b.addEventListener('click', function(){
    var a = b.getAttribute('data-w'); d.remove();
    if(a === 'go'){ S.data.welcomedAt = Date.now(); save(); startJourney(j.id); }
    else if(a === 'never'){ S.data.welcomedAt = Date.now(); S.data.skipped[j.id] = Date.now(); stat(j.id).skipped++; track('guide_skipped', j.id); save(); }
    else { track('guide_postponed', j.id); save(); }
  }); });
  return true;
}
/* a small one-time offer when the user reaches a screen that has its own short guide */
function hint(id, text){
  if(S.run || !S.data || S.data.hinted[id] || S.data.done[id] || S.data.skipped[id]) return false;
  var j = journeyById(id); if(!j || !usable(j)) return false;
  if(doc.getElementById('agWelcome')) return false;
  S.data.hinted[id] = Date.now(); save();
  var d = doc.createElement('div'); d.className = 'ag-welcome'; d.id = 'agWelcome'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', j.title);
  d.innerHTML = '<p style="margin:0 0 10px">' + (text || 'New here? There is a short guide for this screen.') + '</p><div style="display:flex;gap:8px;justify-content:flex-end"><button class="ag-btn" data-w="no">No thanks</button><button class="ag-btn solid" data-w="go">Show me</button></div>';
  doc.body.appendChild(d);
  d.querySelectorAll('[data-w]').forEach(function(b){ b.addEventListener('click', function(){ d.remove(); if(b.getAttribute('data-w') === 'go') startJourney(id); else { S.data.skipped[id] = Date.now(); stat(id).skipped++; track('guide_skipped', id); save(); } }); });
  setTimeout(function(){ if(d.parentNode) d.remove(); }, 15000);
  return true;
}

/* ---------- Guide centre ---------- */
function closeCenter(){ if(S.center){ S.center.remove(); S.center = null; if(S.centerReturn && S.centerReturn.focus) try{ S.centerReturn.focus(); }catch(e){} } }
function openCenter(){
  if(!S.data) return; css(); if(S.center) return;
  S.centerReturn = doc.activeElement;
  S.data.centerOpened = (S.data.centerOpened || 0) + 1; save(); updateLaunchers();
  var list = S.journeys.filter(usable);
  var grp = function(j){ try{ return typeof j.group === 'function' ? j.group(ctx()) : j.group; }catch(e){ return 'more'; } };
  var start = list.filter(function(j){ return grp(j) === 'start'; }), more = list.filter(function(j){ return grp(j) !== 'start'; });
  var doneN = start.filter(function(j){ return status(j) === 'done'; }).length;
  var back = doc.createElement('div'); back.className = 'ag-center-back';
  function item(j){
    var s = status(j), label = s === 'done' ? 'Restart' : s === 'progress' ? 'Resume' : 'Start';
    var mark = s === 'done' ? '&#10003;' : s === 'progress' ? '&#8230;' : '';
    return '<button class="ag-item ' + s + '" data-j="' + esc(j.id) + '"><span class="ag-chk" aria-hidden="true">' + mark + '</span><span><b>' + esc(j.title) + '</b><span class="d">' + esc(j.desc || '') + '</span></span><span class="go">' + label + ' &#8250;</span></button>';
  }
  back.innerHTML = '<div class="ag-center" role="dialog" aria-modal="true" aria-label="AUREUM guide"><header><div><h2>Get started with AUREUM</h2><p>Guides that use the real screen — nothing is changed unless you do it.</p></div><button class="ag-x" id="agCenterX" aria-label="Close guide centre" style="background:none;border:0;color:inherit;font-size:18px;cursor:pointer">&#10005;</button></header><div class="ag-scroll">' +
    (start.length ? '<div class="ag-prog" role="progressbar" aria-label="Checklist progress" aria-valuemin="0" aria-valuemax="' + start.length + '" aria-valuenow="' + doneN + '"><i style="width:' + Math.round(doneN / start.length * 100) + '%"></i></div><div style="font-size:12px;color:var(--sage,#9DB5A5)">' + doneN + ' of ' + start.length + ' complete</div><h3>Your checklist</h3>' + start.map(item).join('') : '') +
    (more.length ? '<h3>More guides</h3>' + more.map(item).join('') : '') +
    (S.cfg.links && S.cfg.links.length ? '<h3>Help</h3>' + S.cfg.links.map(function(l, k){ return '<button class="ag-item" data-link="' + k + '"><span class="ag-chk" aria-hidden="true">?</span><span><b>' + esc(l.label) + '</b><span class="d">' + esc(l.desc || '') + '</span></span><span class="go">Open &#8250;</span></button>'; }).join('') : '') +
    '<div style="margin-top:16px;text-align:right"><button class="ag-btn link" id="agReset">Reset my guide progress</button></div></div></div>';
  doc.body.appendChild(back); S.center = back;
  back.addEventListener('click', function(e){ if(e.target === back) closeCenter(); });
  back.querySelector('#agCenterX').addEventListener('click', closeCenter);
  back.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.stopPropagation(); closeCenter(); } });
  back.querySelectorAll('[data-j]').forEach(function(b){ b.addEventListener('click', function(){ var id = b.getAttribute('data-j'); startJourney(id, { resume: status(journeyById(id)) === 'progress' }); }); });
  back.querySelectorAll('[data-link]').forEach(function(b){ b.addEventListener('click', function(){ var l = S.cfg.links[+b.getAttribute('data-link')]; closeCenter(); try{ l.run(); }catch(e){} }); });
  back.querySelector('#agReset').addEventListener('click', function(){ if(!confirm('Reset all of your guide progress on this account?')) return; S.data = blank(); save(); closeCenter(); openCenter(); });
  var f = back.querySelector('.ag-item') || back.querySelector('#agCenterX'); if(f) f.focus();
  track('center_opened', '');
}
function updateLaunchers(){
  doc.querySelectorAll('[data-guide-launch]').forEach(function(el){
    var dot = el.querySelector('.ag-launch-dot'), want = S.data && !S.data.centerOpened && !Object.keys(S.data.done).length;
    if(want && !dot){ var d = doc.createElement('span'); d.className = 'ag-launch-dot'; d.setAttribute('aria-hidden', 'true'); el.appendChild(d); }
    if(!want && dot) dot.remove();
  });
}
function mountLauncher(el){
  if(!el || el._ag) return; el._ag = 1; el.setAttribute('data-guide-launch', '1');
  if(!el.hasAttribute('role')) el.setAttribute('role', 'button'); if(!el.hasAttribute('tabindex')) el.tabIndex = 0;
  el.addEventListener('click', function(){ openCenter(); });
  el.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openCenter(); } });
  updateLaunchers();
}

/* ---------- public ---------- */
function init(cfg){
  S.cfg = cfg; S.app = cfg.app || 'app'; S.journeys = cfg.journeys || [];
  load(); css();
  doc.querySelectorAll(cfg.launcher || '[data-guide-launch]').forEach(mountLauncher);
  return api;
}
/* call again when the signed-in person changes (different cashier, sign-in finished) so progress follows THEM */
function reload(){ if(S.run) stopRun('exit', true); closeWelcome(); load(); updateLaunchers(); }
var api = {
  init: init, reload: reload, start: startJourney, openCenter: openCenter, closeCenter: closeCenter, maybeWelcome: maybeWelcome, hint: hint, mountLauncher: mountLauncher,
  stop: function(){ stopRun('exit', true); }, active: function(){ return S.run ? S.run.j.id : null; }, esc: esc, visible: visible,
  status: function(id){ var j = journeyById(id); return j && S.data ? status(j) : null; },
  progress: function(){ return S.data; }, events: function(){ try{ return JSON.parse(localStorage.getItem('aureum.guide.events') || '[]'); }catch(e){ return []; } },
  stats: function(){ return S.data ? S.data.stats : {}; }, setData: function(d){ S.data = merge(S.data, d); }
};
root.AureumGuide = api;
})(window);
