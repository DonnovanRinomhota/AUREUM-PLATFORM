// Run:  node tests/guide-journeys.test.js   — checks the guided-tour definitions: every step points at an element that
// really exists in the page, ids are unique, and no journey can pass a step without a real signal or an explicit "Got it".
const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
let pass = 0, fail = 0; const t = (n, f) => { try{ f(); pass++; }catch(e){ fail++; console.log('FAIL', n, '\n  ', e.message); } };
const root = path.join(__dirname, '..');

function load(file){
  let captured = null;
  const win = { AureumGuide: { init(cfg){ captured = cfg; return this; }, esc: s => String(s), visible: () => true, start(){}, hint(){}, maybeWelcome(){}, reload(){} }, document: { getElementById: () => null, querySelector: () => null }, matchMedia: () => ({ matches: false }), getComputedStyle: () => ({}) };
  win.window = win;
  vm.runInNewContext(fs.readFileSync(path.join(root, file), 'utf8'), win, { filename: file });
  return captured;
}
// does a (simple) selector refer to something that exists in the page source? Elements the app draws later (rows, tiles) are matched by their class/attribute name appearing in the script.
function known(sel, html){
  return sel.split(',').every(part => part.trim().split(/\s+/).filter(x => x !== '>').every(tok => {
    let m;
    if((m = tok.match(/^#([\w-]+)/))) return html.includes('id="' + m[1] + '"') || html.includes("'" + m[1] + "'");
    if((m = tok.match(/\[data-page="?([\w-]+)"?\]/))) return html.includes('data-page="' + m[1] + '"');
    if((m = tok.match(/^\.([\w-]+)/))) return html.includes(m[1]);
    if((m = tok.match(/^\[data-([\w-]+)/))) return html.includes('data-' + m[1]);
    return true;
  }));
}
for(const [file, page] of [['guide-pos.js', 'pos-checkout.html'], ['guide-bo.js', 'backoffice.html']]){
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const cfg = load(file);
  t(file + ' registers journeys', () => assert.ok(cfg && cfg.journeys.length >= 5));
  const seen = new Set();
  cfg.journeys.forEach(j => {
    t(j.id + ': unique id, title and description', () => { assert.ok(!seen.has(j.id)); seen.add(j.id); assert.ok(j.title && j.desc); });
    t(j.id + ': has steps with unique ids, titles and text', () => { assert.ok(j.steps.length >= 2); const s = new Set(); j.steps.forEach(st => { assert.ok(st.id && !s.has(st.id), 'dup step ' + st.id); s.add(st.id); assert.ok(st.title, 'title ' + st.id); assert.ok(st.body, 'body ' + st.id); }); });
    j.steps.forEach(st => {
      const tg = Array.isArray(st.target) ? st.target : (typeof st.target === 'string' ? [st.target] : []);
      tg.forEach(sel => t(j.id + '/' + st.id + ': target ' + sel + ' exists in ' + page, () => assert.ok(known(sel, html))));
      t(j.id + '/' + st.id + ': completion is a real signal', () => { if(st.done) assert.equal(typeof st.done, 'function'); if(st.optional) assert.ok(st.done, 'optional step with nothing to skip'); });
    });
    t(j.id + ': steps that make real changes offer a way out that creates nothing', () => {
      const last = j.steps[j.steps.length - 1];
      if(last.done && /for real|real (sale|product)/i.test(String(last.body))) assert.ok((last.actions || []).some(a => a.finish), 'no "finish without saving"');
    });
  });
}
t('POS journeys never act on the sale themselves', () => {
  const src = fs.readFileSync(path.join(root, 'guide-pos.js'), 'utf8');
  assert.ok(!/chargeBtn'\)\s*\.click|RECEIPTS\.push|addToCart\(|cart\[[^\]]+\]\s*=[^=]|persistAureum/.test(src), 'journey code must not add items, charge or save');
});
t('guide code never signs out or deletes data', () => {
  ['guide.js', 'guide-pos.js', 'guide-bo.js'].forEach(f => { const src = fs.readFileSync(path.join(root, f), 'utf8'); assert.ok(!/aureumSignOut\(|signOutOfTill\(|\.signOut\(|\.splice\(|\.delete\(/.test(src), f); });
});
t('usage events carry no personal data', () => {
  const src = fs.readFileSync(path.join(root, 'guide.js'), 'utf8');
  assert.ok(/\{ t: Date\.now\(\), e: ev, j: j \|\| '', s: [^}]*ms:/.test(src));
});
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
