import { HERO } from '../config.js';
import { esc } from './ui.js';

const shot = (key, { eager = false } = {}) => {
  const d = HERO.devices[key];
  return `<img src="${d.src}" width="${d.w}" height="${d.h}" alt="${esc(d.alt)}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
};

/* Each frame is pure HTML/CSS around a REAL screenshot of the AUREUM application. */
export const laptop = opts => `<div class="frame frame-laptop"><div class="lp-screen">${shot('laptop', opts)}</div><div class="lp-base" aria-hidden="true"></div></div>`;
export const tablet = opts => `<div class="frame frame-tablet"><div class="tb-screen">${shot('tablet', opts)}</div></div>`;
export const phone = opts => `<div class="frame frame-phone"><span class="ph-island" aria-hidden="true"></span><div class="ph-screen">${shot('phone', opts)}</div></div>`;
export const deviceByKey = (key, opts) => ({ laptop, tablet, phone })[key](opts);

/* The hero composition: laptop = dashboard, tablet = POS checkout, phone = receipt. */
export const heroDevices = () => `<div class="devices" role="group" aria-label="AUREUM on a laptop, a tablet and a phone">
  <div class="dev dev-laptop">${laptop({ eager: true })}</div>
  <div class="dev dev-tablet">${tablet({ eager: true })}</div>
  <div class="dev dev-phone">${phone({ eager: true })}</div>
</div>`;
