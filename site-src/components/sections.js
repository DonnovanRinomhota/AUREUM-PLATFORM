import { HERO, HERO_BG, BUILT_FOR, OFFER, STEPS, APP, PRICING, SHOWCASE, FEATURE_GROUPS, VIDEOS, TOUR_POS, TOUR_POS_CHAPTERS, TOUR_FULL, TOUR_FULL_CHAPTERS } from '../config.js';
import { esc, linkButton, actionButton, eyebrow, ticks } from './ui.js';
import { icon } from './icons.js';
import { heroDevices, deviceByKey } from './devices.js';
import { player } from './player.js';

const heroBg = () => HERO_BG.img
  ? `<img class="hero-bg" src="${esc(HERO_BG.img)}" width="1920" height="900" alt="" fetchpriority="high" decoding="async">`
  : `<!-- HERO BACKGROUND IMAGE SLOT: add your own image here. Set HERO_BG.img (e.g. '/site/assets/img/${HERO_BG.slotName}') in site-src/config.js and rebuild; this block is then replaced by your <img class="hero-bg">. -->
  <div class="hero-bg hero-slot" aria-hidden="true"></div>`;

export const hero = () => `<section class="hero" aria-labelledby="hero-title">
  ${heroBg()}
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="hero-eyebrow">${esc(HERO.eyebrow)}</p>
      <h1 id="hero-title" class="hero-title"><span class="ln">${esc(HERO.headline[0])}</span> <span class="ln">System and <span class="gold">Inventory</span></span> <span class="ln gold">${esc(HERO.headline[2])}</span></h1>
      ${HERO.intro.map(p => `<p class="hero-intro">${esc(p)}</p>`).join('')}
      <ul class="badges">${HERO.badges.map(b => `<li>${icon(b.icon, 22)}<span>${esc(b.text)}</span></li>`).join('')}</ul>
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

/* Four cards: a label and a clean placeholder. Set `img` in config.js to show your own picture instead. */
const card = c => c.img
  ? `<article class="biz-card has-img rv"><img src="${esc(c.img)}" width="640" height="480" alt="${esc(c.alt)}" loading="lazy" decoding="async"><div class="biz-shade" aria-hidden="true"></div><h3 class="biz-label">${esc(c.title)}</h3></article>`
  : `<article class="biz-card rv">
        <!-- IMAGE SLOT: ${esc(c.title)} card. Add your own picture here: set the "${esc(c.title)}" card's img to '/site/assets/img/${esc(c.slotName)}' in site-src/config.js (BUILT_FOR.cards) and rebuild. -->
        <div class="img-slot" aria-hidden="true"></div>
        <h3 class="biz-label">${esc(c.title)}</h3>
      </article>`;

export const builtFor = () => `<section class="built" aria-labelledby="built-title">
  <div class="wrap">
    ${eyebrow(BUILT_FOR.eyebrow)}
    <h2 id="built-title" class="section-title">${esc(BUILT_FOR.heading)}</h2>
    <div class="biz-grid">
      ${BUILT_FOR.cards.map(card).join('')}
    </div>
  </div>
</section>`;

export const offer = () => `<section class="offer" aria-labelledby="offer-title">
  <div class="wrap">
    <h2 id="offer-title" class="section-title">${esc(OFFER.heading)}</h2>
    <ul class="offer-grid">
      ${OFFER.items.map(i => `<li class="offer-item rv"><span class="ic-ring big">${icon(i.icon, 30)}</span><h3>${esc(i.title)}</h3><p><span class="ln">${esc(i.lines[0])}</span> <span class="ln">${esc(i.lines[1])}</span></p></li>`).join('')}
    </ul>
  </div>
</section>`;

export const steps = () => `<section class="steps" aria-labelledby="steps-title">
  <div class="wrap">
    <h2 id="steps-title" class="section-title">${esc(STEPS.heading)}</h2>
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

export const pageHero = (kicker, title, lead) => `<section class="page-hero"><div class="wrap">${eyebrow(kicker)}<h1 class="page-title">${title}</h1>${lead ? `<p class="page-lead">${lead}</p>` : ''}</div></section>`;

/* "See how it works": POS → dashboard analytics → reports → receipt, in that order. */
export const howItWorks = () => `<section class="how" id="how-it-works" aria-labelledby="how-title">
  <div class="wrap narrow-wide">
    <h2 id="how-title" class="section-title">See how it works</h2>
    <p class="section-lead">The POS, the dashboard analytics, reports and the receipt, in four short chapters.</p>
    <div class="how-player rv">${player({ id: 'how', label: 'AUREUM walkthrough: the POS, dashboard analytics, reports and the receipt', frames: TOUR_FULL, chapters: TOUR_FULL_CHAPTERS, video: VIDEOS.howItWorks, configKey: 'howItWorks' })}</div>
  </div>
</section>`;

const media = s => s.player === 'pos'
  ? player({ id: 'pos', label: 'AUREUM POS checkout walkthrough', frames: TOUR_POS, chapters: TOUR_POS_CHAPTERS, video: VIDEOS.posCheckout, configKey: 'posCheckout' })
  : deviceByKey(s.device);

export const showcase = () => SHOWCASE.map(s => `<section class="showcase${s.flip ? ' flip' : ''}" id="${s.id}" aria-labelledby="${s.id}-t">
  <div class="wrap sc-in">
    <div class="sc-text rv"><span class="ic-ring">${icon(s.icon, 24)}</span><h2 id="${s.id}-t">${esc(s.title)}</h2><p class="lead">${esc(s.lead)}</p>${ticks(s.points)}</div>
    <div class="sc-media ${s.player ? 'sc-player' : 'sc-' + s.device} rv">${media(s)}</div>
  </div>
</section>`).join('');

export const featureGrid = () => `<section class="fgroups" aria-labelledby="fg-title">
  <div class="wrap">
    <h2 id="fg-title" class="section-title">And everything behind the counter</h2>
    <div class="fg-grid">${FEATURE_GROUPS.map(g => `<article class="fg-card rv"><span class="ic-ring">${icon(g.icon, 24)}</span><h3>${esc(g.title)}</h3>${ticks(g.points)}</article>`).join('')}</div>
  </div>
</section>`;
