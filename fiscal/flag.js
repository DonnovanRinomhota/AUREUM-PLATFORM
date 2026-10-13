/* Fiscalisation master switch. When true, fiscalisation is shown greyed out as "Coming soon" in the Back Office and the till
   does nothing fiscal at all (no lookups, no submissions, no receipt wording). Currently false = fiscalisation is live. To grey it out again: set it to true (and bump the service-worker version).
   Tests pre-set window.FISCAL_COMING_SOON to exercise the real screens; the database gates (approved integrations only) apply either way. */
if(typeof window !== 'undefined' && typeof window.FISCAL_COMING_SOON === 'undefined') window.FISCAL_COMING_SOON = false;
