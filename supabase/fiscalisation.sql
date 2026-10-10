-- ============================================================
-- AUREUM — Fiscalisation (physical fiscal device) — ADDITIVE migration
-- Run once in Supabase Dashboard → SQL Editor. Safe to re-run.
-- Touches NO existing table, policy or data. Undo: fiscalisation-rollback.sql
-- Needs public.current_business_id() and public.current_role() from schema.sql.
--
-- Tenancy: AUREUM's membership model is per BUSINESS (profiles.business_id);
-- shops live inside the business, so every row carries business_id + the shop
-- name. A user can only reach rows of their own business.
-- Secrets: NOTHING secret is stored here. API keys / certificates / passwords
-- belong in Supabase secrets (edge functions). A CHECK stops secret-looking
-- keys being saved in the connection settings.
-- ============================================================

-- 1) Per-shop switch (optional feature: absent row = disabled)
create table if not exists public.fiscal_shop_settings (
  business_id uuid not null references public.businesses(id) on delete cascade,
  shop        text not null,
  enabled     boolean not null default false,
  updated_by  uuid references auth.users(id),
  updated_at  timestamptz not null default now(),
  primary key (business_id, shop)
);

-- 2) Registered fiscal devices (never hard-deleted by the app: deactivate instead)
create table if not exists public.fiscal_devices (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses(id) on delete cascade,
  shop               text not null,
  name               text not null check (length(btrim(name)) between 1 and 80),
  manufacturer       text,
  model              text,
  serial_number      text,
  zimra_device_id    text,                                  -- ZIMRA registration identifier, if any
  connection_type    text not null check (connection_type in ('usb','network','vendor_api','local_connector')),
  connection         jsonb not null default '{}'::jsonb,    -- NON-secret settings only (host, port, connector URL…)
  adapter            text not null default 'unsupported',   -- which adapter drives it; 'unsupported' = none exists yet
  registration_status text not null default 'unregistered' check (registration_status in ('unregistered','test','registered','deactivated')),
  connection_status  text not null default 'not_configured' check (connection_status in ('not_configured','awaiting_adapter','connected','unreachable','error')),
  last_connected_at  timestamptz,
  active             boolean not null default true,
  deactivated_at     timestamptz,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint fiscal_devices_no_secrets check (
    not (connection ?| array['password','passwd','secret','api_key','apikey','token','private_key','certificate','cert','pin'])
  )
);
create unique index if not exists fiscal_devices_serial_uq on public.fiscal_devices (business_id, shop, serial_number) where serial_number is not null;
create index if not exists fiscal_devices_biz_idx on public.fiscal_devices (business_id, shop);

-- 3) Fiscal transactions: one row per sale / credit note, with an append-only history
create table if not exists public.fiscal_transactions (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  shop             text not null,
  device_id        uuid references public.fiscal_devices(id) on delete restrict,
  receipt_uid      text not null,                       -- the POS sale (receipt) this belongs to
  kind             text not null default 'sale' check (kind in ('sale','credit_note')),
  idempotency_key  text not null,                       -- e.g. 'sale:<receipt_uid>' — prevents duplicate submissions
  state            text not null default 'pending' check (state in
                     ('pending','submitting','fiscalised','rejected','failed','uncertain','not_configured')),
  attempts         integer not null default 0,
  request_snapshot jsonb,                               -- what was handed to the adapter (totals, lines, tax)
  response         jsonb,                               -- the adapter / ZIMRA response, verbatim
  fiscal_ref       text,                                -- fiscal document number / identifier from the response
  verification_code text,
  qr_data          text,
  error_code       text,
  error_message    text,
  history          jsonb not null default '[]'::jsonb,  -- append-only audit trail
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  fiscalised_at    timestamptz,
  unique (business_id, idempotency_key)
);
create index if not exists fiscal_tx_biz_idx on public.fiscal_transactions (business_id, shop, created_at desc);
create index if not exists fiscal_tx_state_idx on public.fiscal_transactions (business_id, state);

-- 4) Guard rails (enforced in the database, not just the app)
create or replace function public.fiscal_tx_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.business_id <> old.business_id or new.idempotency_key <> old.idempotency_key
       or new.receipt_uid <> old.receipt_uid or new.kind <> old.kind or new.shop <> old.shop then
      raise exception 'fiscal transaction identity cannot be changed';
    end if;
    if old.state in ('fiscalised','rejected') and (new.state <> old.state or new.fiscal_ref is distinct from old.fiscal_ref) then
      raise exception 'a % fiscal transaction is final', old.state;
    end if;
    if old.state = 'uncertain' and new.state = 'submitting' then
      raise exception 'an uncertain transaction must be status-checked, not re-submitted';
    end if;
    if new.attempts < old.attempts then raise exception 'attempts cannot go down'; end if;
    if jsonb_array_length(new.history) < jsonb_array_length(old.history) then
      raise exception 'fiscal history is append-only';
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists fiscal_tx_guard_trg on public.fiscal_transactions;
create trigger fiscal_tx_guard_trg before update on public.fiscal_transactions for each row execute function public.fiscal_tx_guard();

create or replace function public.fiscal_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists fiscal_devices_touch on public.fiscal_devices;
create trigger fiscal_devices_touch before update on public.fiscal_devices for each row execute function public.fiscal_touch();

-- 5) Row Level Security
alter table public.fiscal_shop_settings enable row level security;
alter table public.fiscal_devices       enable row level security;
alter table public.fiscal_transactions  enable row level security;

-- read: any member of the business (the till needs to know if a shop is fiscalised)
drop policy if exists "members read fiscal_shop_settings" on public.fiscal_shop_settings;
create policy "members read fiscal_shop_settings" on public.fiscal_shop_settings for select using (business_id = public.current_business_id());
drop policy if exists "members read fiscal_devices" on public.fiscal_devices;
create policy "members read fiscal_devices" on public.fiscal_devices for select using (business_id = public.current_business_id());
drop policy if exists "members read fiscal_transactions" on public.fiscal_transactions;
create policy "members read fiscal_transactions" on public.fiscal_transactions for select using (business_id = public.current_business_id());

-- configure: owners and managers only (no delete policy at all → nothing can be deleted by clients)
drop policy if exists "owners managers insert fiscal_shop_settings" on public.fiscal_shop_settings;
create policy "owners managers insert fiscal_shop_settings" on public.fiscal_shop_settings for insert
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
drop policy if exists "owners managers update fiscal_shop_settings" on public.fiscal_shop_settings;
create policy "owners managers update fiscal_shop_settings" on public.fiscal_shop_settings for update
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
drop policy if exists "owners managers insert fiscal_devices" on public.fiscal_devices;
create policy "owners managers insert fiscal_devices" on public.fiscal_devices for insert
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
drop policy if exists "owners managers update fiscal_devices" on public.fiscal_devices;
create policy "owners managers update fiscal_devices" on public.fiscal_devices for update
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

-- transactions are written by whoever completes the sale (cashiers included); identity/finality is guarded by the trigger
drop policy if exists "members insert fiscal_transactions" on public.fiscal_transactions;
create policy "members insert fiscal_transactions" on public.fiscal_transactions for insert
  with check (business_id = public.current_business_id());
drop policy if exists "members update fiscal_transactions" on public.fiscal_transactions;
create policy "members update fiscal_transactions" on public.fiscal_transactions for update
  using (business_id = public.current_business_id()) with check (business_id = public.current_business_id());

grant select, insert, update on public.fiscal_shop_settings, public.fiscal_devices, public.fiscal_transactions to authenticated;
