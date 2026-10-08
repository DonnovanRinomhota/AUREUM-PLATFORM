import { SITE } from '../config.js';
import { pageHero, ctaBand } from '../components/sections.js';
import { icon } from '../components/icons.js';
import { esc } from '../components/ui.js';

const PRINCIPLES = [
  { icon: 'clock', title: 'Made for real shop days', text: 'Every cashier works in their own shift, the drawer is counted at the end, receipts match the till, and refunds are done item by item.' },
  { icon: 'cloud', title: "Works when the connection doesn't", text: 'The till keeps selling without internet. Sales are kept on the device and sync automatically when the connection comes back.' },
  { icon: 'shieldCheck', title: 'Records you can rely on', text: 'Saves that would delete your data are refused, restore points are kept, and every sale stays on record.' },
  { icon: 'store', title: 'One account, several shops', text: 'Stock, shifts and sales are kept for each shop, and you can look at one shop or all of them together.' }
];

export const about = {
  path: '/about/', file: 'about/index.html', active: 'about',
  title: `About | ${SITE.titleSuffix}`,
  description: 'AUREUM is a point of sale and inventory management platform that helps you manage sales, stock, staff and reports across one or more shops.',
  body: () => pageHero('ABOUT AUREUM', 'Point Of Sale System &amp; Inventory Management System for smoother business flow') + `
<section class="about-sec"><div class="wrap narrow prose rv">
  <h2>What AUREUM is</h2>
  <p>AUREUM is a point of sale and inventory management platform that helps you manage your business. At the counter it is a fast POS that works on a phone, tablet or laptop. Behind the counter, the Back Office tracks stock for every shop, records purchases and deliveries, manages staff and shifts, and turns each day's sales into clear reports.</p>
  <h2>Where it runs</h2>
  <p>AUREUM runs in a web browser and can be installed like an app on phones, tablets and computers. Sign in once and your business is available on every device you use.</p>
  <h2>Flexible payments and currencies</h2>
  <p>AUREUM supports an optional second currency, with an exchange rate you set, and records how each sale was paid: cash, card, mobile money or other payment types.</p>
</div></section>
<section class="principles"><div class="wrap">
  <h2 class="section-title">How AUREUM is built</h2>
  <div class="fg-grid fg-4">${PRINCIPLES.map(p => `<article class="fg-card rv"><span class="ic-ring">${icon(p.icon, 24)}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join('')}</div>
</div></section>` + ctaBand()
};
