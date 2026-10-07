-- =====================================================================
-- shop-billing.sql — AUREUM is $5 per shop, per month (Stripe only).
-- Run once in the Supabase SQL Editor, AFTER schema.sql, billing-schema.sql,
-- admin-schema.sql and data-safety.sql. Safe to run again.
--
-- What it adds
--   businesses.shops_paid  how many shops the Stripe subscription covers (its quantity)
--   businesses.shop_count  how many shops the account has right now (kept up to date automatically)
--   a database rule: on a PAID card subscription, a save that would ADD a shop beyond
--   what is covered is refused — so the limit can't be bypassed by editing data directly.
--
-- What it deliberately does NOT do
--   * trial accounts are not limited (every shop is included while on trial; the
--     card checkout then charges $5 x the number of shops)
--   * complimentary (exempt) accounts are not limited
--   * accounts that already have MORE shops than they pay for are not locked out —
--     the rule only stops further ADDITIONS (they are invited to update their plan)
--   * removing shops, renaming, or any save that doesn't increase the number is never blocked
--   * subscriptions that exist from before this change have shops_paid empty, which
--     counts as 1 shop (what a $5 subscription covered)
-- =====================================================================

alter table public.businesses add column if not exists shops_paid integer;
alter table public.businesses add column if not exists shop_count integer not null default 0;

-- the number of shops inside a saved business document
create or replace function public.shop_count_of(p jsonb)
returns integer language sql immutable as $$
  select case when jsonb_typeof(p -> 'shops') = 'array' then jsonb_array_length(p -> 'shops') else 0 end
$$;

-- fill in the current counts for existing businesses
update public.businesses b
   set shop_count = public.shop_count_of(d.data)
  from public.business_data d
 where d.business_id = b.id
   and b.shop_count is distinct from public.shop_count_of(d.data);

-- keep businesses.shop_count in step with every save
create or replace function public.business_data_track_shops()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.businesses
     set shop_count = public.shop_count_of(new.data)
   where id = new.business_id
     and shop_count is distinct from public.shop_count_of(new.data);
  return new;
end;
$$;

drop trigger if exists business_data_track_shops_trg on public.business_data;
create trigger business_data_track_shops_trg
  after insert or update of data on public.business_data
  for each row execute function public.business_data_track_shops();

-- refuse to ADD a shop beyond what a paid card subscription covers
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
       and b.billing_processor = 'stripe'
       and b.subscription_status in ('active', 'past_due')
       and new_n > coalesce(b.shops_paid, 1) then
      raise exception 'SHOP_LIMIT: your subscription covers % shop(s). Add a shop from Settings > Stores to pay for it.', coalesce(b.shops_paid, 1)
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists business_data_shop_limit_trg on public.business_data;
create trigger business_data_shop_limit_trg
  before update of data on public.business_data
  for each row execute function public.business_data_shop_limit();
