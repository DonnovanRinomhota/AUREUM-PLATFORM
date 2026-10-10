-- Removes ONLY the fiscalisation objects. Existing AUREUM tables are untouched.
-- WARNING: this deletes stored fiscal records. Export fiscal_transactions first if you need the audit trail.
drop table if exists public.fiscal_transactions;
drop table if exists public.fiscal_devices;
drop table if exists public.fiscal_shop_settings;
drop function if exists public.fiscal_tx_guard();
drop function if exists public.fiscal_touch();
