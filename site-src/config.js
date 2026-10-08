/* AUREUM public website — ONE place for every URL, every piece of copy, and every picture/video slot.
   Change a value here, run `node tools/build-site.mjs`, and every page is rebuilt. */

export const SITE = {
  name: 'AUREUM',
  tagline: 'POS & INVENTORY MANAGEMENT',
  titleSuffix: 'AUREUM Point of Sale & Inventory Management',
  url: 'https://aureum-platform.vercel.app',          // canonical links, sitemap and social previews
  title: 'AUREUM POS | Point of Sale & Inventory Management',
  description: 'Point of sale and inventory management for your business. Manage sales, inventory, reports and your business from anywhere.',
  ogImage: '/site/assets/img/og-image.jpg'
};

/* The real AUREUM application. APP_BASE '' = the same website (normal on Vercel).
   If the website is ever hosted elsewhere, set it to 'https://aureum-platform.vercel.app'. */
export const APP_BASE = '';
export const APP = {
  backOffice: APP_BASE + '/backoffice.html',
  signIn: APP_BASE + '/backoffice.html?mode=signin',     // Back Office on "Sign In"
  signUp: APP_BASE + '/backoffice.html?mode=signup',     // Back Office on "Create Business" (the free trial)
  pos: APP_BASE + '/pos-checkout.html'
};

export const NAV = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'features', label: 'Features', href: '/features/' },
  { id: 'pricing', label: 'Pricing', href: '/pricing/' },
  { id: 'about', label: 'About', href: '/about/' },
  { id: 'support', label: 'Support', href: '/support/' }
];

/* Real pricing from the application's billing (US$5.00 per shop per month, card via Stripe). */
export const PRICING = { perShop: 5, trialDays: 14, graceDays: 3, examples: [1, 2, 3, 5, 10] };

/* Watch Demo dialog: set videoUrl to an .mp4/.webm file or a YouTube / Vimeo link and rebuild to play it there. */
export const DEMO = { videoUrl: '', title: 'AUREUM demo' };

/* ===== YOUR VIDEOS — drop a file in site/assets/media/ and change ONE path, then rebuild =====
   While `mp4` is empty, the player shows an animated walkthrough built from the real app screens,
   clearly labelled as a preview. Set `mp4` (and optionally `webm`) and the player becomes a normal video player. */
export const VIDEOS = {
  posCheckout: { mp4: '', webm: '', poster: '/site/assets/img/tour-pos-2.webp' },     // Features page → "POS Checkout"
  howItWorks: { mp4: '', webm: '', poster: '/site/assets/img/tour-pos-2.webp' }       // Features page → "See how it works"
};

/* ===== YOUR IMAGES — leave `img` empty for the clean placeholder; set a path to show your picture ===== */
export const HERO_BG = { img: '', slotName: 'hero-bg.webp' };                          // e.g. '/site/assets/img/hero-bg.webp'

export const SUPPORT = { email: '', phone: '', whatsapp: '' };                         // shown on the Support page once filled in

/* ---- Hero copy: EXACT wording ---- */
export const HERO = {
  eyebrow: 'AUREUM POS',
  headline: ['Elegant Point Of Sale', 'System and Inventory', 'Management.'],
  intro: [
    'A point of sale at the tip of your fingers: phone, tablet, laptop. Carry your business with you.',
    'Manage and track your inventory from anywhere. Simple and efficient tools to run your business.'
  ],
  badges: [
    { icon: 'bolt', text: 'Fast & Easy Checkout' },
    { icon: 'cube', text: 'Real-time Inventory' },
    { icon: 'cloud', text: 'Access Anywhere' },
    { icon: 'shield', text: 'Secure & Reliable' }
  ],
  devices: {
    laptop: { src: '/site/assets/img/screen-dashboard.webp', w: 1280, h: 800, alt: 'The AUREUM Back Office dashboard showing gross sales, net sales, cost of sales, gross profit, stock alerts and a sales summary chart.' },
    tablet: { src: '/site/assets/img/screen-pos.webp', w: 1100, h: 802, alt: 'The AUREUM POS checkout on a tablet: product tiles showing name, price and stock beside the current ticket and a Complete Sale button.' },
    phone: { src: '/site/assets/img/screen-receipt.webp', w: 560, h: 1212, alt: 'A completed sale on a phone: the AUREUM receipt with items, total, payment method and print and email options.' }
  }
};

