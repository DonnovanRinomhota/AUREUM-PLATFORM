import { SITE, NAV, APP, DEMO } from '../config.js';
import { esc, brand, logoMark, linkButton, tgt } from './ui.js';
import { productAccess } from './access.js';
import { icon } from './icons.js';

export const header = active => `<header class="site-header">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="wrap header-in">
    ${brand()}
    <span class="h-rule" aria-hidden="true"></span>
    <nav class="h-nav" aria-label="Main">${NAV.filter(n => n.id !== 'home').map(n => `<a href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}</nav>
  </div>
</header>`;

/* The floating bar at the bottom of every page: Explore opens the menu, and the trial is always one tap away. */
export const dock = active => `<div class="dock" role="region" aria-label="Quick navigation">
  <div class="dock-menu" id="dock-menu" hidden>
    <nav aria-label="Explore">${NAV.map(n => `<a href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}><span>${esc(n.label)}</span>${icon('ne', 13, 'ic')}</a>`).join('')}
      <a href="${APP.signIn}"${tgt(APP.signIn)}><span>Log in</span>${icon('ne', 13, 'ic')}</a></nav>
  </div>
  <div class="dock-bar">
    <a class="dock-brand" href="/" aria-label="AUREUM home">${logoMark()}</a>
    <button type="button" class="dock-explore" id="dock-btn" aria-expanded="false" aria-controls="dock-menu"><span>Explore</span>${icon('plus', 14, 'ic dock-plus')}</button>
    <a class="dock-login" href="${APP.signIn}"${tgt(APP.signIn)}>Log in</a>
    <a class="dock-cta" href="${APP.signUp}"${tgt(APP.signUp)}><span>Free trial</span>${icon('ne', 14, 'ic')}</a>
  </div>
</div>`;

export const footer = () => `<footer class="site-footer">
  <div class="wrap">
    <div class="footer-cols">
      <div class="f-brand">
        ${brand('brand-footer', false)}
      </div>
      <nav class="f-col" aria-label="Explore"><h2>Explore</h2><ul>${NAV.map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></nav>
      <nav class="f-col" aria-label="Product"><h2>Product</h2><ul>
        <li><a href="${APP.pos}"${tgt(APP.pos)}>POS Checkout</a></li><li><a href="${APP.backOffice}"${tgt(APP.backOffice)}>Back Office</a></li><li><a href="${APP.signIn}"${tgt(APP.signIn)}>Log in</a></li><li><a href="${APP.signUp}"${tgt(APP.signUp)}>Start free trial</a></li>
      </ul></nav>
      <nav class="f-col" aria-label="Legal"><h2>Legal</h2><ul>
        <li><a href="/terms/">Terms &amp; Conditions</a></li><li><a href="/privacy/">Privacy Policy</a></li><li><a href="/delete-account/">Delete your account</a></li>
      </ul></nav>
    </div>
    <div class="f-bottom"><p>&copy; ${new Date().getFullYear()} AUREUM. All rights reserved.</p><p>Made for the counter you work at.</p></div>
  </div>
</footer>`;

/* Watch Demo: shows the real video once DEMO.videoUrl is set; until then it says plainly that the demo is coming. */
export function demoDialog() {
  const url = DEMO.videoUrl.trim();
  const body = url
    ? `<div class="demo-video" data-video="${esc(url)}" data-title="${esc(DEMO.title)}"></div>`
    : `<div class="demo-soon"><p class="demo-badge">Coming soon</p><p>The AUREUM demo video isn't ready yet. You don't have to wait to see the product — start the free trial and try the real Back Office and POS.</p><div class="demo-actions">${linkButton({ label: 'Start Free Trial', href: APP.signUp, arrow: true })}${linkButton({ label: 'See the features', href: '/features/', kind: 'outline' })}</div></div>`;
  return `<dialog class="demo-dialog" id="demo-dialog" aria-labelledby="demo-title">
  <div class="demo-head"><h2 id="demo-title">${url ? 'Watch the AUREUM demo' : 'Watch Demo'}</h2><button type="button" class="demo-close" data-close-demo aria-label="Close">${icon('close', 22)}</button></div>
  ${body}
</dialog>`;
}

/* A short notice, shown until it is dismissed. The website sets no advertising or tracking cookies. */
export const cookieNotice = () => `<div class="cookie-note" id="cookie-note" role="region" aria-label="Cookies and privacy" hidden>
  <p>This website uses only the storage it needs to work, plus anonymous visit counts with no cookies and no advertising. <a href="/privacy/">Privacy Policy</a></p>
  <button type="button" class="gold-ring" id="cookie-ok">Got it</button>
</div>`;

export function page({ path, title, description, active, body, jsonLd = [], preload = [], assetV = '', noindex = false, scripts = [] }) {
  const url = SITE.url + path;
  const og = SITE.url + SITE.ogImage;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<meta name="theme-color" content="#06130e">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AUREUM">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="AUREUM POS and inventory management on a laptop, tablet and phone">
<meta property="og:locale" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${og}">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png">
<link rel="icon" type="image/png" sizes="96x96" href="/icons/favicon-96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/favicon-192.png">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" href="/vendor/fonts/outfit-latin-300-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/vendor/fonts/outfit-latin-400-normal.woff2" crossorigin>
${preload.map(p => `<link rel="preload" as="image" href="${p}" fetchpriority="high">`).join('\n')}
<link rel="stylesheet" href="/vendor/fonts/outfit.css">
<link rel="stylesheet" href="/vendor/fonts/fonts-serif.css">
<link rel="stylesheet" href="/vendor/fonts/montserrat.css">
<link rel="stylesheet" href="/site/assets/site.css?v=${assetV}">
<script>document.documentElement.classList.add('js')</script>
${path === '/' ? `<script>/* emailed sign-up / password-reset links may land here: pass them on to the Back Office with their tokens */if(/[#&](access_token|error_code|type=(recovery|signup|invite|magiclink|email_change))/.test(location.hash))location.replace('${'/app'}'+location.hash)</script>` : ''}
<noscript><style>.dock{display:none}.rv{opacity:1!important;transform:none!important}</style></noscript>
${jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
${header(active)}
${productAccess()}
<main id="main">
${body}
</main>
${footer()}
${dock(active)}
${cookieNotice()}
<script src="/site/assets/site.js?v=${assetV}" defer></script>
${scripts.map(f => `<script src="/site/assets/${f}?v=${assetV}" defer></script>`).join('\n')}
<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)}</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}
