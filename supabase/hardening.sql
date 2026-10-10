-- AUREUM database hardening — safe to run once on an existing project (and again: it changes nothing the second time).
-- The two helper functions that every security rule leans on now run with a fixed search path, so no other schema can shadow
-- the tables they read. Nothing about how AUREUM behaves changes.
alter function public.current_business_id() set search_path = public, pg_temp;
alter function public.current_role()        set search_path = public, pg_temp;
