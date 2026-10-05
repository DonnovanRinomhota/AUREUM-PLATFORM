-- ============================================================
-- AUREUM — Platform Control Panel schema (Phase 12)
-- Run once in Supabase Dashboard → SQL Editor → New query.
-- Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- Run schema.sql and billing-schema.sql first if you haven't.
-- ============================================================

-- ---------- 1. Complimentary ("exempt") access flag on businesses ----------

alter table public.businesses add column if not exists is_exempt boolean not null default false;
alter table public.businesses add column if not exists exempt_note text;

-- ---------- 2. Who is allowed to use the control panel ----------
-- Only the edge function (service role) ever reads or writes this table.
-- RLS is enabled with NO policies, so the browser can never touch it.

create table if not exists public.platform_admins (
  email text primary key,
  is_super boolean not null default false,   -- super admins can add/remove other admins
  added_by text,
  created_at timestamptz not null default now()
);

-- Emails are always stored lowercase so matching is exact.
create or replace function public.platform_admins_lower()
returns trigger language plpgsql as $$
begin
  new.email := lower(trim(new.email));
  return new;
end;
$$;
drop trigger if exists platform_admins_lower_trg on public.platform_admins;
create trigger platform_admins_lower_trg
  before insert or update on public.platform_admins
  for each row execute function public.platform_admins_lower();

alter table public.platform_admins enable row level security;

-- ---------- 3. Audit log of every action taken in the control panel ----------

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,
  business_id uuid,
  business_name text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
alter table public.admin_audit_log enable row level security;

-- ---------- 4. Server-only helpers (these join auth.users to get owner emails) ----------

create or replace function public.admin_list_businesses(
  p_search text default '',
  p_status text default '',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, name text, subscription_status text, trial_ends_at timestamptz,
  current_period_end timestamptz, billing_processor text, is_exempt boolean,
  exempt_note text, created_at timestamptz, owner_email text, owner_name text,
  total_count bigint
)
language sql security definer set search_path = public, auth as $$
  select
    b.id, b.name, b.subscription_status, b.trial_ends_at, b.current_period_end,
    b.billing_processor, b.is_exempt, b.exempt_note, b.created_at,
    u.email::text as owner_email, p.full_name as owner_name,
    count(*) over() as total_count
  from public.businesses b
  left join public.profiles p on p.business_id = b.id and p.role = 'owner'
  left join auth.users u on u.id = p.id
  where
    (coalesce(p_search,'') = ''
      or b.name ilike '%' || p_search || '%'
      or u.email ilike '%' || p_search || '%'
      or p.full_name ilike '%' || p_search || '%')
    and (coalesce(p_status,'') = ''
      or (p_status = 'exempt' and b.is_exempt)
      or (p_status <> 'exempt' and b.subscription_status = p_status))
  order by b.created_at desc
  limit greatest(least(p_limit, 100), 1)
  offset greatest(p_offset, 0)
$$;

create or replace function public.admin_subscription_summary()
returns table (key text, n bigint)
language sql security definer set search_path = public as $$
  select 'total'::text as key, count(*)::bigint as n from public.businesses
  union all
  select subscription_status, count(*)::bigint from public.businesses group by subscription_status
  union all
  select 'exempt', count(*)::bigint from public.businesses where is_exempt
$$;

-- Supabase grants execute on new functions to everyone by default — take it
-- back so ONLY the edge function (service role) can call these.
revoke all on function public.admin_list_businesses(text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_subscription_summary() from public, anon, authenticated;
grant execute on function public.admin_list_businesses(text, text, int, int) to service_role;
grant execute on function public.admin_subscription_summary() to service_role;

-- ---------- 5. Hardening: stop clients from creating their own business rows ----------
-- Sign-up creates the business + profile through the on_auth_user_created
-- trigger (SECURITY DEFINER), so these two client-side INSERT policies are no
-- longer needed. Leaving them in would let a signed-in user insert a business
-- row for themselves with is_exempt = true or a far-future trial date.

drop policy if exists "authenticated users can create a business" on public.businesses;
drop policy if exists "users can create their own profile" on public.profiles;

-- ---------- 6. Give control panel access to one or more emails ----------
-- Run this AFTER everything above has run successfully, and on its own.
-- List as many emails as you like: true = super admin (can add/remove other
-- admins), false = regular admin. Each email needs an AUREUM account with a
-- confirmed email. Running it again is safe — existing emails are skipped.
--
-- insert into public.platform_admins (email, is_super) values
--   ('you@example.com',       true),
--   ('partner@example.com',   false),
--   ('colleague@example.com', false)
-- on conflict (email) do nothing;
--
-- Check who has access:
--   select email, is_super from public.platform_admins order by created_at;
