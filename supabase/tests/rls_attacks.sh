#!/usr/bin/env bash
# Replays the audit's database attacks against a Postgres that has the migrations applied.
# Usage: DB="psql -h /tmp -p 55432 -U pgtest pc" ./rls_attacks.sh
# Each attack prints BLOCKED (good) or SUCCEEDED (vulnerable). Exit code 1 if any succeeded.
set -u
DB=${DB:?set DB to a psql command}
q() { $DB -qtAX -c "$1"; }
q "DELETE FROM auth.users WHERE email IN ('a@t.test','b@t.test');" >/dev/null
q "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('aaaaaaaa-0000-0000-0000-000000000001','a@t.test','{\"business_name\":\"A\"}'),('bbbbbbbb-0000-0000-0000-000000000002','b@t.test','{\"business_name\":\"B\"}');" >/dev/null
A=aaaaaaaa-0000-0000-0000-000000000001; B=bbbbbbbb-0000-0000-0000-000000000002
BIZ_A=$(q "SELECT business_id FROM profiles WHERE id='$A'"); BIZ_B=$(q "SELECT business_id FROM profiles WHERE id='$B'")
q "INSERT INTO mpesa_credentials(business_id,environment,consumer_key,consumer_secret,passkey,shortcode) VALUES ('$BIZ_A','sandbox','k','SECRET','PASS','174379');" >/dev/null
q "INSERT INTO routers(business_id,name,host,username,password_encrypted) VALUES ('$BIZ_A','r','203.0.113.5','admin','ROUTERPW');" >/dev/null
q "INSERT INTO routers(business_id,name,host,username,password_encrypted) VALUES ('$BIZ_B','victim','198.51.100.7','admin','VICTIMPW');" >/dev/null
fail=0
attack() { # name, user, sql (must affect >=1 row / return rows to count as success)
  out=$($DB -qtAX -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$2',true) \gset
$3
ROLLBACK;
SQL
)
  if echo "$out" | grep -q "ROW_WRITTEN"; then echo "SUCCEEDED  $1"; fail=1
  elif echo "$out" | grep -qiE "error|violates|denied|cannot be changed"; then echo "BLOCKED    $1"
  elif echo "$out" | grep -qE "^(INSERT|UPDATE|DELETE) 0|^$" && ! echo "$out" | grep -qE "^[0-9a-zA-Z]"; then echo "BLOCKED    $1 (0 rows)"
  else echo "SUCCEEDED  $1  -> $out"; fail=1; fi
}
attack "C1 owner grants self super_admin (own biz id)" $A "INSERT INTO user_roles(user_id,role,business_id) VALUES ('$A','super_admin','$BIZ_A') RETURNING id;"
attack "C1 owner grants self super_admin (null biz)"   $A "INSERT INTO user_roles(user_id,role,business_id) VALUES ('$A','super_admin',NULL) RETURNING id;"
attack "C2 move own profile into victim business"      $A "UPDATE profiles SET business_id='$BIZ_B' WHERE id='$A' RETURNING id;"
attack "C2 chain: take over victim business then read its routers" $A "UPDATE profiles SET business_id='$BIZ_B' WHERE id='$A'; SELECT name FROM routers WHERE business_id='$BIZ_B';"
attack "C1 chain: self-grant super_admin then read all businesses" $A "INSERT INTO user_roles(user_id,role,business_id) VALUES ('$A','super_admin','$BIZ_A'); SELECT name FROM businesses WHERE id='$BIZ_B';"
attack "M1 forge audit log in victim business"         $A "DO \$\$ BEGIN INSERT INTO audit_logs(user_id,business_id,action) VALUES ('$A','$BIZ_B','forged'); RAISE NOTICE 'ROW_WRITTEN'; END \$\$;"
attack "H1 browser reads M-Pesa consumer_secret"       $A "SELECT consumer_secret FROM mpesa_credentials;"
attack "H1 browser reads M-Pesa passkey"               $A "SELECT passkey FROM mpesa_credentials;"
attack "H1 browser reads router password"              $A "SELECT password_encrypted FROM routers;"
attack "S1 owner extends own trial by 5 years"        $A "UPDATE subscriptions SET trial_ends_at = now() + interval '5 years' WHERE business_id='$BIZ_A' RETURNING id;"
attack "S2 owner marks own subscription active"        $A "UPDATE subscriptions SET status='active', current_period_end = now() + interval '5 years' WHERE business_id='$BIZ_A' RETURNING id;"
echo "--- legitimate actions that must still work"
ok() { out=$($DB -qtAX -v ON_ERROR_STOP=1 <<SQL 2>&1
BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$2',true) \gset
$3
ROLLBACK;
SQL
); if echo "$out" | grep -qiE "error|denied"; then echo "BROKEN     $1 -> $out"; fail=1; else echo "OK         $1"; fi; }
ok "owner is business_owner of own biz"      $A "SELECT 1/ (CASE WHEN has_role('$A','business_owner') THEN 1 ELSE 0 END);"
ok "staff issues guest login with 3 devices" $A "INSERT INTO vouchers(business_id,username,password,guest_name,room,device_limit) VALUES ('$BIZ_A','PTAAA111','Zk8mQ2xP','Jane','12',3);"
q "INSERT INTO vouchers(business_id,username,password,device_limit) VALUES ('$BIZ_A','PTDUP001','x',1);" >/dev/null
attack "G1 two guests share one username"            $A "INSERT INTO vouchers(business_id,username,password) VALUES ('$BIZ_A','PTDUP001','y');"
attack "G2 device limit of 99"                       $A "INSERT INTO vouchers(business_id,username,password,device_limit) VALUES ('$BIZ_A','PTBIG001','y',99);"
attack "G3 browser reads venue M-Pesa table at all"  $A "SELECT consumer_key FROM mpesa_credentials;"
ok "owner updates own profile name"          $A "UPDATE profiles SET full_name='X' WHERE id='$A';"
ok "owner writes audit log for own biz"      $A "INSERT INTO audit_logs(user_id,business_id,action) VALUES ('$A','$BIZ_A','ok');"
ok "owner adds staff role in own biz"        $A "INSERT INTO user_roles(user_id,role,business_id) VALUES ('$B','staff','$BIZ_A');"
echo "--- subscription lifecycle"
TD=$(q "SELECT round(extract(epoch FROM (trial_ends_at - trial_started_at))/86400) FROM subscriptions WHERE business_id='$BIZ_B'")
if [ "$TD" = 10 ]; then echo "OK         new business gets a 10-day trial"; else echo "BROKEN     trial length is $TD days"; fail=1; fi
attack "L1 Starter plan (1 router) adds a second router" $A "INSERT INTO routers(business_id,name,host,username) VALUES ('$BIZ_A','second','203.0.113.20','admin');"
q "UPDATE subscriptions SET plan_id=(SELECT id FROM subscription_plans WHERE code='business') WHERE business_id='$BIZ_A';" >/dev/null
ok "L2 Business plan allows a second router"          $A "INSERT INTO routers(business_id,name,host,username) VALUES ('$BIZ_A','second','203.0.113.20','admin');"
attack "P1 owner changes platform trial length"        $A "UPDATE platform_settings SET value='3650' WHERE key='trial_days' RETURNING key;"
q "UPDATE subscriptions SET trial_ends_at = now() - interval '1 day' WHERE business_id='$BIZ_A';" >/dev/null
attack "S3 expired trial can still create a router"    $A "INSERT INTO routers(business_id,name,host,username) VALUES ('$BIZ_A','late','203.0.113.9','admin');"
# a confirmed payment arrives (what the callback does)
PAY=$(q "WITH i AS (INSERT INTO invoices(business_id,subscription_id,plan_id,amount_cents,period_start,period_end) SELECT '$BIZ_A', s.id, s.plan_id, 150000, now(), now()+interval '30 days' FROM subscriptions s WHERE s.business_id='$BIZ_A' RETURNING id) INSERT INTO payments(business_id,provider,provider_ref,phone,amount_cents,status,metadata) SELECT '$BIZ_A','mpesa','ws_CO_TEST1','254700000000',150000,'paid',jsonb_build_object('kind','subscription','invoice_id',i.id,'mpesa_receipt','ABC123') FROM i RETURNING id;")
r1=$(q "SELECT activate_subscription_payment('$PAY');"); end1=$(q "SELECT current_period_end FROM subscriptions WHERE business_id='$BIZ_A';")
r2=$(q "SELECT activate_subscription_payment('$PAY');"); end2=$(q "SELECT current_period_end FROM subscriptions WHERE business_id='$BIZ_A';")
st=$(q "SELECT status FROM subscriptions WHERE business_id='$BIZ_A';")
if [ "$r1" = t ] && [ "$r2" = f ] && [ "$end1" = "$end2" ] && [ "$st" = active ]; then echo "OK         payment activates once (status=$st), replay ignored"; else echo "BROKEN     activation r1=$r1 r2=$r2 status=$st"; fail=1; fi
ok "paid account can create a router again"            $A "INSERT INTO routers(business_id,name,host,username) VALUES ('$BIZ_A','paid','203.0.113.10','admin');"
attack "S4 anonymous-style call: user runs activation" $A "SELECT activate_subscription_payment('$PAY');"
q "UPDATE subscriptions SET current_period_end = now() - interval '4 days' WHERE business_id='$BIZ_A';" >/dev/null
attack "S5 paid period ended 4 days ago, creates router" $A "INSERT INTO routers(business_id,name,host,username) VALUES ('$BIZ_A','lapsed','203.0.113.11','admin');"
exit $fail

