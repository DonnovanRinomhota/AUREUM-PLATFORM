-- ============================================================
-- AUREUM — Data safety (Phase 14)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run again. Run schema.sql first if you haven't.
--
-- WHY: the apps used to save by REPLACING the whole business document.
-- The till doesn't know about expenses / purchase orders / goods received /
-- adjustments / transfers, so every sale deleted them. This file makes the
-- database itself refuse that, and keeps rolling backups.
-- ============================================================

-- ---------- 1. Version number, so a save can say "I read version N" ----------

alter table public.business_data add column if not exists version bigint not null default 0;

-- ---------- 2. Rolling history (recovery point if something ever goes wrong) ----------
-- One snapshot of the PREVIOUS document at most every 6 hours, newest 12 kept
-- (about three days). Nobody can read this from the apps; it exists so that
-- data can be restored from SQL. Raise/lower the two numbers in
-- save_business_data below to trade storage for history.

create table if not exists public.business_data_history (
  id bigserial primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  version bigint not null,
  data jsonb not null,
  saved_by uuid,
  saved_at timestamptz not null default now()
);
create index if not exists business_data_history_idx on public.business_data_history (business_id, saved_at desc);
alter table public.business_data_history enable row level security;   -- no policies: closed to the apps

-- ---------- 3. The safe save ----------
-- Called by the apps instead of overwriting the row. It only succeeds if the
-- document is still at the version the app read; otherwise it reports a
-- conflict and the app re-reads, merges and tries again.

create or replace function public.save_business_data(p_data jsonb, p_expected_version bigint default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_bid uuid;
  v_cur bigint;
  v_old jsonb;
  v_last timestamptz;
begin
  v_bid := public.current_business_id();
  if v_bid is null then
    raise exception 'No business is linked to this account' using errcode = '42501';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'p_data must be a JSON object' using errcode = '22023';
  end if;

  insert into public.business_data (business_id, data, version)
  values (v_bid, '{}'::jsonb, 0)
  on conflict (business_id) do nothing;

  select version, data into v_cur, v_old
  from public.business_data where business_id = v_bid for update;      -- one saver at a time

  if p_expected_version is not null and v_cur <> p_expected_version then
    return jsonb_build_object('ok', false, 'version', v_cur);          -- someone saved first: re-read and retry
  end if;

  -- Never allow a save that would remove a section the server already holds.
  if exists (select 1 from jsonb_object_keys(v_old) k where not (p_data ? k)) then
    raise exception 'Refusing to save: it would remove existing data sections (%).',
      (select string_agg(k, ', ') from jsonb_object_keys(v_old) k where not (p_data ? k))
      using errcode = 'P0001';
  end if;

  select max(saved_at) into v_last from public.business_data_history where business_id = v_bid;
  if v_last is null or v_last < now() - interval '6 hours' then        -- ← snapshot spacing
    insert into public.business_data_history (business_id, version, data, saved_by)
    values (v_bid, v_cur, v_old, auth.uid());
    delete from public.business_data_history
    where business_id = v_bid
      and id not in (select id from public.business_data_history where business_id = v_bid order by saved_at desc limit 12);   -- ← how many kept
  end if;

  perform set_config('aureum.safe_save', '1', true);                   -- tells the guard below this is the trusted path
  update public.business_data
     set data = p_data, version = v_cur + 1, updated_at = now()
   where business_id = v_bid;
  perform set_config('aureum.safe_save', '0', true);                   -- trusted path ends here, whatever surrounds this call

  return jsonb_build_object('ok', true, 'version', v_cur + 1);
end;
$$;

revoke all on function public.save_business_data(jsonb, bigint) from public, anon;
grant execute on function public.save_business_data(jsonb, bigint) to authenticated;

-- ---------- 4. Guard: refuse the OLD, destructive way of saving ----------
-- Any app version still running the old code (an un-refreshed browser tab)
-- tries to replace the whole document. If that would drop a section, the
-- database now rejects it instead of silently deleting your records. The
-- old app shows "Sync problem" until it is refreshed (Ctrl+Shift+R).

create or replace function public.business_data_guard()
returns trigger language plpgsql as $$
begin
  if current_setting('aureum.safe_save', true) is distinct from '1' then
    if exists (select 1 from jsonb_object_keys(old.data) k where not (new.data ? k)) then
      raise exception 'Refusing to overwrite business data: this update would remove existing sections. Refresh the app (Ctrl+Shift+R) to get the latest version.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists business_data_guard_trg on public.business_data;
create trigger business_data_guard_trg
  before update on public.business_data
  for each row execute function public.business_data_guard();

-- ---------- 5. (Optional, later) Lock the old write path completely ----------
-- Once every device has been refreshed onto the new version you can also
-- remove the apps' direct write permission so ONLY save_business_data works:
--
--   drop policy if exists "members can update business_data" on public.business_data;
--   drop policy if exists "members can insert business_data" on public.business_data;
--
-- Don't run these until all tills/browsers have refreshed.

-- ---------- 6. How to restore from history (SQL, if you ever need it) ----------
--   select id, version, saved_at, jsonb_array_length(data->'purchaseOrders') as pos,
--          jsonb_array_length(data->'expenses') as expenses
--   from public.business_data_history where business_id = '<your business id>' order by saved_at desc;
--
--   -- restore one snapshot (replace 123 with its id):
--   select set_config('aureum.safe_save','1',true);
--   update public.business_data bd set data = h.data, version = bd.version + 1
--     from public.business_data_history h where h.id = 123 and bd.business_id = h.business_id;
