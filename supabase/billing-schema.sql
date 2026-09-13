-- ============================================================
-- AUREUM — Billing & Subscription schema (Phase 6)
-- Run this once in Supabase Dashboard → SQL Editor → New query
-- (adds to what schema.sql already created — safe to run on an
-- existing database, everything is IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ---------- EXTEND businesses ----------

alter table public.businesses add column if not exists current_period_start timestamptz;
alter table public.businesses add column if not exists current_period_end timestamptz;
alter table public.businesses add column if not exists billing_processor text; -- 'stripe' | 'paynow' | null
alter table public.businesses add column if not exists stripe_customer_id text;
alter table public.businesses add column if not exists stripe_subscription_id text;

-- ---------- subscription_payments (real invoice/payment history) ----------

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  processor text not null,             -- 'stripe' | 'paynow'
  amount numeric not null,
  currency text not null default 'usd',
  status text not null,                -- 'paid' | 'failed' | 'pending'
  period_start timestamptz,
  period_end timestamptz,
  external_reference text,             -- Stripe invoice/session id, or Paynow reference
  created_at timestamptz not null default now()
);

alter table public.subscription_payments enable row level security;

create policy "owners can view their own subscription payments"
  on public.subscription_payments for select
  using (business_id = public.current_business_id() and public.current_role() = 'owner');

-- Only edge functions (service role, which bypasses RLS entirely) insert rows —
-- no client-side insert policy is needed or created here on purpose.
