import { SUPPORT, APP } from '../config.js';
import { pageHero } from '../components/sections.js';
import { esc } from '../components/ui.js';

export const deleteAccount = {
  path: '/delete-account/', file: 'delete-account/index.html', active: '',
  title: 'Delete your account | AUREUM POS & Inventory Management',
  description: 'How to ask AUREUM to delete your account and business data, what is deleted and what is kept.',
  body: () => pageHero('DELETE YOUR ACCOUNT', 'Ask us to delete your AUREUM account', 'For the AUREUM Back Office and AUREUM POS apps') + `
<section class="panel light about-sec"><div class="wrap"><div class="prose rv">
  <p>Only the <strong>business owner</strong> can ask for the account and its data to be deleted. Staff who only use the POS should ask the owner.</p>

  <h2>How to request deletion</h2>
  <ol>
    <li>Sign in to the Back Office with the owner’s email and password (<a href="${esc(APP.signIn)}">sign in</a>).</li>
    <li>Open <strong>Help &amp; support</strong> (bottom of the left menu) and send a ticket with the subject <strong>“Delete my account”</strong>.</li>
    ${SUPPORT.email ? `<li>Or email <a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a> from the email address on the account, with the subject “Delete my account”.</li>` : ''}
    <li>We confirm it is you, then delete the account.</li>
  </ol>
  <p>If you cannot sign in, use <strong>Forgot password?</strong> on the sign-in screen first, or contact us${SUPPORT.email ? '' : ' by the first method once you can sign in'}.</p>

  <h2>What is deleted</h2>
  <ul>
    <li>The owner login, and all staff logins and PINs of the business.</li>
    <li>Shops, products, images, stock, suppliers, purchase orders, customers, employees, shifts, sales, receipts, refunds, expenses and settings.</li>
    <li>Your support tickets.</li>
  </ul>

  <h2>What may be kept</h2>
  <ul>
    <li>Payment and invoice records held by Stripe, which Stripe must keep under financial rules.</li>
    <li>Encrypted backups, which are overwritten on a regular cycle (usually within 30 days).</li>
    <li>Information we must keep to follow the law or to prevent fraud.</li>
  </ul>

  <h2>Before you delete</h2>
  <p>Deletion cannot be undone. Export any reports you need first (Back Office → Reports / Accounting). Cancel any active subscription from your account on the website so you are not charged again.</p>

  <p>See also: <a href="/privacy/">Privacy Policy</a>.</p>
</div></div></section>`
};
