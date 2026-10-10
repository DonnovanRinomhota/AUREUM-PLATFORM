-- ============================================================
-- AUREUM — Fiscalisation v2: multi-country integrations (ADDITIVE migration)
-- Run AFTER supabase/fiscalisation.sql. Safe to re-run. Touches no existing AUREUM data.
-- Undo: supabase/fiscalisation-v2-rollback.sql
--
-- * fiscal_integrations  platform-level catalogue of country + device integrations and their status
--                        (disabled → in_development → testing → approved). Shop owners can only SEE approved rows.
--                        Written only by the admin-manage edge function (service role).
-- * fiscal_shop_settings / fiscal_devices get country, authority, integration and version columns.
-- * Enabling fiscalisation for a shop requires an APPROVED integration for that shop's country (enforced here).
-- * fiscal_audit_log     append-only record of every settings / device change and who made it.
-- ============================================================

-- 1) Integration catalogue
create table if not exists public.fiscal_integrations (
  id                  text primary key,                                  -- e.g. 'zw-zimra-fdms'
  kind                text not null check (kind in ('country','device')),
  country             text check (country is null or country ~ '^[A-Z]{2}$'),   -- country integrations
  countries           text[] not null default '{}',                       -- device integrations: countries it may be used in
  name                text not null,
  authority           text,
  jurisdiction        text,
  adapter_id          text not null,
  integration_version text,
  status              text not null default 'disabled' check (status in ('disabled','in_development','testing','approved')),
  docs_verified       boolean not null default false,
  docs_reference      text,
  docs_verified_at    timestamptz,
  approval_reference  text,                                               -- e.g. the authority's approval / test sign-off reference
  notes               text,
  updated_by          text,
  updated_at          timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  constraint fiscal_integrations_kind_ok check ((kind = 'country' and country is not null) or (kind = 'device')),
  -- an integration cannot be 'testing' or 'approved' unless its documentation was verified; 'approved' also needs an approval reference
  constraint fiscal_integrations_gate check (
    status in ('disabled','in_development')
    or (status = 'testing' and docs_verified)
    or (status = 'approved' and docs_verified and coalesce(btrim(approval_reference), '') <> '')
  )
);
alter table public.fiscal_integrations enable row level security;
drop policy if exists "members read approved fiscal_integrations" on public.fiscal_integrations;
create policy "members read approved fiscal_integrations" on public.fiscal_integrations for select to authenticated using (status = 'approved');
-- no insert / update / delete policy: only the service role (admin-manage function) can change the catalogue
grant select on public.fiscal_integrations to authenticated;

create or replace function public.fiscal_integrations_touch() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists fiscal_integrations_touch_trg on public.fiscal_integrations;
create trigger fiscal_integrations_touch_trg before update on public.fiscal_integrations for each row execute function public.fiscal_integrations_touch();

-- Seed: Zimbabwe is IN DEVELOPMENT (not approved). Nothing else is seeded: other countries stay absent until their documentation is checked.
insert into public.fiscal_integrations (id, kind, country, countries, name, authority, jurisdiction, adapter_id, integration_version, status, docs_reference, notes)
values
 ('zw-zimra-fdms', 'country', 'ZW', '{}', 'Zimbabwe — ZIMRA FDMS', 'Zimbabwe Revenue Authority (ZIMRA)', 'Zimbabwe', 'zw', 'FDMS Fiscal Device Gateway API v7.2 (adapter 0.1-draft)', 'in_development',
  'ZIMRA Fiscal Device Gateway API Specification v7.2', 'Mapping + validation written from the public spec; signing, QR and FDMS transport NOT implemented. See FISCALISATION.md.'),
 ('zw-virtual-fdms', 'device', null, '{ZW}', 'ZIMRA virtual fiscal device (API)', 'Zimbabwe Revenue Authority (ZIMRA)', 'Zimbabwe', 'zw-virtual-fdms', '0.1-draft', 'in_development',
  'ZIMRA Public Notice 26 of 2024', 'Needs the server-side FDMS gateway (certificate, signing, fiscal day) — not built yet.')
on conflict (id) do nothing;

