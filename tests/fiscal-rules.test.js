// Run: node tests/fiscal-rules.test.js   (needs `tsc` on PATH: npm i -g typescript) — tests the admin status rules
const { execSync } = require('child_process'); const os = require('os'), path = require('path'), fs = require('fs');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'fr-'));
try{ execSync(`tsc --target es2020 --module commonjs --strict --skipLibCheck --outDir ${out} ${path.join(__dirname, '../supabase/functions/admin-manage/fiscal-rules.ts')}`, { stdio:'pipe' }); }
catch(e){ console.log('SKIP: tsc not available —', String(e.stderr || e.message).slice(0, 120)); process.exit(0); }
const { buildFiscalPatch } = require(path.join(out, 'fiscal-rules.js'));
let pass = 0, fail = 0; const ok = (n, c, x) => { if(c){ pass++; console.log('PASS', n); } else { fail++; console.log('FAIL', n, x === undefined ? '' : x); } };
const base = (o) => Object.assign({ id:'zw-zimra-fdms', status:'in_development', docs_verified:false, docs_reference:null, approval_reference:null, notes:null, docs_verified_at:null }, o || {});
const now = '2026-10-10T12:00:00Z';
const err = (fn) => { try{ fn(); return null; }catch(e){ return e.message; } };
ok('cannot jump in_development -> approved', /one step at a time/.test(err(() => buildFiscalPatch(base(), { status:'approved' }, true, now))));
ok('cannot jump disabled -> testing', /one step at a time/.test(err(() => buildFiscalPatch(base({ status:'disabled' }), { status:'testing', docs_verified:true, docs_reference:'x' }, true, now))));
ok('testing needs verified docs', /verified/.test(err(() => buildFiscalPatch(base(), { status:'testing' }, true, now))));
ok('testing needs a documentation reference', /Record which documentation/.test(err(() => buildFiscalPatch(base(), { status:'testing', docs_verified:true }, true, now))));
ok('testing ok with docs + reference (and stamps the date)', (() => { const p = buildFiscalPatch(base(), { status:'testing', docs_verified:true, docs_reference:'FDMS v7.2' }, false, now); return p.status === 'testing' && p.docs_verified_at === now; })());
const testing = base({ status:'testing', docs_verified:true, docs_reference:'FDMS v7.2', docs_verified_at:'2026-10-01T00:00:00Z' });
ok('approving needs super admin', /super admin/.test(err(() => buildFiscalPatch(testing, { status:'approved', approval_reference:'R1' }, false, now))));
ok('approving needs an approval reference', /approval/.test(err(() => buildFiscalPatch(testing, { status:'approved' }, true, now))));
ok('super admin can approve with reference', buildFiscalPatch(testing, { status:'approved', approval_reference:'ZIMRA-TEST-1' }, true, now).status === 'approved');
ok('can always step down', buildFiscalPatch(base({ status:'approved', docs_verified:true, docs_reference:'d', approval_reference:'r' }), { status:'disabled' }, false, now).status === 'disabled');
ok('un-verifying docs on a testing integration is refused', /lower its status/.test(err(() => buildFiscalPatch(testing, { docs_verified:false }, true, now))));
ok('unknown status refused', /Unknown/.test(err(() => buildFiscalPatch(base(), { status:'live' }, true, now))));
ok('empty change refused', /Nothing/.test(err(() => buildFiscalPatch(base(), {}, true, now))));
ok('overlong note refused', /too long/.test(err(() => buildFiscalPatch(base(), { notes:'x'.repeat(1001) }, true, now))));
ok('docs_verified must be boolean', /true or false/.test(err(() => buildFiscalPatch(base(), { docs_verified:'yes' }, true, now))));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
