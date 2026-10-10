#!/bin/bash
# Local Postgres RLS test for supabase/fiscalisation.sql (Supabase auth stubbed)
R="$(cd "$(dirname "$0")/.." && pwd)/supabase"   # needs a local Postgres on /tmp/pgt:5544 — see FISCALISATION.md
P="psql -h /tmp/pgt -p 5544 -U postgres -v ON_ERROR_STOP=1 -q -X"
$P -c "drop database if exists fisc" -c "create database fisc" >/dev/null
P="$P -d fisc"
$P <<'SQL'
do $$ begin if not exists (select 1 from pg_roles where rolname=$q$anon$q$) then create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; end if; end $$;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
grant usage on schema auth to authenticated; grant usage on schema public to authenticated, anon;
SQL
$P -f $R/schema.sql >/dev/null 2>/tmp/claude-0/w/t/sql/schema.err || { echo "schema.sql failed"; head -5 /tmp/claude-0/w/t/sql/schema.err; }
$P -f $R/fiscalisation.sql || { echo MIGRATION FAILED; exit 1; }
$P -f $R/fiscalisation.sql && echo "PASS migration re-runs cleanly"
$P <<'SQL'
insert into auth.users values ('a0000000-0000-0000-0000-000000000001'),('a0000000-0000-0000-0000-000000000002'),('b0000000-0000-0000-0000-000000000001');
insert into public.businesses(id,name) values ('11111111-1111-1111-1111-111111111111','A'),('22222222-2222-2222-2222-222222222222','B');
insert into public.profiles(id,business_id,role) values
 ('a0000000-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','owner'),
 ('a0000000-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','cashier'),
 ('b0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','owner');
grant select on public.profiles, public.businesses to authenticated;
SQL
run(){ # $1 uid  $2 sql ; prints result or ERR
  out=$(psql -h /tmp/pgt -p 5544 -U postgres -d fisc -X -q -t -A -v ON_ERROR_STOP=1 -c "set role authenticated; select set_config('request.jwt.claim.sub','$1',false);" -c "$2" 2>&1); rc=$?
  echo "$out" | tail -n +2 | tr '\n' ' '; return $rc; }
OWN=a0000000-0000-0000-0000-000000000001; CASH=a0000000-0000-0000-0000-000000000002; OTH=b0000000-0000-0000-0000-000000000001
A=11111111-1111-1111-1111-111111111111; B=22222222-2222-2222-2222-222222222222
chk(){ if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (got: $2 expected: $3)"; fi; }
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type) values ('$A','Harare','FD1','network') returning name"); chk "owner can add device" "$(echo $r | grep -c FD1)" 1
r=$(run $CASH "insert into fiscal_devices(business_id,shop,name,connection_type) values ('$A','Harare','FD2','network')" 2>&1); chk "cashier cannot add device" "$(echo $r | grep -c 'row-level security')" 1
r=$(run $OTH "insert into fiscal_devices(business_id,shop,name,connection_type) values ('$A','Harare','FDX','network')" 2>&1); chk "other business cannot add device to A" "$(echo $r | grep -c 'row-level security')" 1
r=$(run $OTH "select count(*) from fiscal_devices"); chk "other business sees 0 devices" "$(echo $r | tr -d ' ')" 0
r=$(run $CASH "select count(*) from fiscal_devices"); chk "cashier can read own business devices" "$(echo $r | tr -d ' ')" 1
r=$(run $OWN "insert into fiscal_devices(business_id,shop,name,connection_type,connection) values ('$A','Harare','Bad','network','{\"password\":\"x\"}')" 2>&1); chk "secret key in connection rejected" "$(echo $r | grep -c fiscal_devices_no_secrets)" 1
r=$(run $CASH "with u as (update fiscal_devices set active=false returning 1) select count(*) from u"); chk "cashier cannot deactivate (0 rows changed)" "$(echo $r | tr -d ' ')" 0
r=$(run $OWN "with u as (update fiscal_devices set active=false, registration_status='deactivated' returning 1) select count(*) from u" 2>&1); chk "owner can deactivate" "$(echo $r | tr -d ' ')" 1
r=$(run $OWN "insert into fiscal_shop_settings(business_id,shop,enabled) values ('$A','Harare',true) returning enabled"); chk "owner can enable shop" "$(echo $r | grep -c t)" 1
r=$(run $CASH "insert into fiscal_shop_settings(business_id,shop,enabled) values ('$A','Bulawayo',true)" 2>&1); chk "cashier cannot enable shop" "$(echo $r | grep -c 'row-level security')" 1
r=$(run $CASH "insert into fiscal_transactions(business_id,shop,receipt_uid,idempotency_key) values ('$A','Harare','r1','sale:r1') returning state"); chk "cashier can create fiscal tx" "$(echo $r | grep -c pending)" 1
r=$(run $CASH "insert into fiscal_transactions(business_id,shop,receipt_uid,idempotency_key) values ('$A','Harare','r1','sale:r1')" 2>&1); chk "duplicate idempotency key rejected" "$(echo $r | grep -c 'duplicate key')" 1
r=$(run $CASH "insert into fiscal_transactions(business_id,shop,receipt_uid,idempotency_key) values ('$B','Harare','r9','sale:r9')" 2>&1); chk "cannot create tx in another business" "$(echo $r | grep -c 'row-level security')" 1
r=$(run $OTH "select count(*) from fiscal_transactions"); chk "other business sees 0 tx" "$(echo $r | tr -d ' ')" 0
r=$(run $CASH "delete from fiscal_transactions" 2>&1); chk "delete does nothing (no policy)" "$(echo $r | grep -c 'permission denied')" 1
r=$(run $CASH "update fiscal_transactions set state='fiscalised', fiscal_ref='F1', history='[{\"e\":1}]' returning state"); chk "tx -> fiscalised" "$(echo $r | grep -c fiscalised)" 1
r=$(run $CASH "update fiscal_transactions set state='failed'" 2>&1); chk "fiscalised is final" "$(echo $r | grep -c 'is final')" 1
r=$(run $CASH "update fiscal_transactions set history='[]'" 2>&1); chk "history is append-only" "$(echo $r | grep -c 'append-only')" 1
r=$(run $CASH "insert into fiscal_transactions(business_id,shop,receipt_uid,idempotency_key,state) values ('$A','Harare','r2','sale:r2','uncertain')"); 
r=$(run $CASH "update fiscal_transactions set state='submitting' where receipt_uid='r2'" 2>&1); chk "uncertain cannot jump to re-submit" "$(echo $r | grep -c 'status-checked')" 1
r=$(run $CASH "update fiscal_transactions set receipt_uid='zzz' where receipt_uid='r2'" 2>&1); chk "tx identity immutable" "$(echo $r | grep -c 'identity')" 1
n=$(psql -h /tmp/pgt -p 5544 -U postgres -d fisc -t -A -c "select count(*) from pg_policies where tablename in ('businesses','profiles','business_data','payment_settings')"); chk "existing policies untouched (count)" "$n" "$(grep -c 'create policy' $R/schema.sql)"
psql -h /tmp/pgt -p 5544 -U postgres -d fisc -q -f $R/fiscalisation-rollback.sql && echo "PASS rollback runs" 
n=$(psql -h /tmp/pgt -p 5544 -U postgres -d fisc -t -A -c "select count(*) from pg_policies where tablename in ('businesses','profiles','business_data','payment_settings')"); chk "existing policies intact after rollback" "$n" "$(grep -c 'create policy' $R/schema.sql)"
