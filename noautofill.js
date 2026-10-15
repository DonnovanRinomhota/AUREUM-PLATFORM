/* AUREUM — stops the browser from auto-filling or restoring stale text into the app's own boxes.
   Cause of the "Any date" bug: the date pickers' hidden Start/End boxes hold text like "Any date", and Chrome/Edge's
   form-restore/autofill copied that into unrelated boxes (product search, employee search, business name/phone, tax name).
   Login email/password fields keep their normal password-manager behaviour. It never changes layout. */
(function(){
  'use strict';
  var JUNK = /^(any date|\d{4}\/\d{2}\/\d{2})$/i;
  function isDateBox(el){ return el.readOnly || /(Start|End|Date)$/.test(el.id || '') || el.type === 'date'; }
  function protect(root){
    (root || document).querySelectorAll('input, textarea').forEach(function(el){
      var t = (el.type || '').toLowerCase();
      if(t === 'password' || t === 'hidden' || t === 'checkbox' || t === 'radio' || t === 'file' || t === 'button' || t === 'submit') return;
      if(el.hasAttribute('autocomplete') || (el.closest && el.closest('#authGate'))) return;
      el.setAttribute('autocomplete', 'off');
      el.setAttribute('data-lpignore', 'true'); el.setAttribute('data-1p-ignore', '');
    });
  }
  function scrub(){
    document.querySelectorAll('input[type=text], input[type=search], input[type=tel], textarea').forEach(function(el){
      if(isDateBox(el) || el === document.activeElement) return;
      if(JUNK.test(String(el.value || '').trim()) && !JUNK.test(String(el.defaultValue || '').trim())){
        el.value = el.defaultValue || '';
        try{ el.dispatchEvent(new Event('input', { bubbles: true })); }catch(e){}
      }
    });
  }
  function all(){ protect(); scrub(); }
  all();
  document.addEventListener('DOMContentLoaded', all);
  window.addEventListener('load', function(){ all(); setTimeout(all, 600); setTimeout(all, 2500); });
  window.addEventListener('pageshow', all);
  try{ new MutationObserver(function(m){ for(var i = 0; i < m.length; i++){ if(m[i].addedNodes.length){ protect(); return; } } }).observe(document.documentElement, { childList: true, subtree: true }); }catch(e){}
  window.AureumNoAutofill = { run: all };
})();