export const BUILT_FOR = {
  eyebrow: 'BUILT FOR EVERY COUNTER',
  heading: 'Built for every kind of business',
  cards: [
    { id: 'cosmetics', title: 'Cosmetics', img: '', slotName: 'card-cosmetics.webp', alt: 'A cosmetics business using AUREUM' },
    { id: 'groceries', title: 'Groceries', img: '', slotName: 'card-groceries.webp', alt: 'A grocery business using AUREUM' },
    { id: 'electronics', title: 'Electronics', img: '', slotName: 'card-electronics.webp', alt: 'An electronics business using AUREUM' },
    { id: 'clothes', title: 'Clothes', img: '', slotName: 'card-clothes.webp', alt: 'A clothing business using AUREUM' }
  ]
};

export const OFFER = {
  heading: 'What We Offer',
  items: [
    { icon: 'cart', title: 'Easy Checkout', lines: ['Quick and seamless sales', 'for a better customer experience.'] },
    { icon: 'cube', title: 'Track Inventory', lines: ['Know what you have,', "what's low, and what to order."] },
    { icon: 'chart', title: 'Insightful Reports', lines: ['Make smarter decisions', 'with real-time data.'] },
    { icon: 'cloud', title: 'Access Anywhere', lines: ['Run your business from', 'any device, anywhere.'] },
    { icon: 'coins', title: 'Multi-Currency Ready', lines: ['Add a second currency and', 'record every payment type.'] }
  ]
};

export const STEPS = {
  heading: 'Get started in three steps',
  items: [
    { n: '1', title: 'Create your business account', text: `Start your ${PRICING.trialDays}-day free trial. Every shop is included while you try AUREUM.`, cta: { label: 'Start Free Trial', href: APP.signUp } },
    { n: '2', title: 'Set up in the Back Office', text: 'Add your products, shops and staff. Import a product list from Excel or CSV.', cta: { label: 'Back Office', href: APP.backOffice } },
    { n: '3', title: 'Open the POS and sell', text: 'Cashiers sign in with a PIN and sell from any phone, tablet or laptop.', cta: { label: 'Open POS', href: APP.pos } }
  ]
};

/* ---- The animated walkthrough: real screens from the application, in order ---- */
const F = (n, title, text, chapter) => ({ img: `/site/assets/img/${n}.webp`, title, text, chapter });
export const TOUR_POS = [
  F('tour-pos-1', 'Add items', 'Tap products to put them on the ticket.', 0),
  F('tour-pos-2', 'Build the ticket', 'Change quantities with − and +. The total updates as you go.', 0),
  F('tour-pos-3', 'Apply a discount', 'A percent or an amount, when the cashier is allowed to.', 1),
  F('tour-pos-4', 'Add a customer', 'Attach a customer to the sale.', 2),
  F('tour-pos-5', 'Take payment', 'Choose cash, card, mobile or other, and enter the amount received.', 3),
  F('tour-pos-6', 'Complete the sale', 'The receipt appears straight away.', 4)
];
export const TOUR_POS_CHAPTERS = [{ label: 'Add items', start: 0 }, { label: 'Discount', start: 2 }, { label: 'Customer', start: 3 }, { label: 'Payment', start: 4 }, { label: 'Complete sale', start: 5 }];
export const TOUR_FULL = [
  F('tour-pos-1', 'The POS: add items', 'Tap products to put them on the ticket.', 0),
  F('tour-pos-3', 'The POS: discount', 'Apply a percent or amount discount.', 0),
  F('tour-pos-4', 'The POS: customer', 'Attach a customer to the sale.', 0),
  F('tour-pos-5', 'The POS: payment', 'Choose how the customer pays and enter the amount received.', 0),
  F('tour-pos-6', 'The POS: complete the sale', 'Finish the sale and the receipt appears.', 0),
  F('tour-dash-1', 'Dashboard analytics', 'Gross sales, net sales, cost of sales and gross profit, with stock alerts.', 1),
  F('tour-dash-2', 'Dashboard analytics', 'Sales over time, by payment type and by employee.', 1),
  F('tour-report-1', 'Reports: inventory valuation', 'See the value of your stock and the potential margin.', 2),
  F('tour-report-2', 'Reports: staff snapshot', 'See your team and their status at a glance.', 2),
  F('tour-receipt', 'The receipt', 'Print by browser, USB or Bluetooth printer, or email it.', 3)
];
export const TOUR_FULL_CHAPTERS = [{ label: '1 · The POS', start: 0 }, { label: '2 · Dashboard analytics', start: 5 }, { label: '3 · Reports', start: 7 }, { label: '4 · The receipt', start: 9 }];

