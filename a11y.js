/* AUREUM accessibility helper — gives every screen-reader/keyboard user the names and landmarks the screens already imply.
   It only ADDS attributes (aria-label, role, tabindex); it never changes how anything looks or works. */
(function(){
  'use strict';
  var hum = function(s){ return String(s || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^(st|fx|rcp|rep|acct|sp|po|gr|sa|tr|cu|em)\s+/i, '').trim(); };
  function nameFor(el){
    if(el.classList && el.classList.contains('pg-size-select')) return 'Rows per page';
    if(el.id){ var l = document.querySelector('label[for="' + el.id.replace(/"/g, '') + '"]'); if(l && l.textContent.trim()) return l.textContent.trim(); }
    var lab = el.closest('label'); if(lab){ var t = lab.textContent.replace(/\s+/g, ' ').trim(); if(t) return t; }
    if(el.title) return el.title;
    if(el.placeholder) return el.placeholder;
    // the closest label-like text before the control inside the same field wrapper
    var wrap = el.closest('.field, .form-row, .modal-row, .row, .setting, .st-row, .fld, .form-group, .filter, div');
    for(var hop = 0; wrap && hop < 3; hop++, wrap = wrap.parentElement){
      var cand = wrap.querySelector(':scope > .lbl, :scope > .field-label, :scope > label, :scope > .label, :scope > .modal-label, :scope > span, :scope > .name');
      if(cand && !cand.contains(el) && cand.textContent.trim().length && cand.textContent.trim().length < 60) return cand.textContent.replace(/\s+/g, ' ').trim();
      var prev = el.previousElementSibling; if(prev && !prev.querySelector('input,select,textarea') && prev.textContent.trim().length && prev.textContent.trim().length < 60) return prev.textContent.replace(/\s+/g, ' ').trim();
    }
    var o = el.tagName === 'SELECT' && el.options && el.options[0] ? el.options[0].text.trim() : '';
    if(o && o.length < 40) return o;
    return hum(el.id || el.name || el.type || 'field');
  }
  function run(){
    runControls();
    var main = document.querySelector('.main'); if(main){ if(!main.getAttribute('role')) main.setAttribute('role', 'main'); if(!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '0'); }
    var side = document.querySelector('.sidebar, .side'); if(side && !side.getAttribute('role')) { side.setAttribute('role', 'navigation'); if(!side.getAttribute('aria-label')) side.setAttribute('aria-label', 'Main menu'); }
    if(!document.querySelector('h1')){ document.querySelectorAll('.page-title').forEach(function(t){ if(!t.getAttribute('role')){ t.setAttribute('role', 'heading'); t.setAttribute('aria-level', '1'); } }); }
    document.querySelectorAll('.table-panel').forEach(function(p){ if(!p.hasAttribute('tabindex')) p.setAttribute('tabindex', '0'); });
    document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea, input[type=checkbox], input[type=radio]').forEach(function(el){
      if(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return;
      if(el.classList.contains('pg-size-select')){ el.setAttribute('aria-label', 'Rows per page'); return; }
      var hasLabel = (el.id && document.querySelector('label[for="' + el.id.replace(/"/g, '') + '"]')) || el.closest('label'); if(hasLabel && hasLabel.textContent.trim()) return;
      var n = nameFor(el); if(n) el.setAttribute('aria-label', n);
    });
    document.querySelectorAll('th').forEach(function(th){ if(!th.textContent.trim() && !th.querySelector('input,select,button')){ th.setAttribute('aria-label', 'Actions'); var sp = document.createElement('span'); sp.textContent = 'Actions'; sp.style.cssText = 'position:absolute;left:0;top:0;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;'; th.appendChild(sp); } });
    document.querySelectorAll('button, [role=button]').forEach(function(b){ if(!b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title') && !b.querySelector('img[alt]')) b.setAttribute('aria-label', hum(b.id || b.className.split(' ')[0] || 'button')); });
  }
  /* custom switches and click-only controls: give them a role, a name, their on/off state and Space/Enter keyboard use */
  var CLICKY = '.nav-item, .pay-btn, .modal-btn, .pg-btn, .quick-chip, .ticket-icon-btn, .seg-btn, .tender-chip, .btn-ghost-sm, .modal-close';
  function switchName(sw){
    if(sw.getAttribute('aria-label') || sw.getAttribute('aria-labelledby')) return;
    var row = sw.closest('.toggle-row, .st-row, .setting, .row, label') || sw.parentElement, n = '';
    if(row){ var l = row.querySelector('.lbl, .name, label, .t, .title'); if(l && !l.contains(sw)) n = l.textContent.replace(/\s+/g, ' ').trim(); }
    if(!n){ var p = sw.previousElementSibling; if(p && !p.querySelector('.switch')) n = p.textContent.replace(/\s+/g, ' ').trim(); }
    if(n && n.length < 90) sw.setAttribute('aria-label', n); else sw.setAttribute('aria-label', hum(sw.id || 'switch'));
  }
  function runControls(){
    document.querySelectorAll('.switch').forEach(function(sw){
      if(!sw.getAttribute('role')) sw.setAttribute('role', 'switch');
      if(!sw.hasAttribute('tabindex')) sw.setAttribute('tabindex', '0');
      sw.setAttribute('aria-checked', sw.classList.contains('on') ? 'true' : 'false');
      switchName(sw);
    });
    document.querySelectorAll(CLICKY).forEach(function(el){
      if(el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role')) return;
      el.setAttribute('role', el.classList.contains('nav-item') ? 'link' : 'button');
      if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if(!el.getAttribute('aria-label') && !el.textContent.trim() && el.title) el.setAttribute('aria-label', el.title);
    });
  }
  document.addEventListener('keydown', function(e){
    if(e.key !== ' ' && e.key !== 'Enter') return;
    var t = e.target; if(!t || !t.matches || !t.matches('.switch, ' + CLICKY) || t.tagName === 'BUTTON' || t.tagName === 'A') return;
    e.preventDefault(); t.click();
  });
  document.addEventListener('click', function(){ setTimeout(function(){ try{ runControls(); }catch(e){} }, 0); }, true);
  var timer = null, again = function(){ clearTimeout(timer); timer = setTimeout(run, 400); };
  function start(){ try{ run(); new MutationObserver(again).observe(document.body, { childList: true, subtree: true }); }catch(e){} }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
