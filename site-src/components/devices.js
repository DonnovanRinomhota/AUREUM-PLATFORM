import { HERO } from '../config.js';
import { esc } from './ui.js';

/* How wide each picture is actually shown, so each screen downloads only the size it needs:
   a light file on ordinary screens, the full-resolution file on sharp (high-density) displays. */
const SIZES = {
  hero: { laptop: '(min-width:1101px) 690px, (min-width:761px) 640px, 92vw', tablet: '(min-width:1101px) 600px, (min-width:761px) 520px, 70vw', phone: '(min-width:1101px) 160px, (min-width:761px) 140px, 34vw' },
  show: { laptop: '(min-width:901px) 560px, 92vw', tablet: '(min-width:901px) 560px, 92vw', phone: '(min-width:901px) 290px, 70vw' }
};
const shot = (key, { eager = false, ctx = 'show' } = {}) => {
  const d = HERO.devices[key], first = d.set[0][0];
  return `<img src="${first}" srcset="${d.set.map(([u, w]) => `${u} ${w}w`).join(', ')}" sizes="${SIZES[ctx][key]}" width="${d.w}" height="${d.h}" alt="${esc(d.alt)}" ${eager ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"'}>`;
};

/* Each frame is pure HTML/CSS around a REAL screenshot of the AUREUM application. */
export const laptop = opts => `<div class="frame frame-laptop"><div class="lp-screen">${shot('laptop', opts)}</div><div class="lp-base" aria-hidden="true"></div></div>`;
/* The tablet is a ready-made picture of the POS in its own gold tablet frame, so it is shown as is (no CSS frame around it). */
export const tablet = opts => `<div class="frame frame-tablet frame-photo">${shot('tablet', opts)}</div>`;
export const phone = opts => `<div class="frame frame-phone"><span class="ph-island" aria-hidden="true"></span><div class="ph-screen">${shot('phone', opts)}</div></div>`;
export const deviceByKey = (key, opts) => ({ laptop, tablet, phone })[key](opts);

/* The hero composition: laptop = dashboard, tablet = POS checkout, phone = receipt. */
export const heroDevices = () => `<div class="devices" role="group" aria-label="AUREUM on a laptop, a tablet and a phone">
  <div class="dev dev-laptop">${laptop({ eager: true, ctx: 'hero' })}</div>
  <div class="dev dev-tablet">${tablet({ eager: true, ctx: 'hero' })}</div>
  <div class="dev dev-phone">${phone({ eager: true, ctx: 'hero' })}</div>
</div>`;
