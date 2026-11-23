-- =====================================================================
-- receipt-numbers.sql — receipt numbers issued by the DATABASE, one counter per business.
-- Run once in the Supabase SQL Editor (after data-safety.sql). Safe to run again. NOT RUN YET — it needs your approval.
--
-- Why: until now every till worked out "highest number I can see + 1", so two tills selling at the same moment (or one till
-- that had lost sight of its own last sale) could issue the same receipt number. The POS now asks this function for numbers.
-- A till keeps a few reserved numbers on the device, so a sale never waits for the network. Numbers are unique and never
-- reused; a till that closes with unused reserved numbers leaves gaps (a gap is harmless, a duplicate is not).
-- Without this file the POS keeps working: it falls back to the old rule and repairs any clash when tills sync.
-- =====================================================================

create table if not exists public.receipt_counters (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  last_number bigint not null default 511          -- numbering has always started at 0512
);
alter table public.receipt_counters enable row level security;      -- no policies: only reserve_receipt_numbers() touches it

create or replace function public.reserve_receipt_numbers(p_count integer default 1)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bid uuid := public.current_business_id();
  v_start bigint;
  v_count integer := greatest(1, least(coalesce(p_count, 1), 50));
begin
  if v_bid is null then
    raise exception 'No business is linked to this account' using errcode = '42501';
  end if;

  -- first use: start after the highest number already on a receipt (so existing businesses carry on, never restart)
  insert into public.receipt_counters (business_id, last_number)
  select v_bid, greatest(511, coalesce(max(n), 0))
  from (
    select (regexp_replace(r->>'id', '\D', '', 'g'))::bigint as n
    from public.business_data bd, jsonb_array_elements(coalesce(bd.data->'receipts', '[]'::jsonb)) r
    where bd.business_id = v_bid
      and regexp_replace(coalesce(r->>'id', ''), '\D', '', 'g') ~ '^\d{1,8}$'
  ) x
  on conflict (business_id) do nothing;

  update public.receipt_counters
     set last_number = last_number + v_count
   where business_id = v_bid
  returning last_number - v_count + 1 into v_start;

  return jsonb_build_object('numbers', (select jsonb_agg(v_start + g order by g) from generate_series(0, v_count - 1) g));
end;
$$;

revoke all on function public.reserve_receipt_numbers(integer) from public, anon;
grant execute on function public.reserve_receipt_numbers(integer) to authenticated;
