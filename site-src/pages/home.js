import { SITE } from '../config.js';
import { hero, why, whatYouGet, builtFor, steps, priceBand, ctaBlock } from '../components/sections.js';

export const home = {
  path: '/', file: 'index.html', active: 'home', title: SITE.title, description: SITE.description,
  preload: ['/site/assets/img/screen-dashboard-1280.webp'],
  software: true,
  body: () => hero() + why() + whatYouGet() + builtFor() + steps() + priceBand() + ctaBlock()
};
