import { PRICING, FAQ_PRICING, APP } from '../config.js';
import { pageHero, ctaBand } from '../components/sections.js';
import { linkButton, ticks, faq } from '../components/ui.js';

export const pricing = {
  path: '/pricing/', file: 'pricing/index.html', active: 'pricing', software: true,
  title: 'Pricing | AUREUM POS & Inventory Management',
  description: `AUREUM costs $${PRICING.perShop} per shop, per month, with a ${PRICING.trialDays}-day free trial that includes every shop. All features are included.`,
  body: () => pageHero('PRICING', 'Simple, per-shop pricing', `$${PRICING.perShop} per shop, per month — with a ${PRICING.trialDays}-day free trial.`) + `
<section class="pricing-sec"><div class="wrap price-grid">
  <div class="plan rv">
    <p class="plan-name">AUREUM</p>
    <p class="plan-price"><span class="cur">$</span>${PRICING.perShop}</p>
    <p class="plan-unit">per shop, per month</p>
    ${ticks(['POS Checkout and Back Office', 'Inventory, purchasing and stock transfers', 'Shifts, refunds and receipts', 'Dashboard, reports and accounting', 'AUREUM Bot help and support tickets', 'All features included — there are no feature tiers'])}
    ${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'lg', arrow: true, extra: 'btn-block' })}
    <p class="plan-note">${PRICING.trialDays}-day free trial · every shop included · pay by card when you're ready</p>
  </div>
  <div class="price-side rv">
    <h2 class="side-title">What it costs for your shops</h2>
    <table class="price-table"><caption class="sr-only">Monthly price by number of shops</caption>
      <thead><tr><th scope="col">Shops</th><th scope="col">Per month</th></tr></thead>
      <tbody>${PRICING.examples.map(n => `<tr><th scope="row">${n} ${n === 1 ? 'shop' : 'shops'}</th><td>$${n * PRICING.perShop}</td></tr>`).join('')}</tbody>
    </table>
    <p class="small">Prices are in US dollars. The price is $${PRICING.perShop} multiplied by the number of shops you run.</p>
  </div>
</div></section>
<section class="faq-sec"><div class="wrap narrow"><h2 class="section-title with-rules"><span>Pricing questions</span></h2>${faq(FAQ_PRICING)}</div></section>` + ctaBand()
};
