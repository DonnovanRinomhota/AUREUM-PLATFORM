/* AUREUM label printing engine — barcode encoders (Code 128, EAN-13, UPC-A, EAN-8), label templates and the printable page builder.
   No dependencies. Works in the browser (window.AureumLabels) and in Node (module.exports) so it can be tested.
   Barcodes are drawn as vector SVG at an exact module width in millimetres, so they print sharp on any printer. */
(function(root){
  'use strict';

  /* ------------------------------------------------------------------ Code 128 */
  // Bar/space widths of the 106 symbols (6 digits: bar, space, bar, space, bar, space) and the stop pattern (7 digits).
  var C128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 ' +
    '221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 ' +
    '231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 ' +
    '314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
    '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 ' +
    '114131 311141 411131 211412 211214 211232').split(' ');
  var C128_STOP = '2331112';
  var START_A = 103, START_B = 104, START_C = 105, CODE_A = 101, CODE_B = 100, CODE_C = 99;

  function bitsFromWidths(w){            // "212222" -> "11011001100"
    var out = '', bar = true;
    for(var i = 0; i < w.length; i++){ out += (bar ? '1' : '0').repeat(+w[i]); bar = !bar; }
    return out;
  }

  /* Encodes ASCII 32–126 (set B) and digit pairs (set C). Long digit runs switch to set C so numeric codes are short and easy to scan. */
  function code128Symbols(text){
    var s = String(text), i, vals = [];
    var digitRun = function(from){ var n = 0; while(from + n < s.length && s.charCodeAt(from + n) >= 48 && s.charCodeAt(from + n) <= 57) n++; return n; };
    var mode = null, pos = 0;
    var run0 = digitRun(0);
    if(run0 === s.length && s.length >= 2 || run0 >= 4){ mode = 'C'; vals.push(START_C); }
    else { mode = 'B'; vals.push(START_B); }
    while(pos < s.length){
      if(mode === 'C'){
        var r = digitRun(pos);
        if(r >= 2){ vals.push(+s.substr(pos, 2)); pos += 2; continue; }
        vals.push(CODE_B); mode = 'B'; continue;
      }
      // set B: switch to C when a run of 4+ digits begins
      var run = digitRun(pos);
      if(run >= 4){
        if(run % 2 === 1){ vals.push(s.charCodeAt(pos) - 32); pos++; }   // odd run: first digit stays in B so the rest pair up
        vals.push(CODE_C); mode = 'C'; continue;
      }
      vals.push(s.charCodeAt(pos) - 32); pos++;
    }
    var sum = vals[0];
    for(i = 1; i < vals.length; i++) sum += vals[i] * i;
    vals.push(sum % 103);
    return vals;
  }
  function code128Bits(text){
    var vals = code128Symbols(text), bits = '';
    vals.forEach(function(v){ bits += bitsFromWidths(C128[v]); });
    return bits + bitsFromWidths(C128_STOP);
  }

  /* ------------------------------------------------------------------ EAN / UPC */
  var L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
  var G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
  var PAR = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  var Rr = L.map(function(x){ return x.replace(/[01]/g, function(c){ return c === '1' ? '0' : '1'; }); });

  function eanCheck(d){                 // d = digits WITHOUT the check digit (7, 11 or 12 digits)
    var sum = 0, n = d.length;
    for(var i = 0; i < n; i++){ var v = +d[n - 1 - i]; sum += (i % 2 === 0) ? v * 3 : v; }
    return String((10 - (sum % 10)) % 10);
  }
  function validEan(digits, len){ return new RegExp('^\\d{' + len + '}$').test(digits) && eanCheck(digits.slice(0, len - 1)) === digits[len - 1]; }
  function ean13Bits(d){                // d = 13 valid digits
    var par = PAR[+d[0]], bits = '101', i;
    for(i = 1; i <= 6; i++) bits += (par[i - 1] === 'L' ? L : G)[+d[i]];
    bits += '01010';
    for(i = 7; i <= 12; i++) bits += Rr[+d[i]];
    return bits + '101';
  }
  function ean8Bits(d){
    var bits = '101', i;
    for(i = 0; i < 4; i++) bits += L[+d[i]];
    bits += '01010';
    for(i = 4; i < 8; i++) bits += Rr[+d[i]];
    return bits + '101';
  }

  /* ------------------------------------------------------------------ choosing a barcode for a value */
  var MAX_LEN = 80;                      // same limit as other POS label printers; ≤ 18 characters is recommended
  function checkValue(v){
    v = String(v == null ? '' : v);
    if(!v.trim()) return { ok:false, reason:'empty' };
    if(v.length > MAX_LEN) return { ok:false, reason:'too long (max ' + MAX_LEN + ' characters)' };
    for(var i = 0; i < v.length; i++){ var c = v.charCodeAt(i); if(c < 32 || c > 126) return { ok:false, reason:'has characters a barcode cannot hold (use digits, English letters and basic symbols)' }; }
    return { ok:true };
  }
  /* kind: 'auto' (EAN-13 / UPC-A / EAN-8 when the number is a valid one, otherwise Code 128) or 'code128' */
  function makeBarcode(value, kind){
    var v = String(value == null ? '' : value).trim(), chk = checkValue(v);
    if(!chk.ok) return { ok:false, error:chk.reason, value:v };
    var type = 'code128', bits, text = v, qL = 10, qR = 10;
    if(kind !== 'code128'){
      if(validEan(v, 13)){ type = 'ean13'; bits = ean13Bits(v); qL = 11; qR = 7; }
      else if(validEan(v, 12)){ type = 'upca'; bits = ean13Bits('0' + v); qL = 9; qR = 9; }
      else if(validEan(v, 8)){ type = 'ean8'; bits = ean8Bits(v); qL = 7; qR = 7; }
    }
    if(!bits) bits = code128Bits(v);
    return { ok:true, type:type, value:v, text:text, bits:bits, modules:bits.length, quietL:qL, quietR:qR, total:bits.length + qL + qR };
  }
  /* Our own in-store numbers: EAN-13 starting with 2 (reserved worldwide for in-store use, so it never clashes with a manufacturer's code). */
  function makeInternalEan(serial){
    var body = '2' + String(serial).padStart(11, '0').slice(-11);
    return body + eanCheck(body);
  }

  function svgOf(bc, hMm, moduleMm){
    var w = bc.total * moduleMm, d = '', i = 0, x = bc.quietL;
    var bits = bc.bits;
    while(i < bits.length){
      if(bits[i] === '1'){ var j = i; while(j < bits.length && bits[j] === '1') j++; d += 'M' + (x + i) + ' 0h' + (j - i) + 'v1h-' + (j - i) + 'z'; i = j; } else i++;
    }
    return '<svg class="bc" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + bc.total + ' 1" preserveAspectRatio="none" shape-rendering="crispEdges" ' +
      'style="width:' + r3(w) + 'mm;height:' + r3(hMm) + 'mm" role="img" aria-label="Barcode ' + esc(bc.value) + '"><path d="' + d + '" fill="#000"/></svg>';
  }

  /* ------------------------------------------------------------------ templates */
  function roll(id, name, w, h, cols, gx){ return { id:id, group:'Roll labels', name:name, kind:'roll', labelW:w, labelH:h, cols:cols || 1, gapX:gx || 0, pageW:(cols || 1) * w + ((cols || 1) - 1) * (gx || 0), pageH:h, rows:1, marginL:0, marginT:0, pitchX:w + (gx || 0), pitchY:h }; }
  function sheet(id, name, pw, ph, w, h, cols, rows, ml, mt, px, py){ return { id:id, group: pw > 200 && pw < 212 ? 'A4 sheets' : 'Letter sheets', name:name, kind:'sheet', labelW:w, labelH:h, cols:cols, rows:rows, pageW:pw, pageH:ph, marginL:ml, marginT:mt, pitchX:px, pitchY:py, gapX:px - w, per: cols * rows }; }
  var TEMPLATES = [
    roll('roll-58x40', '58 × 40 mm', 58, 40), roll('roll-50x30', '50 × 30 mm', 50, 30), roll('roll-40x30', '40 × 30 mm', 40, 30),
    roll('roll-40x20', '40 × 20 mm', 40, 20), roll('roll-38x25', '38 × 25 mm', 38, 25), roll('roll-30x20', '30 × 20 mm', 30, 20),
    roll('roll2-40x25', '2 across · 40 × 25 mm each (roll 84 mm wide)', 40, 25, 2, 4), roll('roll3-32x20', '3 across · 32 × 20 mm each (roll 104 mm wide)', 32, 20, 3, 4),
    sheet('a4-65', '65 per sheet · 38.1 × 21.2 mm (5 × 13)', 210, 297, 38.1, 21.2, 5, 13, 4.65, 10.7, 40.64, 21.2),
    sheet('a4-40', '40 per sheet · 45.7 × 25.4 mm (4 × 10)', 210, 297, 45.7, 25.4, 4, 10, 8.4, 21.4, 48.3, 25.4),
    sheet('a4-24', '24 per sheet · 63.5 × 33.9 mm (3 × 8)', 210, 297, 63.5, 33.9, 3, 8, 7.2, 12.9, 66.0, 33.9),
    sheet('a4-21', '21 per sheet · 63.5 × 38.1 mm (3 × 7)', 210, 297, 63.5, 38.1, 3, 7, 7.2, 15.1, 66.0, 38.1),
    sheet('a4-14', '14 per sheet · 99.1 × 38.1 mm (2 × 7)', 210, 297, 99.1, 38.1, 2, 7, 4.65, 15.1, 101.6, 38.1),
    sheet('a4-8', '8 per sheet · 99.1 × 67.7 mm (2 × 4)', 210, 297, 99.1, 67.7, 2, 4, 4.65, 13, 101.6, 67.7),
    sheet('letter-30', '30 per sheet · 66.7 × 25.4 mm (3 × 10)', 215.9, 279.4, 66.675, 25.4, 3, 10, 4.76, 12.7, 69.85, 25.4),
    { id:'custom', group:'Custom', name:'Custom size…', kind:'custom' }
  ];
  function templateById(id){ for(var i = 0; i < TEMPLATES.length; i++) if(TEMPLATES[i].id === id) return TEMPLATES[i]; return null; }
  /* Turns the "Custom size" boxes into a template. Everything in millimetres. */
  function customTemplate(c){
    var n = function(v, d){ v = parseFloat(v); return isFinite(v) && v > 0 ? v : d; };
    var w = n(c.w, 50), h = n(c.h, 30), cols = Math.max(1, Math.round(n(c.cols, 1))), rows = Math.max(1, Math.round(n(c.rows, 1)));
    var gx = Math.max(0, parseFloat(c.gapX) || 0), gy = Math.max(0, parseFloat(c.gapY) || 0), ml = Math.max(0, parseFloat(c.marginL) || 0), mt = Math.max(0, parseFloat(c.marginT) || 0);
    var sheetMode = c.mode === 'sheet';
    if(!sheetMode){ rows = 1; gy = 0; ml = 0; mt = 0; }
    var pageW = sheetMode ? n(c.pageW, 210) : cols * w + (cols - 1) * gx, pageH = sheetMode ? n(c.pageH, 297) : h;
    return { id:'custom', group:'Custom', name:'Custom ' + w + ' × ' + h + ' mm', kind: sheetMode ? 'sheet' : 'roll', labelW:w, labelH:h, cols:cols, rows:rows, gapX:gx, marginL:ml, marginT:mt, pitchX:w + gx, pitchY:h + gy, pageW:pageW, pageH:pageH, per: cols * rows };
  }
  function perPage(t){ return (t.cols || 1) * (t.rows || 1); }
  /* Does the custom grid actually fit the page? (so the person is told instead of getting cut-off labels) */
  function gridFits(t){
    var needW = t.marginL + (t.cols - 1) * t.pitchX + t.labelW, needH = t.marginT + (t.rows - 1) * t.pitchY + t.labelH;
    return { ok: needW <= t.pageW + 0.01 && needH <= t.pageH + 0.01, needW: needW, needH: needH };
  }

  /* ------------------------------------------------------------------ one label's inside */
  function r3(n){ return Math.round(n * 1000) / 1000; }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  var PT = 0.3528;                       // 1 pt in mm
  var STEP = 0.125;                      // 1 printer dot at 203 dpi — a module width in whole dots prints crisply
  var MIN_MODULE = 0.19;                 // narrower than this often will not scan

  /* Lays the label out. Returns the pieces in order with their sizes, plus any warnings. */
  function planLabel(t, item, o){
    var W = t.labelW, H = t.labelH, pad = Math.max(1, Math.min(2.2, Math.min(W, H) * 0.06));
    var innerW = W - 2 * pad, innerH = H - 2 * pad, warn = [];
    var scale = 1, bc = item.barcode && item.barcode.ok ? item.barcode : null, tries = 0, out;
    while(true){
      var nameFs = Math.max(2.3, Math.min(3.6, H * 0.105)) * scale, priceFs = Math.max(3.2, Math.min(6, H * 0.17)) * scale, txtFs = Math.max(2.0, Math.min(2.8, H * 0.075)) * scale;
      var lines = (o.showName && item.name) ? (H >= 24 && tries < 1 ? 2 : 1) : 0;
      var nameH = lines ? lines * nameFs * 1.18 : 0, priceH = o.showPrice ? priceFs * 1.15 : 0, txtH = (bc && o.showCode) ? txtFs * 1.2 : 0;
      var gaps = ((lines ? 1 : 0) + (priceH ? 1 : 0)) * 0.5;
      var bcH = bc ? innerH - nameH - priceH - txtH - gaps : 0;
      out = { pad:pad, innerW:innerW, innerH:innerH, nameFs:nameFs, priceFs:priceFs, txtFs:txtFs, lines:lines, nameH:nameH, priceH:priceH, txtH:txtH, bcH:bcH, scale:scale };
      if(!bc || bcH >= Math.min(8, H * 0.32) || tries >= 4) break;
      tries++; scale *= 0.88;
    }
    if(bc){
      var mm = Math.floor((innerW / bc.total) / STEP) * STEP;
      if(mm < STEP){ mm = innerW / bc.total; }
      out.moduleMm = Math.min(mm, 0.5);
      out.bcW = bc.total * out.moduleMm;
      if(out.moduleMm < MIN_MODULE) warn.push('code ' + bc.value + ' is long for this label — the bars are very thin and may not scan');
      if(out.bcH < 5) { warn.push('label is too small for the chosen items'); out.bcH = Math.max(out.bcH, 3); }
      out.bcH = Math.min(out.bcH, Math.max(8, H * 0.5) * 1.6);
    }
    out.warn = warn;
    return out;
  }

  function labelHtml(t, item, o, geom){
    var p = planLabel(t, item, o), parts = '';
    if(p.lines) parts += '<div class="nm" style="font-size:' + r3(p.nameFs) + 'mm;line-height:1.18;max-height:' + r3(p.nameH) + 'mm;-webkit-line-clamp:' + p.lines + ';line-clamp:' + p.lines + '">' + esc(item.name) + '</div>';
    if(item.barcode && item.barcode.ok){
      parts += '<div class="bw">' + svgOf(item.barcode, p.bcH, p.moduleMm) + (o.showCode ? '<div class="tx" style="font-size:' + r3(p.txtFs) + 'mm;height:' + r3(p.txtH) + 'mm;line-height:' + r3(p.txtH) + 'mm">' + esc(item.barcode.text) + '</div>' : '') + '</div>';
    }
    if(o.showPrice) parts += '<div class="pr" style="font-size:' + r3(p.priceFs) + 'mm">' + esc(item.priceText || '') + '</div>';
    var pos = geom ? 'left:' + r3(geom.x) + 'mm;top:' + r3(geom.y) + 'mm;' : '';
    return '<div class="lb" style="' + pos + 'width:' + r3(t.labelW) + 'mm;height:' + r3(t.labelH) + 'mm;padding:' + r3(p.pad) + 'mm">' + parts + '</div>';
  }

  /* ------------------------------------------------------------------ the printable document */
  /* items: [{ name, priceText, barcode (from makeBarcode) , qty }]
     o: { template, showName, showPrice, showCode, offsetX, offsetY, startAt, maxPages, previewWidth (px, screen only), title }  → { html, pages, labels, warnings } */
  function buildDocument(items, o){
    var t = o.template, per = perPage(t), start = Math.max(1, Math.round(o.startAt || 1)) - 1;
    if(t.kind === 'roll') start = 0;
    var flat = [], warnings = [], seenWarn = {};
    items.forEach(function(it){
      var q = Math.max(0, Math.floor(+it.qty || 0));
      for(var i = 0; i < q; i++) flat.push(it);
      if(q){ var p = planLabel(t, it, o); p.warn.forEach(function(w){ if(!seenWarn[w]){ seenWarn[w] = 1; warnings.push(w); } }); }
    });
    var total = flat.length, slots = start + total, pages = total ? Math.ceil(slots / per) : 0;
    var shownPages = o.maxPages ? Math.min(pages, o.maxPages) : pages;
    var ox = +o.offsetX || 0, oy = +o.offsetY || 0, html = '', n = 0;
    for(var pg = 0; pg < shownPages; pg++){
      var inner = '';
      for(var s = 0; s < per; s++){
        var idx = pg * per + s - start;
        if(idx < 0 || idx >= total) continue;
        var col = s % t.cols, row = Math.floor(s / t.cols);
        inner += labelHtml(t, flat[idx], o, { x: t.marginL + col * t.pitchX + ox, y: t.marginT + row * t.pitchY + oy });
        n++;
      }
      html += '<section class="pg" style="width:' + r3(t.pageW) + 'mm;height:' + r3(t.pageH) + 'mm">' + inner + '</section>';
    }
    var zoom = Math.round(Math.max(0.25, Math.min(3, (o.previewWidth || 560) / (t.pageW * 3.7795))) * 100) / 100;   // fit the preview pane
    var css = '@page{size:' + r3(t.pageW) + 'mm ' + r3(t.pageH) + 'mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}' +
      'body{font-family:Arial,Helvetica,sans-serif;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      '.pg{position:relative;overflow:hidden;background:#fff;break-after:page;page-break-after:always}.pg:last-child{break-after:auto;page-break-after:auto}' +
      '.lb{position:absolute;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:.5mm}' +
      '.nm{width:100%;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;overflow-wrap:anywhere}' +
      '.bw{display:flex;flex-direction:column;align-items:center;max-width:100%}.bc{display:block;max-width:100%}' +
      '.tx{font-family:"Courier New",monospace;letter-spacing:.02em;white-space:nowrap;text-align:center}' +
      '.pr{font-weight:800;white-space:nowrap}' +
      '@media screen{body{background:#d8d8d4;padding:14px 0}.pg{margin:0 auto 14px;box-shadow:0 1px 6px rgba(0,0,0,.35);zoom:' + zoom + '}.lb{outline:.1mm dashed #bbb;outline-offset:-.1mm}}' +
      '@media print{body{padding:0}.lb{outline:none}}';
    var more = pages > shownPages ? '<p style="font:13px Arial;text-align:center;color:#444;margin:6px">Preview shows the first ' + shownPages + ' of ' + pages + ' pages. Everything prints.</p>' : '';
    var empty = !total ? '<p style="font:14px Arial;text-align:center;color:#444;padding:30px">Add products and quantities to see the labels.</p>' : '';
    var doc = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + esc(o.title || 'AUREUM labels') + '</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + '</style></head><body>' + html + more + empty + '</body></html>';
    return { html: doc, pages: pages, labels: total, shownPages: shownPages, warnings: warnings, labelsOnPreview: n };
  }

  var api = {
    code128Symbols: code128Symbols, code128Bits: code128Bits, ean13Bits: ean13Bits, ean8Bits: ean8Bits, eanCheck: eanCheck, validEan: validEan,
    makeBarcode: makeBarcode, makeInternalEan: makeInternalEan, checkValue: checkValue, svgOf: svgOf,
    TEMPLATES: TEMPLATES, templateById: templateById, customTemplate: customTemplate, perPage: perPage, gridFits: gridFits,
    planLabel: planLabel, buildDocument: buildDocument, MAX_LEN: MAX_LEN, _tables:{ C128: C128, C128_STOP: C128_STOP }
  };
  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AureumLabels = api;
})(typeof window !== 'undefined' ? window : globalThis);
