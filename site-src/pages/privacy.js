import { SUPPORT } from '../config.js';
import { pageHero } from '../components/sections.js';
import { esc } from '../components/ui.js';

const contactLine = () => SUPPORT.email
  ? `Email <a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a>, or send a ticket from <strong>Help &amp; support</strong> inside the Back Office.`
  : `Send a ticket from <strong>Help &amp; support</strong> inside the Back Office.`;

export const privacy = {
  path: '/privacy/', file: 'privacy/index.html', active: '',
  title: 'Privacy Policy | AUREUM POS & Inventory Management',
  description: 'How AUREUM collects, uses, stores and deletes information in the AUREUM Back Office and AUREUM POS apps and website.',
  body: () => pageHero('PRIVACY POLICY', 'Your data, in plain words', 'Last updated 15 October 2026') + `
<section class="panel light about-sec"><div class="wrap"><div class="prose rv">
  <p>This policy covers the AUREUM website, the <strong>AUREUM Back Office</strong> app and the <strong>AUREUM POS</strong> app (together, “AUREUM”). AUREUM is a point of sale and inventory service for businesses. The business that signs up (“the owner”) decides what is recorded about its own customers and staff.</p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Account details:</strong> the owner’s name, email address, country, business name and password. Passwords are handled by our sign-in provider and are never visible to us in plain text.</li>
    <li><strong>Business records you enter:</strong> shops, products, prices, costs, stock, suppliers, purchase orders, customers (for example name, phone, email), employees (name, role, PIN), shifts, sales, receipts, refunds, expenses and settings. Product and logo images you upload are stored too.</li>
    <li><strong>Support messages</strong> you send to us through Help &amp; support.</li>
    <li><strong>Subscription status:</strong> whether a trial or subscription is active, its dates and the number of shops. Card payments are taken on Stripe’s own page. <strong>We never see or store your card number.</strong></li>
    <li><strong>Technical data</strong> needed to run the service, such as sign-in sessions and error information held by our hosting and database providers.</li>
  </ul>
  <p>AUREUM does <strong>not</strong> show advertising, does not sell personal information, and does not include advertising trackers. The public website uses Vercel Web Analytics for anonymous visit counts; it sets no cookies and builds no profile of you. The apps do not use it.</p>

  <h2>Why we use it</h2>
  <p>To provide the service you asked for (selling, stock control, reports, staff, receipts), to keep your business data safe and synchronised across your devices, to manage your trial or subscription, to answer support requests and to prevent misuse.</p>

  <h2>Device permissions in the apps</h2>
  <ul>
    <li><strong>Camera</strong> (POS): only to scan product barcodes, and only when you tap Scan. Images are not saved or sent.</li>
    <li><strong>Bluetooth / nearby devices</strong> (POS): only to connect to a receipt printer or cash drawer you choose.</li>
    <li><strong>Photos / files</strong>: only when you choose a product or logo image, or save or share a report or receipt.</li>
    <li><strong>Internet access</strong>: the apps need it to sign in and synchronise.</li>
  </ul>

  <h2>Who processes the data</h2>
  <p>AUREUM uses these service providers to run the service: <strong>Supabase</strong> (database, sign-in and file storage), <strong>Vercel</strong> (hosting of the app and website) and <strong>Stripe</strong> (card subscription payments, on the web). They process data on our behalf. We share data with others only if the law requires it.</p>

  <h2>Security</h2>
  <p>Data is sent over HTTPS. Access to each business’s records is restricted to that business’s signed-in users, and staff permissions limit what each person can do. No system is perfectly secure, but we take care to protect your information.</p>

  <h2>How long we keep it</h2>
  <p>We keep business records while the account is active so that your sales history and accounts stay complete. If you delete your account, your data is deleted as described on the <a href="/delete-account/">Delete your account</a> page. Some records may be kept for a limited time where the law requires it or for security and backups.</p>

  <h2>Your choices and rights</h2>
  <p>You can view and correct your business information in the Back Office, export reports, and ask us to delete your account and data at any time. Customers or staff of a business should ask that business first, because the business controls those records. Depending on where you live, you may have further rights, such as access or objection; ask us and we will help.</p>

  <h2>Children</h2>
  <p>AUREUM is a business tool and is not directed at children.</p>

  <h2>Changes</h2>
  <p>If we change this policy we will update the date above, and tell account owners inside the app when the change is important.</p>

  <h2>Contact</h2>
  <p>${contactLine()}</p>
</div></div></section>`
};
