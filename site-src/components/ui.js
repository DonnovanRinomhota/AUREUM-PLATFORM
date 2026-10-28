import { icon } from './icons.js';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const logoMark = () => `<span class="logo-mark" aria-hidden="true"><span>A</span></span>`;

export const brand = (cls = '') =>
  `<a class="brand ${cls}" href="/" aria-label="AUREUM POS &amp; Inventory Management — home">${logoMark()}<span class="brand-text"><span class="brand-name">AUREUM</span><span class="brand-sub">POS &amp; INVENTORY MANAGEMENT</span></span></a>`;

/* A real link that looks like a button. kind: gold (solid accent) | outline | ghost */
export function linkButton({ label, href, kind = 'gold', size = 'md', arrow = false, extra = '' }) {
  return `<a class="btn btn-${kind} btn-${size}${extra ? ' ' + extra : ''}" href="${esc(href)}"><span>${esc(label)}</span>${arrow ? icon('ne', 16, 'ic btn-ic') : ''}</a>`;
}
/* A small underlined text link with an arrow — the site's main way to link. */
export const alink = (label, href, extra = '') => `<a class="alink${extra ? ' ' + extra : ''}" href="${esc(href)}"><span>${esc(label)}</span>${icon('ne', 14, 'ic')}</a>`;
/* A real <button> (used for the demo dialog and the mobile menu). */
export function actionButton({ label, kind = 'outline', size = 'md', iconName = '', attrs = '' }) {
  return `<button type="button" class="btn btn-${kind} btn-${size}" ${attrs}>${iconName ? icon(iconName, 16, 'ic btn-ic') : ''}${esc(label)}</button>`;
}

/* The small letter-spaced label row that opens every section: "01 / WHY AUREUM" on the left, a tagline on the right. */
export const secHead = (left, right = '') => `<div class="sec-head"><span>${esc(left)}</span><span>${esc(right)}</span></div>`;
export const eyebrow = text => `<p class="eyebrow">${esc(text)}</p>`;

export const sectionTitle = (html, cls = '') => `<h2 class="section-title ${cls}">${html}</h2>`;

export const ticks = items => `<ul class="ticks">${items.map(t => `<li><span>${esc(t)}</span></li>`).join('')}</ul>`;

export const faq = items => `<div class="faq">${items.map(i => `<details class="faq-item"><summary><span>${esc(i.q)}</span>${icon('plus', 18, 'ic pm')}</summary><p>${esc(i.a)}</p></details>`).join('')}</div>`;

/* Gold section label with rules and diamonds (used by the "Built for every counter" section). */
export const gEyebrow = text => `<p class="g-eyebrow"><span class="rule"></span><span class="dia"></span><span class="eb-text">${esc(text)}</span><span class="dia"></span><span class="rule"></span></p>`;
