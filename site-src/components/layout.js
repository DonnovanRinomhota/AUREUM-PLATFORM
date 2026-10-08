import { SITE, NAV, APP, DEMO } from '../config.js';
import { esc, brand, linkButton, flag, skyline } from './ui.js';
import { icon } from './icons.js';

export const header = active => `<header class="site-header">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="wrap header-in">
    ${brand()}
    <nav class="nav" aria-label="Main">${NAV.map(n => `<a href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}</nav>
    <div class="header-cta">
      <a class="login-link" href="${APP.signIn}">Log in</a>
      ${linkButton({ label: 'Free Trial', href: APP.signUp, size: 'sm' })}
    </div>
    <button type="button" class="menu-btn" id="menu-btn" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">${icon('menu', 26, 'ic menu-open')}${icon('close', 26, 'ic menu-close')}</button>
  </div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <nav aria-label="Mobile">${NAV.map(n => `<a href="${n.href}"${n.id === active ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('')}</nav>
    <div class="mm-actions">
      ${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'lg', arrow: true })}
      ${linkButton({ label: 'Log in', href: APP.signIn, kind: 'outline', size: 'lg' })}
      <div class="mm-row">${linkButton({ label: 'Open POS', href: APP.pos, kind: 'ghost', size: 'md' })}${linkButton({ label: 'Back Office', href: APP.backOffice, kind: 'ghost', size: 'md' })}</div>
    </div>
  </div>
</header>`;

export const footer = () => `<footer class="site-footer">
  <div class="wrap footer-cols">
    <div class="f-brand">
      ${brand('brand-footer')}
      <p class="f-desc">Point of sale and inventory management for Zimbabwean businesses.</p>
    </div>
    <nav class="f-col" aria-label="Footer navigation"><h2>Explore</h2><ul>${NAV.map(n => `<li><a href="${n.href}">${esc(n.label)}</a></li>`).join('')}</ul></nav>
    <nav class="f-col" aria-label="Product"><h2>Product</h2><ul>
      <li><a href="${APP.pos}">POS Checkout</a></li><li><a href="${APP.backOffice}">Back Office</a></li><li><a href="${APP.signIn}">Login</a></li><li><a href="${APP.signUp}">Start Free Trial</a></li>
    </ul></nav>
  </div>
  <div class="footer-statement">
    <div class="wrap fs-in">
      ${flag()}
      <span class="fs-rule" aria-hidden="true"></span>
      <p class="fs-line">Proudly powering <span class="gold">Zimbabwean</span> businesses</p>
      ${skyline()}
    </div>
  </div>
  <div class="wrap f-bottom"><p>&copy; ${new Date().getFullYear()} AUREUM. All rights reserved.</p></div>
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

export function page({ path, title, description, active, body, jsonLd = [], preload = [], assetV = '' }) {
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
<meta name="theme-color" content="#0A1B16">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AUREUM POS &amp; Inventory">
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
<link rel="icon" type="image/svg+xml" href="/icons/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" href="/vendor/fonts/fraunces-latin-600-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/vendor/fonts/inter-latin-400-normal.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/vendor/fonts/inter-latin-600-normal.woff2" crossorigin>
${preload.map(p => `<link rel="preload" as="image" href="${p}" fetchpriority="high">`).join('\n')}
<link rel="stylesheet" href="/vendor/fonts/fonts.css">
<link rel="stylesheet" href="/vendor/fonts/fonts-serif.css">
<link rel="stylesheet" href="/site/assets/site.css?v=${assetV}">
<script>document.documentElement.classList.add('js')</script>
${path === '/' ? `<script>/* emailed sign-up / password-reset links may land here: pass them on to the Back Office with their tokens */if(/[#&](access_token|error_code|type=(recovery|signup|invite|magiclink|email_change))/.test(location.hash))location.replace('${'/backoffice.html'}'+location.hash)</script>` : ''}
<noscript><style>.menu-btn{display:none}.mobile-menu[hidden]{display:block}.rv{opacity:1!important;transform:none!important}</style></noscript>
${jsonLd.map(j => `<script type="application/ld+json">${JSON.stringify(j)}</script>`).join('\n')}
</head>
<body>
${header(active)}
<main id="main">
${body}
</main>
${footer()}
${demoDialog()}
<script src="/site/assets/site.js?v=${assetV}" defer></script>
</body>
</html>
`;
}