-- 2) Country / authority / integration on the shop switch and on devices
alter table public.fiscal_shop_settings add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');
alter table public.fiscal_shop_settings add column if not exists jurisdiction text;
alter table public.fiscal_shop_settings add column if not exists authority text;
alter table public.fiscal_shop_settings add column if not exists integration_id text references public.fiscal_integrations(id);
alter table public.fiscal_shop_settings add column if not exists integration_version text;

alter table public.fiscal_devices add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');
alter table public.fiscal_devices add column if not exists authority text;
alter table public.fiscal_devices add column if not exists integration_id text references public.fiscal_integrations(id);
alter table public.fiscal_devices add column if not exists adapter_version text;

-- 3) Gate: a shop can only be switched ON with an approved integration for its country (checked on every change that could enable it)
create or replace function public.fiscal_shop_gate() returns trigger language plpgsql security definer set search_path = public as $$
declare i public.fiscal_integrations;
begin
  if new.enabled and (tg_op = 'INSERT' or old.enabled is distinct from true or new.integration_id is distinct from old.integration_id or new.country is distinct from old.country) then
    select * into i from public.fiscal_integrations where id = new.integration_id;
    if new.integration_id is null or i.id is null or i.kind <> 'country' or i.status <> 'approved' or i.country is distinct from new.country then
      raise exception 'Fiscalisation can only be switched on with an approved integration for the shop''s country';
    end if;
    new.authority := i.authority; new.jurisdiction := i.jurisdiction; new.integration_version := i.integration_version;   -- recorded from the catalogue, not trusted from the client
  end if;
  return new;
end $$;
drop trigger if exists fiscal_shop_gate_trg on public.fiscal_shop_settings;
create trigger fiscal_shop_gate_trg before insert or update on public.fiscal_shop_settings for each row execute function public.fiscal_shop_gate();

-- 4) Gate: a device may only be linked to an approved DEVICE integration that is allowed in the device's country
create or replace function public.fiscal_device_gate() returns trigger language plpgsql security definer set search_path = public as $$
declare i public.fiscal_integrations;
begin
  if new.integration_id is not null and (tg_op = 'INSERT' or new.integration_id is distinct from old.integration_id or new.country is distinct from old.country) then
    select * into i from public.fiscal_integrations where id = new.integration_id;
    if i.id is null or i.kind <> 'device' or i.status <> 'approved' or new.country is null or not (new.country = any (i.countries)) then
      raise exception 'This device integration is not approved for that country';
    end if;
    new.adapter := i.adapter_id; new.adapter_version := i.integration_version; new.authority := coalesce(new.authority, i.authority);
  end if;
  return new;
end $$;
drop trigger if exists fiscal_device_gate_trg on public.fiscal_devices;
create trigger fiscal_device_gate_trg before insert or update on public.fiscal_devices for each row execute function public.fiscal_device_gate();

-- 5) Append-only audit log of configuration changes
create table if not exists public.fiscal_audit_log (
  id          bigint generated always as identity primary key,
  business_id uuid not null,
  actor       uuid,
  table_name  text not null,
  op          text not null,
  row_id      text,
  old_row     jsonb,
  new_row     jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists fiscal_audit_biz_idx on public.fiscal_audit_log (business_id, created_at desc);
alter table public.fiscal_audit_log enable row level security;
drop policy if exists "owners managers read fiscal_audit_log" on public.fiscal_audit_log;
create policy "owners managers read fiscal_audit_log" on public.fiscal_audit_log for select
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));
grant select on public.fiscal_audit_log to authenticated;      -- no insert/update/delete grant: rows are written only by the trigger below

create or replace function public.fiscal_audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.fiscal_audit_log (business_id, actor, table_name, op, row_id, old_row, new_row)
  values (coalesce(new.business_id, old.business_id), auth.uid(), tg_table_name, tg_op,
          coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'shop', to_jsonb(old)->>'id', to_jsonb(old)->>'shop'),
          case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new));
  return new;
end $$;
drop trigger if exists fiscal_audit_shop_trg on public.fiscal_shop_settings;
create trigger fiscal_audit_shop_trg after insert or update on public.fiscal_shop_settings for each row execute function public.fiscal_audit();
drop trigger if exists fiscal_audit_dev_trg on public.fiscal_devices;
create trigger fiscal_audit_dev_trg after insert or update on public.fiscal_devices for each row execute function public.fiscal_audit();
