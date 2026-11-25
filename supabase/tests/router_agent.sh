#!/usr/bin/env bash
# Tests the router-agent SQL protocol. Usage: DB="psql -h /tmp -p 55432 -U pgtest pc" ./router_agent.sh
set -u
DB=${DB:?set DB}
q() { $DB -qtAX -c "$1" 2>&1; }
pass=0; failn=0
check() { if [ "$2" = "$3" ]; then echo "PASS  $1"; pass=$((pass+1)); else echo "FAIL  $1 (got '$2' want '$3')"; failn=$((failn+1)); fi; }
q "DELETE FROM auth.users WHERE email IN ('ag1@t.test','ag2@t.test');" >/dev/null
q "INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES ('cccccccc-0000-0000-0000-000000000001','ag1@t.test','{\"business_name\":\"AG1\"}'),('dddddddd-0000-0000-0000-000000000002','ag2@t.test','{\"business_name\":\"AG2\"}');" >/dev/null
U1=cccccccc-0000-0000-0000-000000000001; U2=dddddddd-0000-0000-0000-000000000002
B1=$(q "SELECT business_id FROM profiles WHERE id='$U1'"); B2=$(q "SELECT business_id FROM profiles WHERE id='$U2'")
R1=$(q "INSERT INTO routers(business_id,name,connection_mode,hotspot_interface,hotspot_cidr) VALUES ('$B1','lobby','agent','bridge-hs','192.168.88.0/24') RETURNING id" | head -1)
R2=$(q "INSERT INTO routers(business_id,name,connection_mode) VALUES ('$B2','other','agent') RETURNING id" | head -1)
as_user() { $DB -qtAX -v ON_ERROR_STOP=1 -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$1',true);
$2
ROLLBACK;" 2>&1 ; }

# Token creation: own router ok, foreign router denied
T=$($DB -qtAX -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$U1',true);
SELECT public.create_provisioning_token('$R1');
COMMIT;" 2>&1 | grep -E '^[0-9a-f]{64}$')
check "owner gets 64-hex token for own router" "${#T}" "64"
out=$(as_user $U1 "SELECT public.create_provisioning_token('$R2');"); echo "$out" | grep -q "not allowed"; check "owner cannot mint token for other business router" "$?" "0"
out=$(as_user $U1 "SELECT provisioning_token_hash FROM routers;"); echo "$out" | grep -qi "denied"; check "browser cannot read token hash" "$?" "0"
out=$(as_user $U1 "SELECT agent_key_hash FROM routers;"); echo "$out" | grep -qi "denied"; check "browser cannot read agent key hash" "$?" "0"
out=$($DB -qtAX -c "SET ROLE authenticated; SELECT public.consume_provisioning_token('$T');" 2>&1); echo "$out" | grep -qi "denied"; check "browser cannot call consume_provisioning_token" "$?" "0"

# Consume: single use
J=$(q "SELECT public.consume_provisioning_token('$T')")
KEY=$(echo "$J" | sed -E 's/.*"key": "([0-9a-f]+)".*/\1/')
check "consume returns agent key" "${#KEY}" "64"
check "token cannot be reused" "$(q "SELECT public.consume_provisioning_token('$T') IS NULL")" "t"
check "garbage token rejected" "$(q "SELECT public.consume_provisioning_token('zz') IS NULL")" "t"
T2=$($DB -qtAX -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$U1',true);
SELECT public.create_provisioning_token('$R1'); COMMIT;" 2>&1 | grep -E '^[0-9a-f]{64}$')
q "UPDATE routers SET provisioning_expires_at = now() - interval '1 minute' WHERE id='$R1'" >/dev/null
check "expired token rejected" "$(q "SELECT public.consume_provisioning_token('$T2') IS NULL")" "t"

# Pull
q "INSERT INTO vouchers(business_id,username,password,status,guest_name,room,device_limit) VALUES ('$B1','room12','Abcd1234','unused','Jane','12',3)" >/dev/null
q "INSERT INTO vouchers(business_id,username,password,status,device_limit) VALUES ('$B2','secretb','Zzzz9999','unused',2)" >/dev/null
check "wrong key gets NULL" "$(q "SELECT public.agent_pull('$R1','$(printf 'a%.0s' {1..64})') IS NULL")" "t"
check "key of other router rejected" "$(q "SELECT public.agent_pull('$R2','$KEY') IS NULL")" "t"
P1=$(q "SELECT public.agent_pull('$R1','$KEY')")
echo "$P1" | grep -q '"room12"'; check "pull includes own business voucher" "$?" "0"
echo "$P1" | grep -q 'secretb'; check "pull excludes other business voucher" "$?" "1"
echo "$P1" | grep -q '"d": 3'; check "device limit 3 delivered" "$?" "0"
SEQ=$(q "SELECT (public.agent_pull('$R1','$KEY')->>'seq')")

# Ack + cursor
check "ack with correct key" "$(q "SELECT public.agent_ack('$R1','$KEY',$SEQ,'{\"cpu\":5,\"tm\":1000,\"fm\":400,\"up\":99,\"ver\":\"6.49.23\",\"bd\":\"RB2011UiAS\",\"au\":2}')")" "t"
check "ack with wrong key refused" "$(q "SELECT public.agent_ack('$R1','$(printf 'b%.0s' {1..64})',$SEQ,'{}')")" "f"
check "after ack nothing new" "$(q "SELECT jsonb_array_length(public.agent_pull('$R1','$KEY')->'items')")" "0"
check "health row recorded with memory 60%" "$(q "SELECT memory_used_pct FROM router_health WHERE router_id='$R1' ORDER BY recorded_at DESC LIMIT 1")" "60"
check "ack cannot jump cursor past real data" "$(q "SELECT public.agent_ack('$R1','$KEY',999999999,'{}'); SELECT acked_seq <= (SELECT max(agent_seq) FROM vouchers WHERE business_id='$B1') FROM routers WHERE id='$R1'" | tail -1)" "t"

# Change feed: revoke + expiry
q "UPDATE vouchers SET status='revoked' WHERE username='room12'" >/dev/null
P2=$(q "SELECT public.agent_pull('$R1','$KEY')")
echo "$P2" | grep -q '"on": false'; check "revoked voucher is pushed as disabled" "$?" "0"
q "INSERT INTO vouchers(business_id,username,password,status,expires_at) VALUES ('$B1','late99','Qwer1234','active', now() - interval '1 hour')" >/dev/null
P3=$(q "SELECT public.agent_pull('$R1','$KEY')")
echo "$P3" | grep -q '"late99".*"on": false'; check "expired voucher is pushed as disabled" "$?" "0"
# Injection-shaped credentials are never delivered to the router script
q "INSERT INTO vouchers(business_id,username,password,status) VALUES ('$B1','x\";/system reset-configuration;\"','pw123456','unused')" >/dev/null 2>&1
q "INSERT INTO vouchers(business_id,username,password,status) VALUES ('$B1','okuser','p\"w;/x','unused')" >/dev/null 2>&1
P4=$(q "SELECT public.agent_pull('$R1','$KEY')")
echo "$P4" | grep -q 'reset-configuration\|p\\"w'; check "malicious usernames/passwords filtered out" "$?" "1"
# Browser cannot forge sequence numbers
as_user $U1 "UPDATE vouchers SET agent_seq = 0 WHERE business_id='$B1';" >/dev/null
check "browser cannot forge agent_seq (trigger overrides, 0 rows with seq 0)" "$(q "SELECT count(*) FROM vouchers WHERE agent_seq = 0")" "0"
$DB -qtAX -c "BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub','$U1',true); UPDATE vouchers SET agent_seq = 0 WHERE business_id='$B1'; COMMIT;" >/dev/null 2>&1
check "committed forge attempt leaves no seq 0" "$(q "SELECT count(*) FROM vouchers WHERE agent_seq = 0")" "0"
# CIDR constraint
out=$(q "UPDATE routers SET hotspot_cidr='8.8.8.0/24' WHERE id='$R1'"); echo "$out" | grep -qi "violates"; check "public CIDR rejected" "$?" "0"
out=$(q "UPDATE routers SET hotspot_interface='x\";/system reset' WHERE id='$R1'"); echo "$out" | grep -qi "violates"; check "interface name injection rejected" "$?" "0"
echo "passed=$pass failed=$failn"; [ $failn -eq 0 ]