/* ---- Features: ONLY things the application really does ---- */
export const SHOWCASE = [
  {
    id: 'checkout', icon: 'cart', title: 'POS Checkout', player: 'pos',
    lead: 'A fast, touch-friendly till that works on a phone, tablet or laptop, and keeps selling when the internet drops.',
    points: [
      'Tap products or search by name, code or barcode',
      'Percent or amount discounts, with cashier permissions you control',
      'Add a customer or a note to any sale',
      'Record cash, card, mobile money or other payments, with change calculated for you',
      'Sales made offline are saved on the device and sync automatically'
    ]
  },
  {
    id: 'dashboard', icon: 'chart', title: 'Dashboard & Reports', device: 'laptop', flip: true,
    lead: 'See how your business is doing, for one shop or all of them.',
    points: [
      'Gross sales, net sales, cost of sales and gross profit',
      'Low-stock and negative-stock alerts',
      'Sales by payment type, by employee and by product',
      'Reports for inventory, stock value, low stock, staff and shifts',
      'An income statement with expenses; export lists to CSV, Excel or PDF'
    ]
  },
  {
    id: 'receipts', icon: 'receipt', title: 'Receipts & Refunds', device: 'phone',
    lead: 'Every sale gets a receipt, and mistakes can be put right accurately.',
    points: [
      'Print by browser, USB printer or Bluetooth printer, or email a receipt',
      'Your business name, header, footer and logo on every receipt',
      'Refund item by item, with tax and discount reversed in proportion',
      "Today's Sales at the till for reprints and refunds"
    ]
  }
];

export const FEATURE_GROUPS = [
  { icon: 'clock', title: 'Shifts & Cash Control', points: ['Every cashier works in their own shift with an opening float', 'Count the drawer at close and see any difference', 'A printable shift report and a closed-shifts list for managers', 'Managers can close a shift a cashier left open'] },
  { icon: 'cube', title: 'Inventory & Products', points: ['Products with codes, barcodes, categories and pictures', 'Stock kept separately for each shop', 'Import products from any Excel or CSV file', 'Find free-to-use product pictures from inside the form'] },
  { icon: 'truck', title: 'Purchasing & Stock Movements', points: ['Suppliers and purchase orders (downloadable as PDF)', 'Goods received notes with expiry dates', 'Stock adjustments for counts, damage and corrections', 'Transfer stock between your shops'] },
  { icon: 'store', title: 'Multi-Shop Management', points: ['Run several shops from one account', 'View all shops together or one at a time', 'Assign staff to a shop', 'Each shop has its own stock, shifts and sales'] },
  { icon: 'users', title: 'Customers & Employees', points: ['Customer records with New, Regular and VIP segments', 'Employees with roles and PIN sign-in', 'A calendar to record employee hours', 'Settings that limit what cashiers can do'] },
  { icon: 'gear', title: 'Settings & Payments', points: ['Your tax rate, with prices inclusive or exclusive of tax', 'Choose which payment buttons show at the till', 'Optional second currency with an exchange rate', 'AUREUM records how each sale was paid. It does not process card or mobile payments — use your own terminal alongside.'] },
  { icon: 'lifebuoy', title: 'Help & Data Safety', points: ['AUREUM Bot answers how-to questions inside the app', 'Send a support ticket and read the reply in the app', 'Saves that would delete data are refused', 'Restore points for your records'] }
];

export const FAQ_PRICING = [
  { q: 'Is there a free trial?', a: `Yes — ${PRICING.trialDays} days, with every shop included. You can create your account and start straight away.` },
  { q: 'What happens when the trial ends?', a: `There is a ${PRICING.graceDays}-day grace period, then the app locks until you subscribe. Your records are kept. The account owner subscribes from Settings → Billing & Subscription.` },
  { q: 'How do I pay?', a: 'By card, through Stripe. Your card details go to Stripe — AUREUM never stores them. Subscriptions are billed in US dollars.' },
  { q: 'What if I add or remove a shop?', a: `Adding a shop adds $${PRICING.perShop} a month — you see the new total and confirm before you are charged, and if the payment fails the shop is not added. Removing a shop lowers your next invoice by $${PRICING.perShop}.` },
  { q: 'Can I cancel?', a: 'Yes. The account owner can manage the card or cancel from Settings → Billing & Subscription. You keep access until the period you have paid for ends.' }
];

export const FAQ_SUPPORT = [
  { q: 'I forgot my password.', a: 'On the sign-in screen choose “Forgot password?”, enter the email on your account and follow the link you receive.' },
  { q: 'A cashier forgot their PIN.', a: 'The owner or an administrator can change it: Back Office → Employees → open the employee → PIN → Save employee. A PIN is exactly 4 digits.' },
  { q: 'Do my staff need their own accounts?', a: 'No. Staff sign in at the POS with their name and PIN. The owner uses the email and password.' },
  { q: 'Does AUREUM work without internet?', a: 'Once opened with internet at least once, yes. The till keeps selling and sales sync automatically when the connection returns.' },
  { q: 'My printer is not printing.', a: 'USB printing needs Chrome or Edge on a computer. Bluetooth printers must be paired to the device first. You can always use the browser’s print option.' }
];
