import { APP, SUPPORT, FAQ_SUPPORT } from '../config.js';
import { ctaBand } from '../components/sections.js';
import { linkButton, faq, esc, secHead } from '../components/ui.js';

const contact = () => {
  const rows = [];
  if (SUPPORT.email) rows.push(`<li><span>Email</span><a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a></li>`);
  if (SUPPORT.phone) rows.push(`<li><span>Phone</span><a href="tel:${esc(SUPPORT.phone.replace(/\s+/g, ''))}">${esc(SUPPORT.phone)}</a></li>`);
  if (SUPPORT.whatsapp) rows.push(`<li><span>WhatsApp</span><a href="https://wa.me/${esc(SUPPORT.whatsapp.replace(/\D/g, ''))}" rel="noopener">${esc(SUPPORT.whatsapp)}</a></li>`);
  return rows.length ? `<ul class="contact-list">${rows.join('')}</ul>` : '';
};

const waLink = (text = '') => SUPPORT.whatsapp ? `https://wa.me/${SUPPORT.whatsapp.replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}` : '';

const hero = () => `<section class="panel dark page-hero sup-hero"><div class="wrap">${secHead('SUPPORT', 'AUREUM POS & INVENTORY')}
<div class="sup-hero-in">
  <div class="sup-hero-text">
    <h1 class="display md">Here for you<br><span class="dim">24/7.</span></h1>
    <p class="sup-reach">Reach out to the AUREUM team.</p>
    <div class="sup-help-box">
      <h2>Need help entering your products or transferring them from your old POS?</h2>
      <p>We are here to do the task for you. Send a ticket, write us an email or reach us on WhatsApp.</p>
    </div>
    <div class="sup-hero-btns">
      <a class="btn btn-gold btn-lg" href="#help" data-aw-open="ticket"><span>Send a ticket</span></a>
      <a class="btn btn-outline btn-lg" href="mailto:${esc(SUPPORT.email)}"><span>Write us an email</span></a>
      ${SUPPORT.whatsapp ? `<a class="btn btn-outline btn-lg" href="${esc(waLink('Hello AUREUM, I need help with my products.'))}" target="_blank" rel="noopener"><span>WhatsApp us</span></a>` : ''}
    </div>
  </div>
  <figure class="sup-photo"><img src="/site/assets/img/support-team.webp" width="1024" height="683" alt="Smiling AUREUM support agent wearing a headset, with two colleagues working behind her" fetchpriority="high"></figure>
</div></div></section>`;

/* the chat + ticket centre; everything inside #aw is built by site/assets/help-widget.js */
const helpCentre = () => `<section class="panel dark aw-sec" id="help" aria-labelledby="help-t"><div class="wrap">${secHead('01 / ASK OR SEND A TICKET', 'Help centre')}
<h2 class="display sm aw-title" id="help-t">Ask AUREUM Bot,<br><span class="dim">or send us a ticket.</span></h2>
<p class="small aw-lead">Get instant answers from AUREUM Bot. If it can’t help, send a ticket and the AUREUM team will reply.</p>
<div class="aw" id="aw" data-api-url="${esc(SUPPORT.api.url)}" data-api-key="${esc(SUPPORT.api.anonKey)}" data-email="${esc(SUPPORT.email)}" data-wa="${esc(SUPPORT.whatsapp.replace(/\D/g, ''))}">
  <p class="aw-fallback">The help chat needs JavaScript. You can still write to us at <a href="mailto:${esc(SUPPORT.email)}">${esc(SUPPORT.email)}</a>.</p>
</div></div></section>`;

export const support = {
  scripts: ['help-widget.js'],
  path: '/support/', file: 'support/index.html', active: 'support',
  title: 'Support | AUREUM POS & Inventory Management',
  description: 'Chat with AUREUM Bot, send a support ticket, or write to the AUREUM team. We can also help you enter your products or move them from your old POS.',
  body: () => hero() + helpCentre() + `
<section class="panel light support-sec"><div class="wrap">${secHead('02 / MORE WAYS IN', 'Three ways in')}<div class="sup-grid">
  <article class="fg-card rv"><h2>Help inside AUREUM</h2>
    <p>Sign in to the Back Office and open <strong>Help &amp; support</strong> at the bottom of the left menu.</p>
    <ul class="plain"><li><strong>AUREUM Bot</strong> answers how-to questions about every part of the app.</li><li>If the Bot can't help, send a <strong>support ticket</strong>. The AUREUM team replies inside the ticket, and a red dot tells you when there is a reply.</li></ul>
    ${linkButton({ label: 'Log in to get help', href: APP.signIn, size: 'md', arrow: true })}</article>
  <article class="fg-card rv"><h2>Can't sign in?</h2>
    <ul class="plain"><li><strong>Owner:</strong> use the email and password you created. Choose <strong>Forgot password?</strong> on the sign-in screen and follow the emailed link.</li><li><strong>Cashier:</strong> staff sign in at the POS with their name and a 4-digit PIN, not with an email. The owner can change a PIN under Employees.</li></ul>
    ${linkButton({ label: 'Go to Log in', href: APP.signIn, kind: 'outline', size: 'md' })}</article>
  <article class="fg-card rv"><h2>New to AUREUM?</h2>
    <p>Create your business account, add your products and staff in the Back Office, then open the POS and start selling.</p>
    <div class="sup-actions">${linkButton({ label: 'Start Free Trial', href: APP.signUp, size: 'md', arrow: true })}${linkButton({ label: 'See the features', href: '/features/', kind: 'outline', size: 'md' })}</div></article>
</div>
${contact() ? `<div class="contact-box rv"><h2 class="side-title">Contact the AUREUM team</h2>${contact()}</div>` : ''}
</div></section>
<section class="panel dark faq-sec"><div class="wrap">${secHead('03 / QUICK ANSWERS', 'Common questions')}<h2 class="display md">Quick<br><span class="dim">answers.</span></h2>${faq(FAQ_SUPPORT)}</div></section>` + ctaBand()
};
