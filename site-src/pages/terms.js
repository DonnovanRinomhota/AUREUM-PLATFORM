import { SUPPORT, PRICING } from '../config.js';
import { pageHero } from '../components/sections.js';
import { esc } from '../components/ui.js';

const contact = () => SUPPORT.email
  ? `Email <a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a>, or send a ticket from <strong>Help &amp; support</strong> inside the Back Office.`
  : `Send a ticket from <strong>Help &amp; support</strong> inside the Back Office.`;

export const terms = {
  path: '/terms/', file: 'terms/index.html', active: '',
  title: 'Terms & Conditions | AUREUM POS & Inventory Management',
  description: 'The terms for using AUREUM: the free trial, subscription, your data, acceptable use and how to cancel.',
  body: () => pageHero('TERMS & CONDITIONS', 'The rules, in plain words', 'Last updated 30 October 2026') + `
<section class="panel light about-sec"><div class="wrap"><div class="prose rv">
  <p>These terms apply when you use the AUREUM website, the <strong>AUREUM Back Office</strong> and the <strong>AUREUM POS</strong> apps (together, “AUREUM”). By creating an account or using AUREUM you agree to them. If you do not agree, please do not use AUREUM.</p>

  <h2>Your account</h2>
  <p>The person who signs up is the account owner and is responsible for the business’s account, for the staff they add, and for keeping passwords and staff PINs private. Please give accurate details and tell us if you think someone has gained access without permission.</p>

  <h2>Free trial, price and payment</h2>
  <ul>
    <li>Every new account has a <strong>${PRICING.trialDays}-day free trial</strong> with every feature and every shop included. No card is needed to start.</li>
    <li>After the trial, AUREUM costs <strong>US$${PRICING.perShop} per shop per month</strong>, paid by card through Stripe. Card details are entered on Stripe’s page; AUREUM never sees or stores them.</li>
    <li>If a payment fails or a subscription ends, access moves to a short grace period of ${PRICING.graceDays} days and then to view-only, so you can still see and export your records.</li>
    <li>You can change the number of shops or cancel at any time from the Back Office billing screen. Cancelling stops future charges; already-paid periods are not refunded unless the law requires it.</li>
    <li>If we change the price we will tell account owners inside the app before the change applies.</li>
  </ul>

  <h2>Your business data</h2>
  <p>You own the records you put into AUREUM (products, sales, customers, staff and so on). You give us permission to store and process them only to run the service for you. How we handle personal information is explained in the <a href="/privacy/">Privacy Policy</a>. You can export your reports, and you can delete your account at any time as described on the <a href="/delete-account/">Delete your account</a> page.</p>
  <p>You are responsible for the accuracy of what you enter and for meeting your own legal duties as a business, such as tax, receipts and keeping records. AUREUM is a tool to help; it is not tax, accounting or legal advice.</p>

  <h2>Acceptable use</h2>
  <p>Please do not use AUREUM to break the law, to harm or deceive others, to attempt to access other businesses’ data, to interfere with or overload the service, or to copy or resell it without our written agreement.</p>

  <h2>Availability and changes</h2>
  <p>We work hard to keep AUREUM running and the till is designed to keep selling when the internet drops, but we cannot promise the service will always be uninterrupted or error-free. We may improve, change or remove features, and we will give notice of important changes inside the app. Keep your own regular exports of important records.</p>

  <h2>Third-party equipment and services</h2>
  <p>Printers, cash drawers, barcode scanners, payment providers and your internet connection are provided by others. AUREUM cannot guarantee that every device or provider will work with it.</p>

  <h2>Limits of our responsibility</h2>
  <p>AUREUM is provided “as is”. To the extent the law allows, we are not responsible for lost profits, lost sales or indirect losses arising from using or being unable to use AUREUM, and our total responsibility for any claim is limited to the amount you paid us in the 3 months before it arose. Nothing in these terms limits rights you have under the law that cannot be limited.</p>

  <h2>Ending your use</h2>
  <p>You can stop using AUREUM at any time. We may suspend or close an account that breaks these terms or is used for fraud or abuse, and we will tell you why where we can.</p>

  <h2>Changes to these terms</h2>
  <p>If we change these terms we will update the date above and tell account owners inside the app when the change is important. Using AUREUM after a change means you accept it.</p>

  <h2>Contact</h2>
  <p>${contact()}</p>
</div></div></section>`
};
