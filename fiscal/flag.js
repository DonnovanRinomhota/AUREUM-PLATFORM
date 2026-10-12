/* Fiscalisation master switch. While true, fiscalisation is shown greyed out as "Coming soon" in the Back Office and the till
   does nothing fiscal at all (no lookups, no submissions, no receipt wording). To launch: set it to false (and bump the service-worker version).
   Tests pre-set window.FISCAL_COMING_SOON to exercise the real screens; the database gates (approved integrations only) apply either way. */
if(typeof window !== 'undefined' && typeof window.FISCAL_COMING_SOON === 'undefined') window.FISCAL_COMING_SOON = false;
