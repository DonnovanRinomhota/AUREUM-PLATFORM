-- ============================================================
-- AUREUM POS — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ---------- TABLES ----------

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_status text not null default 'trial', -- 'trial' | 'active' | 'suspended'
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  role text not null default 'cashier', -- 'owner' | 'manager' | 'cashier'
  full_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.business_data (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  stripe_secret_key text,
  stripe_publishable_key text,
  paynow_integration_id text,
  paynow_integration_key text,
  updated_at timestamptz not null default now()
);

-- ---------- HELPER (avoids recursive RLS lookups) ----------

create or replace function public.current_business_id()
returns uuid
language sql
security definer
stable
as $$
  select business_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- RLS ----------

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.business_data enable row level security;
alter table public.payment_settings enable row level security;

-- businesses: any signed-in member of the business can read it;
-- only Supabase service-role (edge functions) writes subscription fields.
create policy "members can view their business"
  on public.businesses for select
  using (id = public.current_business_id());

-- profiles: a user can see co-workers in the same business, and their own row
create policy "members can view business profiles"
  on public.profiles for select
  using (business_id = public.current_business_id());

create policy "users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- profiles insert happens via sign-up (businesses.insert + profiles.insert
-- run as the newly authenticated user, so allow inserting your own row):
create policy "users can create their own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- businesses insert: any authenticated user may create ONE new business
-- (this is what "Create Business" sign-up does)
create policy "authenticated users can create a business"
  on public.businesses for insert
  with check (auth.uid() is not null);

-- business_data: any member of the business can read/write the shared cache
create policy "members can view business_data"
  on public.business_data for select
  using (business_id = public.current_business_id());

create policy "members can update business_data"
  on public.business_data for update
  using (business_id = public.current_business_id());

create policy "members can insert business_data"
  on public.business_data for insert
  with check (business_id = public.current_business_id());

-- payment_settings: owners/managers only (matches the Back Office UI copy)
create policy "owners and managers can view payment_settings"
  on public.payment_settings for select
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

create policy "owners and managers can upsert payment_settings"
  on public.payment_settings for insert
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

create policy "owners and managers can update payment_settings"
  on public.payment_settings for update
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

-- ---------- REALTIME ----------
-- Lets the POS see Back Office edits (and vice versa) live.
alter publication supabase_realtime add table public.business_data;
