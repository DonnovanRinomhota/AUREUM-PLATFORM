import { icon } from './icons.js';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const logoMark = () => `<span class="logo-mark" aria-hidden="true"><span>A</span></span>`;

export const brand = (cls = '') =>
  `<a class="brand ${cls}" href="/" aria-label="AUREUM POS &amp; Inventory Management — home">${logoMark()}<span class="brand-text"><span class="brand-name">AUREUM</span><span class="brand-sub">POS &amp; Inventory Management</span></span></a>`;

/* A real link that looks like a button. kind: gold | outline | ghost */
export function linkButton({ label, href, kind = 'gold', size = 'md', arrow = false, extra = '' }) {
  return `<a class="btn btn-${kind} btn-${size}${extra ? ' ' + extra : ''}" href="${esc(href)}">${esc(label)}${arrow ? icon('arrow', 18, 'ic btn-ic') : ''}</a>`;
}
/* A real <button> (used for the demo dialog and the mobile menu). */
export function actionButton({ label, kind = 'outline', size = 'md', iconName = '', attrs = '' }) {
  return `<button type="button" class="btn btn-${kind} btn-${size}" ${attrs}>${iconName ? icon(iconName, 16, 'ic btn-ic') : ''}${esc(label)}</button>`;
}

export const eyebrow = text => `<p class="eyebrow"><span class="rule"></span><span class="dia"></span><span class="eb-text">${esc(text)}</span><span class="dia"></span><span class="rule"></span></p>`;

export const sectionTitle = (html, cls = '') => `<h2 class="section-title ${cls}">${html}</h2>`;

export const ticks = items => `<ul class="ticks">${items.map(t => `<li>${icon('check', 18, 'ic tick')}<span>${esc(t)}</span></li>`).join('')}</ul>`;

export const faq = items => `<div class="faq">${items.map(i => `<details class="faq-item"><summary>${esc(i.q)}</summary><p>${esc(i.a)}</p></details>`).join('')}</div>`;

/* The Zimbabwe flag (simplified): seven stripes, white triangle with a black edge, red star with a gold bird. */
export const flag = () => `<svg class="flag" viewBox="0 0 160 80" role="img" aria-label="Flag of Zimbabwe" width="140" height="70">
  <rect width="160" height="80" fill="#fff"/>
  <rect y="0" width="160" height="11.43" fill="#1f8a3d"/><rect y="11.43" width="160" height="11.43" fill="#f5c400"/><rect y="22.86" width="160" height="11.43" fill="#d52b1e"/>
  <rect y="34.29" width="160" height="11.43" fill="#111"/><rect y="45.72" width="160" height="11.43" fill="#d52b1e"/><rect y="57.15" width="160" height="11.43" fill="#f5c400"/><rect y="68.57" width="160" height="11.43" fill="#1f8a3d"/>
  <polygon points="0,0 0,80 56,40" fill="#111"/><polygon points="0,6.5 0,73.5 47,40" fill="#fff"/>
  <polygon points="17,28 20.2,36.6 29.4,36.9 22.1,42.5 24.7,51.3 17,46.2 9.3,51.3 11.9,42.5 4.6,36.9 13.8,36.6" fill="#d52b1e"/>
  <path d="M10 41.5c3-6 8-6.5 11-4.5l3-3-1 5c3.5 1.5 5 4 4.5 7l-5-1.5-2 5-3.5-3.5-4.5 2.5z" fill="#f5c400"/>
</svg>`;

/* A quiet gold line-art skyline with a baobab, for the footer. */
export const skyline = () => `<svg class="skyline" viewBox="0 0 640 140" aria-hidden="true" focusable="false" preserveAspectRatio="xMaxYMax meet">
  <g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
    <path d="M8 132h624"/>
    <path d="M40 132V98h22v34M62 132V84h26v48M88 132v-30h18v30"/>
    <path d="M118 132V60h30v72M133 60V44M126 76h14M126 92h14M126 108h14"/>
    <path d="M160 132V90h24v42M184 132V74h20v58"/>
    <path d="M222 132V50h34v82M239 50V30M232 66h14M232 84h14M232 102h14"/>
    <path d="M270 132V96h26v36M296 132V70h22v62M318 132V104h20v28"/>
    <path d="M352 132V40h26v92M365 40V16M358 56h14M358 74h14M358 92h14M358 110h14"/>
    <path d="M392 132V92h22v36"/>
    <path d="M470 132c-6-4-8-14-8-26 0-14-10-20-20-26 10 0 18 2 22 6 2-8 8-12 16-12s14 4 16 12c4-4 12-6 22-6-10 6-20 12-20 26 0 12-2 22-8 26"/>
    <path d="M434 70c8-8 20-10 28-6M524 70c-8-8-20-10-28-6M478 58c0-8 6-14 14-14M468 56c-2-6-8-10-14-8"/>
    <path d="M556 132V104h24v28M580 132V88h22v44"/>
  </g>
</svg>`;
