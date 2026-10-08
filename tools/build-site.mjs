// Builds the public AUREUM website from site-src/ into plain static files at the project root.
//   node tools/build-site.mjs
// Output: index.html, features/, pricing/, about/, support/ (each with index.html), site/assets/site.css + site.js,
//         sitemap.xml, robots.txt.   Images live in site/assets/img/ (replace them by dropping new files with the same names).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { SITE, PRICING } from '../site-src/config.js';
import * as pages from '../site-src/pages/index.js';
import { page } from '../site-src/components/layout.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = f => path.join(ROOT, 'site-src', f), out = f => path.join(ROOT, f);
const write = (f, text) => { fs.mkdirSync(path.dirname(out(f)), { recursive: true }); fs.writeFileSync(out(f), text); };

// assets: copied as-is, referenced with a content hash so a changed file is never served stale
fs.mkdirSync(out('site/assets'), { recursive: true });
let assetV = crypto.createHash('sha1');
for (const f of ['site.css', 'site.js']) { const buf = fs.readFileSync(src('assets/' + f)); assetV.update(buf); fs.writeFileSync(out('site/assets/' + f), buf); }
assetV = assetV.digest('hex').slice(0, 8);

const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'AUREUM', url: SITE.url, logo: SITE.url + '/icons/icon-512.png', areaServed: { '@type': 'Country', name: 'Zimbabwe' } };
const web = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'AUREUM POS & Inventory', url: SITE.url };
const soft = { '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'AUREUM POS', applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser; installable on phone, tablet and computer', description: SITE.description, url: SITE.url, offers: { '@type': 'Offer', price: PRICING.perShop.toFixed(2), priceCurrency: 'USD', description: `Per shop, per month. ${PRICING.trialDays}-day free trial.` } };

const list = Object.values(pages);
for (const p of list) {
  const html = page({ path: p.path, title: p.title, description: p.description, active: p.active, body: p.body(), preload: p.preload || [], jsonLd: p.software ? [org, web, soft] : [org, web], assetV });
  write(p.file, html);
}
const today = new Date().toISOString().slice(0, 10);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map(p => `  <url><loc>${SITE.url}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /backoffice.html\nDisallow: /pos-checkout.html\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
console.log(`Website built: ${list.map(p => p.file).join(', ')}  (assets v=${assetV})`);
