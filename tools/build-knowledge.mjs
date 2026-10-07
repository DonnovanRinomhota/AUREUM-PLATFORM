// Regenerates supabase/functions/help-agent/knowledge.ts from knowledge.md (Deno can't read the .md at run time).
// Run from anywhere:  node tools/build-knowledge.mjs
import fs from 'node:fs';
const dir = new URL('../supabase/functions/help-agent/', import.meta.url);
const md = fs.readFileSync(new URL('knowledge.md', dir), 'utf8');
fs.writeFileSync(new URL('knowledge.ts', dir), '// GENERATED from knowledge.md — edit knowledge.md, then run: node tools/build-knowledge.mjs\nexport const KNOWLEDGE = ' + JSON.stringify(md) + ';\n');
console.log('knowledge.ts rebuilt (' + md.split(/\s+/).length + ' words)');
