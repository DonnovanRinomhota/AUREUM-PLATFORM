/* AUREUM safety net for text that ends up on screen.
   Names, notes and descriptions typed by staff or customers are shown in lists and tables. This file makes sure such text can never
   run as code: whenever the app puts HTML on the page, scripts, inline event handlers (onclick=… onerror=…), "javascript:" links and
   embedding tags are removed first. Everything ordinary (bold, tables, images, styles) is untouched. Loaded before the app's own scripts. */
(function(){
  'use strict';
  if(window.__aureumSafeHtml) return; window.__aureumSafeHtml = true;
  var BAD_TAG = /^(script|iframe|frame|frameset|object|embed|applet|base|meta|link|noscript)$/i;
  var URL_ATTR = /^(href|src|action|formaction|xlink:href|data|poster|background|srcset|ping)$/i;
  var DANGEROUS_URL = /^(javascript|vbscript|livescript|data\s*:\s*text\/html)/i;
  // a quick look first: ordinary markup (almost everything) takes the fast path and is passed through unchanged
  var SUSPECT = /\bon[a-z]+\s*=|javascript\s*:|vbscript\s*:|<\s*(script|iframe|frame|object|embed|applet|base|meta|link|noscript)\b|srcdoc|(href|src|action|formaction|data|poster)\s*=\s*["']?[^"'>]*&(#|colon;|tab;|newline;)/i;
  var proto = Element.prototype;
  var innerDesc = Object.getOwnPropertyDescriptor(proto, 'innerHTML');
  var outerDesc = Object.getOwnPropertyDescriptor(proto, 'outerHTML');
  var insertAdj = proto.insertAdjacentHTML;
  if(!innerDesc || !innerDesc.set) return;
  function clean(html){
    html = String(html == null ? '' : html);
    if(!SUSPECT.test(html)) return html;
    var t = document.createElement('template');
    innerDesc.set.call(t, html);
    var all = t.content.querySelectorAll('*');
    for(var i = 0; i < all.length; i++){
      var el = all[i];
      if(BAD_TAG.test(el.tagName)){ if(el.parentNode) el.parentNode.removeChild(el); continue; }
      var attrs = Array.prototype.slice.call(el.attributes);
      for(var j = 0; j < attrs.length; j++){
        var n = attrs[j].name.toLowerCase(), v = attrs[j].value;
        if(n.indexOf('on') === 0){ if(!(n === 'onclick' && v.replace(/\s+/g, '') === 'event.stopPropagation()')) el.removeAttribute(attrs[j].name); continue; }
        if(n === 'srcdoc'){ el.removeAttribute(attrs[j].name); continue; }
        if(URL_ATTR.test(n) && DANGEROUS_URL.test(v.replace(/[\u0000-  ]+/g, ''))) el.removeAttribute(attrs[j].name);
      }
    }
    return innerDesc.get.call(t);
  }
  Object.defineProperty(proto, 'innerHTML', { configurable: true, enumerable: innerDesc.enumerable, get: innerDesc.get, set: function(v){ innerDesc.set.call(this, clean(v)); } });
  if(outerDesc && outerDesc.set) Object.defineProperty(proto, 'outerHTML', { configurable: true, enumerable: outerDesc.enumerable, get: outerDesc.get, set: function(v){ outerDesc.set.call(this, clean(v)); } });
  if(insertAdj) proto.insertAdjacentHTML = function(pos, html){ return insertAdj.call(this, pos, clean(html)); };
  window.AureumCleanHtml = clean;
})();
