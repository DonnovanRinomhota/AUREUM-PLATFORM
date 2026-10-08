import { APP, SUPPORT, FAQ_SUPPORT } from '../config.js';
import { pageHero, ctaBand } from '../components/sections.js';
import { linkButton, faq, esc } from '../components/ui.js';
import { icon } from '../components/icons.js';

const contact = () => {
  const rows = [];
  if (SUPPORT.email) rows.push(`<li><span>Email</span><a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a></li>`);
  if (SUPPORT.phone) rows.push(`<li><span>Phone</span><a href="tel:${esc(SUPPORT.phone.replace(/\s+/g, ''))}">${esc(SUPPORT.phone)}</a></li>`);
  if (SUPPORT.whatsapp) rows.push(`<li><span>WhatsApp</span><a href="https://wa.me/${esc(SUPPORT.whatsapp.replace(/\D/g, ''))}" rel="noopener">${esc(SUPPORT.whatsapp)}</a></li>`);
  return rows.length ? `<ul class="contact-list">${rows.join('')}</ul>` : '';
};

export const support = {
  path: '/support/', file: 'support/index.html', active: 'support',
  title: 'Support | AUREUM POS & Inventory Management',
  description: 'Get help with AUREUM: signing in, staff PINs, using the POS and Back Office, and contacting the AUREUM team through Help & support.',
  body: () => pageHero('SUPPORT', 'Help with AUREUM', 'Sign-in help, how-to answers and a way to reach the AUREUM team.') + `
<section class="support-sec"><div class="wrap sup-grid">
  <article class="fg-card rv"><span class="ic-ring">${icon('lifebuoy', 24)}</span><h2>Help inside AUREUM</h2>
    <p>Sign in to the Back Office and open <strong>Help &amp; support</strong> at the bottom of the left menu.</p>
    <ul class="plain"><li><strong>AUREUM Bot</strong> answers how-to questions about every part of the app.</li><li>If the Bot can't help, send a <strong>support ticket</strong>. The AUREUM team replies inside the ticket, and a red dot tells you when there is a reply.</li></ul>
    ${linkButton({ label: 'Log in to get help', href: APP.signIn, size: 'md', arrow: true })}</article>
  <article class="fg-card rv"><span class="ic-ring">${icon('users', 24)}</span><h2>Can't sign in?</h2>
    <ul class="plain"><li><strong>Owner:</strong> use the email and password you created. Choose <strong>Forgot password?</strong> on the sign-in screen and follow the emailed link.</li><li><strong>Cashier:</strong> staff sign in at the POS with their name and a 4-digit PIN, not with an email. The owner can change a PIN under Employees.</li></ul>
    ${linkButton({ label: 'Go to Log in', href: APP.signIn, kind: 'outline', size: 'md' })}</article>
  <article class="fg-card rv"><span class="ic-ring">${icon('cart', 24)}</span><h2>New to AUREUM?</h2>
    <p>Create your business account, add your products and staff in the Back Office, then open the POS and start selling.</p>
    <div class="sup-actions">${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'md', arrow: true })}${linkButton({ label: 'See the features', href: '/features/', kind: 'outline', size: 'md' })}</div></article>
</div>
${contact() ? `<div class="wrap narrow contact-box rv"><h2 class="side-title">Contact the AUREUM team</h2>${contact()}</div>` : ''}
</section>
<section class="faq-sec"><div class="wrap narrow"><h2 class="section-title with-rules"><span>Quick answers</span></h2>${faq(FAQ_SUPPORT)}</div></section>` + ctaBand()
};
