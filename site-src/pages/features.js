import { pageHero, showcase, featureGrid, ctaBand } from '../components/sections.js';

export const features = {
  path: '/features/', file: 'features/index.html', active: 'features',
  title: 'Features | AUREUM POS & Inventory Management',
  description: 'See what AUREUM does: POS checkout, receipts and refunds, shifts and cash control, inventory, purchasing, multi-shop management, reports and more.',
  body: () => pageHero('FEATURES', 'AUREUM Features', 'Everything on this page is in the AUREUM application today.') + showcase() + featureGrid() + ctaBand()
};
