import { APP } from '../config.js';
import { pageHero } from '../components/sections.js';
import { linkButton } from '../components/ui.js';

export const notFound = {
  path: '/404', file: '404.html', active: '', noindex: true, noSitemap: true,
  title: 'Page not found | AUREUM POS & Inventory Management',
  description: 'This page could not be found.',
  body: () => pageHero('ERROR 404', 'This page<br><span class="dim">could not be found.</span>', 'The link may be old or mistyped. Here are the places most people are looking for.') + `
<section class="panel dark"><div class="wrap"><div class="hero-btns">
  ${linkButton({ label: 'Back to home', href: '/', kind: 'gold', size: 'lg', arrow: true })}
  ${linkButton({ label: 'Features', href: '/features/', kind: 'outline', size: 'lg', extra: 'btn-goldline' })}
  ${linkButton({ label: 'Pricing', href: '/pricing/', kind: 'outline', size: 'lg', extra: 'btn-goldline' })}
  ${linkButton({ label: 'Log in', href: APP.signIn, kind: 'outline', size: 'lg', extra: 'btn-goldline' })}
</div></div></section>`
};
