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
    document.querySelectorAll('th').forEach(function(th){ if(!th.textContent.trim() && !th.querySelector('input,select,button')){ th.setAttribute('aria-label', 'Actions'); var sp = document.createElement('span'); sp.textContent = 'Actions'; sp.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;'; th.appendChild(sp); } });
    document.querySelectorAll('button, [role=button]').forEach(function(b){ if(!b.textContent.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title') && !b.querySelector('img[alt]')) b.setAttribute('aria-label', hum(b.id || b.className.split(' ')[0] || 'button')); });
  }
  var timer = null, again = function(){ clearTimeout(timer); timer = setTimeout(run, 400); };
  function start(){ try{ run(); new MutationObserver(again).observe(document.body, { childList: true, subtree: true }); }catch(e){} }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
