-- Removes ONLY the v2 additions. Run before fiscalisation-rollback.sql if you want everything gone.
-- WARNING: drops the audit log and the integration catalogue; the new columns are dropped (their values are lost).
drop trigger if exists fiscal_audit_shop_trg on public.fiscal_shop_settings;
drop trigger if exists fiscal_audit_dev_trg on public.fiscal_devices;
drop trigger if exists fiscal_shop_gate_trg on public.fiscal_shop_settings;
drop trigger if exists fiscal_device_gate_trg on public.fiscal_devices;
drop function if exists public.fiscal_audit();
drop function if exists public.fiscal_shop_gate();
drop function if exists public.fiscal_device_gate();
alter table public.fiscal_shop_settings drop column if exists country, drop column if exists jurisdiction, drop column if exists authority, drop column if exists integration_id, drop column if exists integration_version;
alter table public.fiscal_devices drop column if exists country, drop column if exists authority, drop column if exists integration_id, drop column if exists adapter_version;
drop table if exists public.fiscal_audit_log;
drop table if exists public.fiscal_integrations;
drop function if exists public.fiscal_integrations_touch();
