import { HERO, BUILT_FOR, OFFER, STEPS, APP, PRICING, SHOWCASE, FEATURE_GROUPS, WHAT, DEVICES_LINE } from '../config.js';
import { esc, linkButton, alink, secHead, ticks, gEyebrow } from './ui.js';
import { icon } from './icons.js';
import { heroDevices, deviceByKey } from './devices.js';

/* ---------- home page ---------- */
export const hero = () => `<section class="panel dark hero-top" aria-labelledby="hero-title">
  <div class="wrap">
    <p class="h-label">AUREUM POS &amp; INVENTORY</p>
    <h1 id="hero-title" class="display hero-title">A Point Of Sale<br><span class="dim">System You Can Rely On.</span></h1>
    <div class="hero-btns hero-btns-c">
      ${linkButton({ label: 'Start free trial', href: APP.signUp, kind: 'gold', size: 'lg', arrow: true })}
      ${linkButton({ label: 'See the features', href: '/features/', kind: 'outline', size: 'lg', extra: 'btn-goldline' })}
    </div>
  </div>
</section>
<section class="hero-media" aria-label="AUREUM in action">
  <div class="hm-stage" id="hm-stage">
    <div class="hm-bg" aria-hidden="true"></div>
    <div class="hm-devices">${heroDevices()}</div>
    <div class="hm-video" id="hm-video">
      <video id="hm-vid" muted playsinline preload="auto" poster="/site/assets/img/hero-poster.jpg" aria-label="A shop owner serving customers at her counter with AUREUM" width="1280" height="720"><source src="/site/assets/video/hero.mp4" type="video/mp4"></video>
      <div class="hm-shade" aria-hidden="true"></div>
      <p class="hm-text">Your Business<br>Simplified</p>
    </div>
  </div>
</section>`;

export const why = () => `<section class="panel light" id="why" aria-labelledby="why-title">
  <div class="wrap">
    ${secHead('01 / WHY AUREUM', 'Made for real shop days')}
    <div class="split-head">
      <span class="tiny">THE AUREUM DIFFERENCE</span>
      <div>
        <h2 id="why-title" class="display md">The best system means<br>little until it works<br><span class="acc">at your counter.</span></h2>
        <p class="small narrow-p">Your shop already has a way of working. AUREUM follows it: a till that keeps selling when the internet drops, stock that updates with every sale, and a Back Office that shows what the day really made.</p>
        <div class="right-link">${alink('See the features', '/features/', 'dark')}</div>
      </div>
    </div>
    <div class="cols4">
      ${OFFER.items.filter(i => i.title !== 'Built for Zimbabwe').map(i => `<article class="col rv"><h3>${esc(i.title)}</h3><p class="tiny-p">${esc(i.lines.join(' '))}</p></article>`).join('')}
    </div>
  </div>
</section>`;

export const whatYouGet = () => `<section class="panel dark" id="what" aria-labelledby="what-title">
  <div class="wrap">
    ${secHead('02 / WHAT YOU GET', 'Till, stock, reports, staff')}
    <h2 id="what-title" class="display">Less guessing.<br><span class="dim">More selling.</span></h2>
    <p class="aside-p small">Pick the part of your day that costs you time.<br>Start there.</p>
    <div class="what-grid">
      <div class="what-media rv">${deviceByKey('tablet', { ctx: 'show' })}</div>
      <div class="acc-list">
        ${WHAT.map((w, i) => `<details class="acc-item" name="what"${i === 0 ? ' open' : ''}>
          <summary><span class="num">0${i + 1}</span><span class="acc-t">${esc(w.title)}</span>${icon('plus', 16, 'ic pm')}</summary>
          <div class="acc-body"><p>${esc(w.text)}</p>${alink(w.cta, w.href, 'mint')}</div>
        </details>`).join('')}
        <div class="acc-foot">${alink('Find your starting point', '/features/')}</div>
      </div>
    </div>
    <div class="runs-on"><span class="tiny">RUNS ON</span><ul>${DEVICES_LINE.map(d => `<li>${esc(d)}</li>`).join('')}</ul></div>
  </div>
</section>`;

