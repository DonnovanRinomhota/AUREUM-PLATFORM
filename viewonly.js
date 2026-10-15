/* AUREUM — view-only mode.
   When a free trial has ended or a subscription has expired the owner can still sign in and see everything,
   but nothing can be changed: a gold strip across the very top says why, and every add / edit / delete / sale
   action is switched off until they subscribe.  Used by both the Back Office and the till.

   AureumViewOnly.statusFrom(biz, graceDays)  -> { viewOnly, kind:'trial'|'expired', text } | { viewOnly:false }
   AureumViewOnly.enable({ kind, text, onSubscribe, allow, deny, denyText, safeText })
   AureumViewOnly.active()  -> boolean
*/
(function(){
  'use strict';
  var TRIAL_TEXT = 'Free trial period has ended';
  var EXPIRED_TEXT = 'Subscription has expired';
  var TAIL = 'Subscribe to keep enjoying Aureum';
  var state = { on:false, kind:'', opts:null };

  function statusFrom(biz, graceDays){
    if(!biz) return { viewOnly:false };
    if(biz.is_exempt) return { viewOnly:false };
    var st = biz.subscription_status, now = new Date(), DAY = 86400000, g = (graceDays == null ? 3 : graceDays);
    if(st === 'suspended') return { viewOnly:false, suspended:true };
    if(st === 'cancelled') return { viewOnly:true, kind:'expired', text:EXPIRED_TEXT };
    if(st === 'trial' && biz.trial_ends_at && new Date(biz.trial_ends_at) < now) return { viewOnly:true, kind:'trial', text:TRIAL_TEXT };
    if(st === 'active' && biz.current_period_end && now > new Date(new Date(biz.current_period_end).getTime() + g * DAY)) return { viewOnly:true, kind:'expired', text:EXPIRED_TEXT };
    return { viewOnly:false };
  }

  var CSS = '' +
    '#vo-strip{position:fixed;top:0;left:0;right:0;z-index:2147483000;min-height:38px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;' +
      'padding:6px 12px;background:linear-gradient(135deg,#F2D675,#D4A843 55%,#B98F2E);color:#1B140A;font:600 12.5px/1.35 Inter,system-ui,sans-serif;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.35);}' +
    '#vo-strip b{font-weight:800;}' +
    '#vo-strip .vo-btn{cursor:pointer;border:1.5px solid #1B140A;border-radius:999px;padding:3px 12px;font:700 12px Inter,system-ui,sans-serif;background:transparent;color:#1B140A;}' +
    '#vo-strip .vo-btn:hover{background:#1B140A;color:#F2D675;}' +
    '@media (max-width:700px){#vo-strip{flex-wrap:nowrap;justify-content:space-between;text-align:left;font-size:11.5px;padding:6px 10px;gap:8px;}#vo-strip .vo-btn{flex:0 0 auto;}}' +
    'body.vo-on{padding-top:var(--vo-h,38px) !important;box-sizing:border-box;}' +
    'body.vo-on .app{height:calc(100vh - var(--vo-h,38px)) !important;height:calc(100dvh - var(--vo-h,38px)) !important;}' +
    'body.vo-on .ticket-wrap{top:var(--vo-h,38px) !important;}body.vo-on .modal-overlay{padding-top:calc(var(--vo-h,38px) + 12px) !important;}' +
    'body.vo-on .main,body.vo-on .sidebar{height:calc(100vh - var(--vo-h,38px)) !important;height:calc(100dvh - var(--vo-h,38px)) !important;}body.vo-on .mobile-menu-btn{top:calc(var(--vo-h,38px) + 12px) !important;}@media (max-width:900px){body.vo-on .sidebar{top:var(--vo-h,38px) !important;}}' +
    'body.vo-on #trialBanner,body.vo-on .ag-welcome{display:none !important;}' +
    'body.vo-on .vo-blocked{opacity:.45;cursor:not-allowed !important;}';

  function toast(msg){ try{ if(typeof window.aureumToast === 'function') return window.aureumToast(msg, 'danger'); }catch(e){} }
  function say(){ toast('View only — ' + (state.kind === 'trial' ? 'your free trial has ended' : 'your subscription has expired') + '.' + (state.opts && state.opts.storeMode ? '' : ' Subscribe to make changes.')); }

  var ACTION_SEL = 'button,[role="button"],.btn-gold,.btn-outline,.btn-ghost-sm,.icon-btn-sm,.icon-btn-row,.modal-btn,.add-line-btn,.switch,[data-act]';
  var HARD_SEL = '.btn-gold,.modal-btn.solid,.icon-btn-row,.switch,.add-line-btn';
  var ALWAYS_ALLOW = '#vo-strip,.modal-close,[data-close],.modal-btn.ghost,.pg-btn,.seg-btn,.popover-anchor,.popover,.export-opt,.mobile-menu-btn,.nav-item,.settings-tab-item,.auth-btn,#authGate,#helpFab,[class*="ag-"],#settings-help,#settings-billing,.help-pane,.help-tabs,select,input,textarea,label';
  var DENY_WORDS = /\b(save|add|create|new|delete|remove|void|refund|adjust|receive|transfer|import|fix names|merge|archive|duplicate|edit|change|apply|issue|hold|discount|complete|charge|pay now|close shift|open shift|print labels|reset|clear|publish|invite|send)\b/i;

  var SAFE_WORDS = /\b(history|print labels|columns?|filters?|sort|view|search|show|hide|export|print|download|refresh)\b/i;

  function blocked(el){
    if(!state.on || !el || !el.closest) return false;
    var o = state.opts || {};
    if(o.deny && el.closest(o.deny)) return true;
    if(el.closest(ALWAYS_ALLOW) || (o.allow && el.closest(o.allow))) return false;
    var b = el.closest(ACTION_SEL);
    if(!b) return false;
    if(b.matches(HARD_SEL) || el.closest(HARD_SEL)) return true;
    var label = (b.textContent || '').replace(/\s+/g, ' ').trim() || ((b.getAttribute('aria-label') || '') + ' ' + (b.getAttribute('title') || '')).trim();
    if(SAFE_WORDS.test(label) || (o.safeText && o.safeText.test(label))) return false;
    return DENY_WORDS.test(label);
  }

  function guard(e){
    if(!state.on) return;
    var t = e.target;
    if(e.type === 'keydown'){
      if(e.key !== 'Enter' && e.key !== ' ') return;
      if(!t || !t.closest || !t.closest('[role="button"],button,.btn-gold,.card,[data-act]')) return;
    }
    if(!blocked(t)) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    if(e.type === 'click' || e.type === 'keydown') say();
  }

  function enable(opts){
    opts = opts || {};
    if(state.on){ state.opts = Object.assign(state.opts || {}, opts); return; }
    state.on = true; state.kind = opts.kind || 'expired'; state.opts = opts;
    var st = document.createElement('style'); st.id = 'vo-style'; st.textContent = CSS; document.head.appendChild(st);
    var bar = document.createElement('div'); bar.id = 'vo-strip'; bar.setAttribute('role', 'status');
    bar.innerHTML = '<span><b></b> &middot; <span class="vo-tail"></span></span>';
    bar.querySelector('b').textContent = opts.text || (state.kind === 'trial' ? TRIAL_TEXT : EXPIRED_TEXT);
    bar.querySelector('.vo-tail').textContent = opts.storeMode ? 'Your subscription is managed from your account on the web' : TAIL;
    if(typeof opts.onSubscribe === 'function'){
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'vo-btn'; btn.textContent = 'Subscribe';
      btn.addEventListener('click', function(ev){ ev.stopPropagation(); opts.onSubscribe(); });
      bar.appendChild(btn);
    }
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('vo-on');
    function size(){ try{ document.documentElement.style.setProperty('--vo-h', bar.offsetHeight + 'px'); }catch(e){} }
    size(); window.addEventListener('resize', size); setTimeout(size, 300);
    ['click', 'submit', 'keydown'].forEach(function(ev){ document.addEventListener(ev, guard, true); });
    document.addEventListener('submit', function(e){ if(state.on && !(e.target.closest && e.target.closest('#authGate,#vo-strip'))){ e.preventDefault(); e.stopPropagation(); say(); } }, true);
    document.body.setAttribute('data-view-only', state.kind);
  }

  window.AureumViewOnly = { statusFrom: statusFrom, enable: enable, active: function(){ return state.on; }, blocked: blocked, TAIL: TAIL };
})();
