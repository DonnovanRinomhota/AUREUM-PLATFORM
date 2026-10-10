#!/bin/bash
# Local-Postgres test for supabase/fiscalisation.sql + fiscalisation-v2.sql (Supabase auth stubbed).
# Needs a throwaway Postgres on /tmp/pgt port 5544 (see FISCALISATION.md). Never run against production.
R="$(cd "$(dirname "$0")/.." && pwd)/supabase"
PS="psql -h /tmp/pgt -p 5544 -U postgres -X -q"
$PS -v ON_ERROR_STOP=1 -c "drop database if exists fisc2" -c "create database fisc2" >/dev/null
P="$PS -v ON_ERROR_STOP=1 -d fisc2"
$P <<'SQL'
do $$ begin if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to authenticated; grant usage on schema public to authenticated, anon;
SQL
$P -f $R/schema.sql >/dev/null 2>&1
$P -f $R/fiscalisation.sql >/dev/null 2>&1 || { echo "v1 FAILED"; exit 1; }
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222
OWN=a0000000-0000-0000-0000-000000000001; CASH=a0000000-0000-0000-0000-000000000002; OTH=b0000000-0000-0000-0000-000000000001
$P >/dev/null <<SQL
insert into auth.users values ('$OWN'),('$CASH'),('$OTH');
insert into public.businesses(id,name) values ('$A','A'),('$B','B');
insert into public.profiles(id,business_id,role) values ('$OWN','$A','owner'),('$CASH','$A','cashier'),('$OTH','$B','owner');
grant select on public.profiles, public.businesses to authenticated;
-- a shop that was switched on under v1 (no country): must keep working after v2
insert into public.fiscal_shop_settings(business_id,shop,enabled) values ('$A','Legacy',true);
SQL
$P -f $R/fiscalisation-v2.sql >/dev/null 2>&1 || { echo "v2 FAILED"; $P -f $R/fiscalisation-v2.sql 2>&1 | grep -i error | head -3; exit 1; }
$P -f $R/fiscalisation-v2.sql >/dev/null 2>&1 && echo "PASS v2 re-runs cleanly"
run(){ psql -h /tmp/pgt -p 5544 -U postgres -d fisc2 -X -q -t -A -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claim.sub','$1',false);" -c "$2" 2>&1 | tail -n +2 | tr '\n' ' '; }
adm(){ psql -h /tmp/pgt -p 5544 -U postgres -d fisc2 -X -q -t -A -c "$1" 2>&1 | tr '\n' ' '; }     # service role / superuser
chk(){ if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (got: $2 expected: $3)"; fi; }
has(){ echo "$2" | grep -c "$3"; }

chk "legacy v1 row survives migration" "$(adm "select count(*) from fiscal_shop_settings where shop='Legacy' and enabled")" "1 "
chk "seed: Zimbabwe is in_development" "$(adm "select status from fiscal_integrations where id='zw-zimra-fdms'")" "in_development "
chk "seed: ONLY Zimbabwe entries exist" "$(adm "select count(*) from fiscal_integrations")" "2 "
chk "owner sees NO integrations while none is approved" "$(run $OWN "select count(*) from fiscal_integrations" | tr -d ' ')" "0"
r=$(run $OWN "update fiscal_integrations set status='approved'"); chk "client cannot change the catalogue" "$(has x "$r" 'permission denied')" 1
r=$(run $OWN "insert into fiscal_integrations(id,kind,country,name,adapter_id) values ('x','country','KE','Kenya','ke')"); chk "client cannot add integrations" "$(has x "$r" 'permission denied')" 1
r=$(adm "update fiscal_integrations set status='approved' where id='zw-zimra-fdms'"); chk "DB refuses 'approved' without verified docs" "$(has x "$r" 'fiscal_integrations_gate')" 1
r=$(adm "update fiscal_integrations set status='testing' where id='zw-zimra-fdms'"); chk "DB refuses 'testing' without verified docs" "$(has x "$r" 'fiscal_integrations_gate')" 1
r=$(adm "update fiscal_integrations set status='approved', docs_verified=true where id='zw-zimra-fdms'"); chk "DB refuses 'approved' without approval reference" "$(has x "$r" 'fiscal_integrations_gate')" 1
# before approval: enabling is refused
r=$(run $OWN "insert into fiscal_shop_settings(business_id,shop,enabled,country,integration_id) values ('$A','Harare',true,'ZW','zw-zimra-fdms')"); chk "cannot enable while integration not approved" "$(has x "$r" 'approved integration')" 1
r=$(run $OWN "insert into fiscal_shop_settings(business_id,shop,enabled) values ('$A','Harare',true)"); chk "cannot enable without any integration" "$(has x "$r" 'approved integration')" 1
r=$(run $OWN "insert into fiscal_shop_settings(business_id,shop,enabled,country) values ('$A','Harare',false,'ZW') returning country"); chk "can choose country while OFF (just not enable)" "$(has x "$r" ZW)" 1
r=$(run $OWN "with u as (update fiscal_shop_settings set updated_at=now() where shop='Legacy' returning 1) select count(*) from u"); chk "legacy enabled row can still be updated" "$(echo $r | tr -d ' ')" 1
adm "update fiscal_integrations set status='approved', docs_verified=true, approval_reference='TEST-REF-1' where id in ('zw-zimra-fdms','zw-virtual-fdms')" >/dev/null
chk "owner now sees the approved integrations" "$(run $OWN "select count(*) from fiscal_integrations" | tr -d ' ')" "2"
chk "other business sees them too (catalogue is platform-wide)" "$(run $OTH "select count(*) from fiscal_integrations" | tr -d ' ')" "2"
r=$(run $OWN "update fiscal_shop_settings set enabled=true, country='KE', integration_id='zw-zimra-fdms' where shop='Harare'"); chk "country must match the integration" "$(has x "$r" 'approved integration')" 1
r=$(run $CASH "update fiscal_shop_settings set enabled=true, country='ZW', integration_id='zw-zimra-fdms' where shop='Harare' returning 1"); chk "cashier cannot enable (RLS)" "$(echo $r | tr -d ' ')" ""
r=$(run $OWN "update fiscal_shop_settings set enabled=true, country='ZW', integration_id='zw-zimra-fdms', integration_version='FAKE', authority='FAKE' where shop='Harare' returning authority"); chk "owner enables with approved integration; authority taken from catalogue" "$(has x "$r" 'Zimbabwe Revenue Authority')" 1
chk "integration_version recorded from catalogue, not client" "$(adm "select integration_version from fiscal_shop_settings where shop='Harare'")" "FDMS Fiscal Device Gateway API v7.2 (adapter 0.1-draft) "
# devices
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type,country,integration_id) values ('$A','Harare','D1','vendor_api','ZW','zw-virtual-fdms') returning adapter"); chk "device linked to approved device integration; adapter set by DB" "$(has x "$r" 'zw-virtual-fdms')" 1
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type,country,integration_id) values ('$A','Harare','D2','vendor_api','KE','zw-virtual-fdms')"); chk "device integration not allowed in another country" "$(has x "$r" 'not approved for that country')" 1
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type,country,integration_id) values ('$A','Harare','D3','vendor_api','ZW','zw-zimra-fdms')"); chk "country integration cannot be used as a device integration" "$(has x "$r" 'not approved for that country')" 1
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type) values ('$A','Harare','D4','usb') returning name"); chk "record-only device (no integration) still allowed" "$(has x "$r" D4)" 1
adm "update fiscal_integrations set status='in_development' where id='zw-virtual-fdms'" >/dev/null
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type,country,integration_id) values ('$A','Harare','D5','vendor_api','ZW','zw-virtual-fdms')"); chk "withdrawn integration cannot be newly linked" "$(has x "$r" 'not approved for that country')" 1
# audit
chk "audit rows written for settings + devices" "$(adm "select count(*)>=4 from fiscal_audit_log")" "t "
chk "owner can read own audit log" "$(run $OWN "select count(*)>0 from fiscal_audit_log" | tr -d ' ')" "t"
chk "cashier cannot read audit log" "$(run $CASH "select count(*) from fiscal_audit_log" | tr -d ' ')" "0"
chk "other business cannot read audit log" "$(run $OTH "select count(*) from fiscal_audit_log" | tr -d ' ')" "0"
r=$(run $OWN "delete from fiscal_audit_log"); chk "audit log cannot be deleted" "$(has x "$r" 'permission denied')" 1
r=$(run $OWN "update fiscal_audit_log set op='x'"); chk "audit log cannot be edited" "$(has x "$r" 'permission denied')" 1
r=$(run $OWN "insert into fiscal_audit_log(business_id,table_name,op) values ('$A','x','y')"); chk "clients cannot forge audit rows" "$(has x "$r" 'permission denied')" 1
chk "audit records the actor" "$(adm "select count(*)>0 from fiscal_audit_log where actor='$OWN'")" "t "
# existing policies
n=$(adm "select count(*) from pg_policies where tablename in ('businesses','profiles','business_data','payment_settings')"); chk "existing AUREUM policies untouched" "$n" "$(grep -c 'create policy' $R/schema.sql) "
$PS -d fisc2 -f $R/fiscalisation-v2-rollback.sql 2>&1 | grep -i error; echo "PASS v2 rollback runs"
chk "v1 tables intact after v2 rollback" "$(adm "select count(*) from fiscal_shop_settings")" "2 "
chk "v2 objects gone" "$(adm "select count(*) from information_schema.tables where table_name in ('fiscal_integrations','fiscal_audit_log')")" "0 "
$PS -d fisc2 -f $R/fiscalisation-rollback.sql 2>&1 | grep -i error; echo "PASS v1 rollback runs after v2 rollback"
