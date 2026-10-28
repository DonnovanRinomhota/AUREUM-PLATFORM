import { APP } from '../config.js';
import { linkButton } from './ui.js';

/* Right under the header on every page: people who already use AUREUM can log in or open the Back Office / POS straight away. */
export const productAccess = () => `<section class="access" aria-label="Open the AUREUM application">
  <div class="wrap access-in">
    <p class="access-text">Already on AUREUM?</p>
    <div class="access-links">
      ${linkButton({ label: 'Log in', href: APP.signIn, kind: 'ghost', size: 'md' })}
      ${linkButton({ label: 'Back Office', href: APP.backOffice, kind: 'outline', size: 'md' })}
      ${linkButton({ label: 'Open POS', href: APP.pos, kind: 'outline', size: 'md' })}
    </div>
  </div>
</section>`;
