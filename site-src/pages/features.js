import { SITE } from '../config.js';
import { pageHero, howItWorks, showcase, featureGrid, ctaBand } from '../components/sections.js';

export const features = {
  path: '/features/', file: 'features/index.html', active: 'features',
  title: `Features | ${SITE.titleSuffix}`,
  description: 'See what AUREUM does: POS checkout, receipts and refunds, shifts and cash control, inventory, purchasing, multi-shop management, reports and more.',
  body: () => pageHero('FEATURES', 'AUREUM Features', 'Everything on this page is in the AUREUM application today.') + howItWorks() + showcase() + featureGrid() + ctaBand()
};
