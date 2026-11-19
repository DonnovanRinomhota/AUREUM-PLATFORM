-- =====================================================================
-- google-play-billing.sql — subscriptions bought INSIDE the Android app (Google Play Billing).
-- Run once in the Supabase SQL Editor, AFTER shop-billing.sql. Safe to run again.
-- (Nothing here changes existing Stripe/card businesses.)
--
-- Model: ONE shop = ONE Google Play subscription (aureum_shop_1 … aureum_shop_10, $5/month each).
-- The edge function `billing-play` checks every purchase with Google and writes the result here.
--
--   play_subscriptions   one row per Google purchase token a business has owned
--                        (owners can READ their own rows; only the edge function writes them)
--   businesses.billing_processor can now also be 'google_play'
--   the shop-limit rule from shop-billing.sql now also applies to 'google_play' subscriptions
-- =====================================================================

create table if not exists public.play_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id text not null,                 -- aureum_shop_1 … aureum_shop_10
  slot integer not null check (slot between 1 and 10),
  purchase_token text not null unique,      -- Google's token; unique so one purchase can't be claimed by two businesses
  state text,                               -- Google's subscriptionState (ACTIVE, CANCELED, IN_GRACE_PERIOD, ON_HOLD, EXPIRED …)
  expiry timestamptz,
  auto_renewing boolean,
  latest_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists play_subscriptions_business_idx on public.play_subscriptions (business_id);

alter table public.play_subscriptions enable row level security;

drop policy if exists "owners can view their own play subscriptions" on public.play_subscriptions;
create policy "owners can view their own play subscriptions"
  on public.play_subscriptions for select
  using (business_id = public.current_business_id() and public.current_role() = 'owner');
-- no insert/update/delete policy on purpose: only the edge function (service role) writes here.

-- the "refuse to ADD a shop beyond what is paid for" rule now covers Google Play subscriptions too
create or replace function public.business_data_shop_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  b record;
  old_n integer := public.shop_count_of(old.data);
  new_n integer := public.shop_count_of(new.data);
begin
  if new_n > old_n then
    select subscription_status, billing_processor, is_exempt, shops_paid
      into b from public.businesses where id = new.business_id;
    if found
       and not coalesce(b.is_exempt, false)
       and b.billing_processor in ('stripe', 'google_play')
       and b.subscription_status in ('active', 'past_due')
       and new_n > coalesce(b.shops_paid, 1) then
      raise exception 'SHOP_LIMIT: your subscription covers % shop(s). Add a shop from Settings > Stores to pay for it.', coalesce(b.shops_paid, 1)
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
