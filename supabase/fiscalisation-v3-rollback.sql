-- Undo fiscalisation-v3.sql: removes the catalogue rows it added (only if no shop or device uses them yet).
delete from public.fiscal_integrations i
 where (i.id like '%-generic' or i.id = 'local-connector')
   and not exists (select 1 from public.fiscal_shop_settings s where s.integration_id = i.id)
   and not exists (select 1 from public.fiscal_devices d where d.integration_id = i.id);
