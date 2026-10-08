import { SITE, APP, PRICING } from '../config.js';
import { hero, productAccess, builtFor, offer, steps } from '../components/sections.js';

export const home = {
  path: '/', file: 'index.html', active: 'home', title: SITE.title, description: SITE.description,
  preload: ['/site/assets/img/hero-bg.webp', '/site/assets/img/screen-dashboard.webp'],
  software: true,
  body: () => hero() + productAccess() + builtFor() + offer() + steps()
};
