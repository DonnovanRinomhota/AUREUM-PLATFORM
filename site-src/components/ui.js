import { icon } from './icons.js';
import { SITE } from '../config.js';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const logoMark = () => `<span class="logo-mark" aria-hidden="true"><span>A</span></span>`;

export const brand = (cls = '') =>
  `<a class="brand ${cls}" href="/" aria-label="AUREUM POS &amp; Inventory Management — home">${logoMark()}<span class="brand-text"><span class="brand-name">AUREUM</span><span class="brand-sub">${esc(SITE.tagline)}</span></span></a>`;

/* A real link that looks like a button. kind: gold | outline | ghost */
export function linkButton({ label, href, kind = 'gold', size = 'md', arrow = false, extra = '' }) {
  return `<a class="btn btn-${kind} btn-${size}${extra ? ' ' + extra : ''}" href="${esc(href)}">${esc(label)}${arrow ? icon('arrow', 18, 'ic btn-ic') : ''}</a>`;
}
/* A real <button> (used for the demo dialog and the mobile menu). */
export function actionButton({ label, kind = 'outline', size = 'md', iconName = '', attrs = '' }) {
  return `<button type="button" class="btn btn-${kind} btn-${size}" ${attrs}>${iconName ? icon(iconName, 16, 'ic btn-ic') : ''}${esc(label)}</button>`;
}

export const eyebrow = text => `<p class="eyebrow">${esc(text)}</p>`;

export const sectionTitle = (html, cls = '') => `<h2 class="section-title ${cls}">${html}</h2>`;

export const ticks = items => `<ul class="ticks">${items.map(t => `<li>${icon('check', 18, 'ic tick')}<span>${esc(t)}</span></li>`).join('')}</ul>`;

export const faq = items => `<div class="faq">${items.map(i => `<details class="faq-item"><summary>${esc(i.q)}</summary><p>${esc(i.a)}</p></details>`).join('')}</div>`;
