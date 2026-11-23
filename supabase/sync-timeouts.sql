-- AUREUM — give saves more time before Supabase cancels them ("canceling statement due to statement timeout")
-- NOT RUN. Review, then run once in Supabase → SQL Editor. Safe to run again.
--
-- Every save takes the business's row lock and rewrites the whole business document. When several tills (or a till plus
-- the Back Office) save at the same moment, the later ones queue behind the first, and a queued save can pass the
-- default limit for the "authenticated" role (often 8 seconds) before it even starts. The app then shows "sync problem"
-- and retries, and a change made at that moment can take a while to land.
alter role authenticated set statement_timeout = '30s';
notify pgrst, 'reload config';
-- To go back:  alter role authenticated reset statement_timeout;  notify pgrst, 'reload config';
