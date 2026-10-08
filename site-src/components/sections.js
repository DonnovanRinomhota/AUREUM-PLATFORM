import { HERO, BUILT_FOR, OFFER, STEPS, APP, PRICING, SHOWCASE, FEATURE_GROUPS } from '../config.js';
import { esc, linkButton, actionButton, eyebrow, ticks } from './ui.js';
import { icon } from './icons.js';
import { heroDevices, deviceByKey } from './devices.js';

export const hero = () => `<section class="hero" aria-labelledby="hero-title">
  <img class="hero-bg" src="/site/assets/img/hero-bg.webp" width="1920" height="900" alt="" fetchpriority="high" decoding="async">
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="hero-eyebrow"><span class="rule"></span>${esc(HERO.eyebrow)}</p>
      <h1 id="hero-title" class="hero-title"><span class="ln">${esc(HERO.headline[0])}</span> <span class="ln">System and <span class="gold">Inventory</span></span> <span class="ln gold">${esc(HERO.headline[2])}</span></h1>
      ${HERO.intro.map(p => `<p class="hero-intro">${esc(p)}</p>`).join('')}
      <ul class="badges">${HERO.badges.map(b => `<li>${icon(b.icon, 26)}<span>${esc(b.text)}</span></li>`).join('')}</ul>
      <div class="hero-cta">
        ${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'lg', arrow: true })}
        ${actionButton({ label: 'Watch Demo', kind: 'outline', size: 'lg', iconName: 'play', attrs: 'data-open-demo aria-haspopup="dialog"' })}
      </div>
    </div>
    ${heroDevices()}
  </div>
</section>`;

export const productAccess = () => `<section class="access" aria-label="Open the AUREUM application">
  <div class="wrap access-in">
    <p class="access-text">Already on AUREUM?</p>
    <div class="access-links">
      ${linkButton({ label: 'Log in', href: APP.signIn, kind: 'ghost', size: 'md' })}
      ${linkButton({ label: 'Back Office', href: APP.backOffice, kind: 'outline', size: 'md' })}
      ${linkButton({ label: 'Open POS', href: APP.pos, kind: 'outline', size: 'md' })}
    </div>
  </div>
</section>`;

export const builtFor = () => `<section class="built" aria-labelledby="built-title">
  <div class="wrap">
    ${eyebrow(BUILT_FOR.eyebrow)}
    <h2 id="built-title" class="section-title">${esc(BUILT_FOR.heading[0])} <span class="gold">${esc(BUILT_FOR.heading[1])}</span></h2>
    <div class="biz-grid">
      ${BUILT_FOR.cards.map(c => `<article class="biz-card rv">
        <img src="${c.img}" width="640" height="400" alt="${esc(c.alt)}" loading="lazy" decoding="async">
        <div class="biz-shade" aria-hidden="true"></div>
        <div class="biz-body"><span class="ic-ring">${icon(c.icon, 22)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div></div>
      </article>`).join('')}
    </div>
  </div>
</section>`;

export const offer = () => `<section class="offer" aria-labelledby="offer-title">
  <div class="wrap">
    <h2 id="offer-title" class="section-title with-rules"><span>${esc(OFFER.heading)}</span></h2>
    <ul class="offer-grid">
      ${OFFER.items.map(i => `<li class="offer-item rv"><span class="ic-ring big">${icon(i.icon, 34)}</span><h3>${esc(i.title)}</h3><p><span class="ln">${esc(i.lines[0])}</span> <span class="ln">${esc(i.lines[1])}</span></p></li>`).join('')}
    </ul>
  </div>
</section>`;

export const steps = () => `<section class="steps" aria-labelledby="steps-title">
  <div class="wrap">
    <h2 id="steps-title" class="section-title with-rules"><span>${esc(STEPS.heading)}</span></h2>
    <ol class="step-grid">
      ${STEPS.items.map(s => `<li class="step rv"><span class="step-n" aria-hidden="true">${s.n}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${linkButton({ label: s.cta.label, href: s.cta.href, kind: s.n === '1' ? 'gold' : 'outline', size: 'md', arrow: s.n === '1' })}</li>`).join('')}
    </ol>
  </div>
</section>`;

export const ctaBand = () => `<section class="cta-band" aria-labelledby="cta-title">
  <div class="wrap cta-in">
    <div><h2 id="cta-title" class="cta-title">Start your ${PRICING.trialDays}-day free trial</h2><p>Every shop is included while you try AUREUM. Subscribe by card when you're ready.</p></div>
    <div class="cta-actions">${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'lg', arrow: true })}${linkButton({ label: 'Log in', href: APP.signIn, kind: 'outline', size: 'lg' })}</div>
  </div>
</section>`;

export const pageHero = (kicker, title, lead) => `<section class="page-hero"><div class="wrap">${eyebrow(kicker)}<h1 class="page-title">${title}</h1><p class="page-lead">${lead}</p></div></section>`;

export const showcase = () => SHOWCASE.map(s => `<section class="showcase${s.flip ? ' flip' : ''}" id="${s.id}" aria-labelledby="${s.id}-t">
  <div class="wrap sc-in">
    <div class="sc-text rv"><span class="ic-ring">${icon(s.icon, 24)}</span><h2 id="${s.id}-t">${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>${ticks(s.points)}</div>
    <div class="sc-media sc-${s.device} rv">${deviceByKey(s.device)}</div>
  </div>
</section>`).join('');

export const featureGrid = () => `<section class="fgroups" aria-labelledby="fg-title">
  <div class="wrap">
    <h2 id="fg-title" class="section-title with-rules"><span>And everything behind the counter</span></h2>
    <div class="fg-grid">${FEATURE_GROUPS.map(g => `<article class="fg-card rv"><span class="ic-ring">${icon(g.icon, 24)}</span><h3>${esc(g.title)}</h3>${ticks(g.points)}</article>`).join('')}</div>
  </div>
</section>`;