export const builtFor = () => `<section class="built" aria-labelledby="built-title">
  <div class="wrap">
    ${gEyebrow(BUILT_FOR.eyebrow)}
    <h2 id="built-title" class="g-title">${esc(BUILT_FOR.heading[0])} <span class="gold">${esc(BUILT_FOR.heading[1])}</span></h2>
    <div class="biz-grid">
      ${BUILT_FOR.cards.map(c => `<article class="biz-card rv">
        <img src="${c.img}" width="640" height="400" alt="${esc(c.alt)}" loading="lazy" decoding="async">
        <div class="biz-shade" aria-hidden="true"></div>
        <div class="biz-body"><span class="ic-ring">${icon(c.icon, 22)}</span><div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div></div>
      </article>`).join('')}
    </div>
  </div>
</section>`;

export const steps = () => `<section class="panel dark" aria-labelledby="steps-title">
  <div class="wrap">
    ${secHead('04 / HOW IT WORKS', 'Sign up, set up, sell')}
    <h2 id="steps-title" class="display">Three steps.<br><span class="dim">Then you are selling.</span></h2>
    <ol class="cols3">
      ${STEPS.items.map(s => `<li class="col rv"><span class="num mint">0${s.n}</span><h3>${esc(s.title)}</h3><p class="tiny-p">${esc(s.text)}</p>${alink(s.cta.label, s.cta.href)}</li>`).join('')}
    </ol>
  </div>
</section>`;

export const priceBand = () => `<section class="panel light" aria-labelledby="price-title">
  <div class="wrap">
    ${secHead('05 / PRICING', 'No tiers. No surprises.')}
    <div class="price-split">
      <h2 id="price-title" class="display md">One price<br><span class="dim">per shop.</span></h2>
      <dl class="price-rows">
        <div><dt>$${PRICING.perShop}</dt><dd>per shop, per month — every feature included</dd></div>
        <div><dt>${PRICING.trialDays} days</dt><dd>free trial with every shop included, then pay by card when you are ready</dd></div>
      </dl>
    </div>
    <div class="right-link">${alink('See pricing', '/pricing/', 'dark')}</div>
  </div>
</section>`;

export const ctaBlock = () => `<section class="panel accent" aria-labelledby="cta-title">
  <div class="wrap">
    ${secHead("LET'S GET STARTED", `${PRICING.trialDays}-DAY FREE TRIAL`)}
    <div class="cta-big">
      <h2 id="cta-title" class="display xl">Let's put<br><span class="ink">your shop to work.</span></h2>
      <a class="big-arrow" href="${APP.signUp}" aria-label="Start your free trial">${icon('ne', 120, 'ic')}</a>
    </div>
    <div class="cta-foot"><p class="small">Create your account and try every feature.<br>Every shop is included while you try AUREUM.</p>${alink('Start free trial', APP.signUp, 'ink')}</div>
  </div>
</section>`;
export const ctaBand = ctaBlock;

/* ---------- inner pages ---------- */
export const pageHero = (kicker, title, lead) => `<section class="panel dark page-hero"><div class="wrap">${secHead(kicker, 'AUREUM POS & INVENTORY')}<h1 class="display md">${title}</h1><p class="small lead">${lead}</p></div></section>`;

export const showcase = () => SHOWCASE.map((s, i) => `<section class="panel ${s.flip ? 'light' : 'dark'} showcase" id="${s.id}" aria-labelledby="${s.id}-t">
  <div class="wrap">
    ${secHead(`0${i + 1} / ${s.title.toUpperCase()}`, '')}
    <div class="sc-in${s.flip ? ' flip' : ''}">
      <div class="sc-text rv"><h2 id="${s.id}-t" class="display sm">${esc(s.title)}</h2><p class="small lead-p">${esc(s.lead)}</p>${ticks(s.points)}</div>
      <div class="sc-media sc-${s.device} rv">${deviceByKey(s.device)}</div>
    </div>
  </div>
</section>`).join('');

export const featureGrid = () => `<section class="panel light fgroups" aria-labelledby="fg-title">
  <div class="wrap">
    ${secHead('04 / BEHIND THE COUNTER', 'Everything else it does')}
    <h2 id="fg-title" class="display md">And everything<br><span class="dim">behind the counter.</span></h2>
    <div class="fg-grid">${FEATURE_GROUPS.map(g => `<article class="fg-card rv"><h3>${esc(g.title)}</h3>${ticks(g.points)}</article>`).join('')}</div>
  </div>
</section>`;
