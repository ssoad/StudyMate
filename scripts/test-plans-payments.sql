-- Permission tests for 20261115_payments_and_study_plans.sql.
-- Run ONLY against a disposable copy of the database:
--   psql -v ON_ERROR_STOP=0 -d studymate -f scripts/test-plans-payments.sql
-- Each check prints PASS/FAIL. Two throwaway users are created and the whole run is rolled back.

\set QUIET on
\pset tuples_only on
\pset format unaligned

BEGIN;

CREATE OR REPLACE FUNCTION pg_temp.check(name text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN RAISE NOTICE '% %', CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, name; END $$;

-- Rows changed by a statement run as the current role.
CREATE OR REPLACE FUNCTION pg_temp.affected(q text) RETURNS int LANGUAGE plpgsql AS $$
DECLARE n int; BEGIN EXECUTE q; GET DIAGNOSTICS n = ROW_COUNT; RETURN n; END $$;

-- Act as a given API identity (what PostgREST does per request).
CREATE OR REPLACE FUNCTION pg_temp.act(p_role text, p_sub uuid, p_app_role text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims',
    json_build_object('role', p_role, 'sub', p_sub, 'app_role', p_app_role)::text, true);
END $$;

INSERT INTO profiles (id, email, full_name) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'plan-a@test.invalid', 'Alice'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'plan-b@test.invalid', 'Bob');

-- ---------- legacy import ----------
SELECT pg_temp.check('legacy plan imported as official public',
  EXISTS (SELECT 1 FROM study_plans WHERE legacy_import AND is_official AND visibility = 'public'));
SELECT pg_temp.check('legacy days copied',
  (SELECT count(*) FROM study_plan_days d JOIN study_plans p ON p.id = d.plan_id WHERE p.legacy_import)
  = (SELECT count(*) FROM study_days));

-- ---------- payment methods ----------
INSERT INTO payment_methods (label, account_number, is_active) VALUES ('ActiveTest', '0100', true), ('HiddenTest', '0200', false);

SET LOCAL ROLE web_anon; SELECT pg_temp.act('web_anon', NULL, NULL);
SELECT pg_temp.check('anon sees active payment method', EXISTS (SELECT 1 FROM payment_methods WHERE label = 'ActiveTest'));
SELECT pg_temp.check('anon does not see inactive method', NOT EXISTS (SELECT 1 FROM payment_methods WHERE label = 'HiddenTest'));
SELECT pg_temp.check('anon sees public plan list', (SELECT count(*) FROM list_public_study_plans()) >= 1);
RESET ROLE;

SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'student');
DO $$ BEGIN
  INSERT INTO payment_methods (label, account_number) VALUES ('Evil', '666');
  RAISE NOTICE 'FAIL student cannot add payment method';
EXCEPTION WHEN others THEN RAISE NOTICE 'PASS student cannot add payment method'; END $$;
SELECT pg_temp.check('student cannot edit payment method',
  pg_temp.affected($q$UPDATE payment_methods SET account_number = '666' WHERE label = 'ActiveTest'$q$) = 0);
RESET ROLE;

SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'admin');
SELECT pg_temp.check('admin sees inactive method', EXISTS (SELECT 1 FROM payment_methods WHERE label = 'HiddenTest'));
DO $$ BEGIN
  INSERT INTO payment_methods (label, account_number) VALUES ('AdminAdded', '777');
  RAISE NOTICE 'PASS admin can add payment method';
EXCEPTION WHEN others THEN RAISE NOTICE 'FAIL admin can add payment method: %', SQLERRM; END $$;
RESET ROLE;

-- ---------- study plans: Alice creates a private plan ----------
SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'student');
INSERT INTO study_plans (title, visibility, is_official, owner_id) VALUES ('Alice plan', 'private', true, 'bbbbbbbb-0000-0000-0000-00000000000b');
SELECT pg_temp.check('owner forced to creator', (SELECT owner_id FROM study_plans WHERE title = 'Alice plan') = 'aaaaaaaa-0000-0000-0000-00000000000a');
SELECT pg_temp.check('student cannot self-mark official', NOT (SELECT is_official FROM study_plans WHERE title = 'Alice plan'));
INSERT INTO study_plan_days (plan_id, week, day, subject) SELECT id, 1, 1, 'Day one' FROM study_plans WHERE title = 'Alice plan';
SELECT pg_temp.check('owner can add days', (SELECT count(*) FROM study_plan_days d JOIN study_plans p ON p.id = d.plan_id WHERE p.title = 'Alice plan') = 1);
RESET ROLE;

-- Bob cannot see Alice's private plan
SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'bbbbbbbb-0000-0000-0000-00000000000b', 'student');
SELECT pg_temp.check('private plan hidden from others', NOT EXISTS (SELECT 1 FROM study_plans WHERE title = 'Alice plan'));
SELECT pg_temp.check('private plan days hidden', NOT EXISTS (SELECT 1 FROM study_plan_days WHERE subject = 'Day one'));
SELECT pg_temp.check('private plan not found by code',
  NOT EXISTS (SELECT 1 FROM get_study_plan_by_code((SELECT share_code FROM study_plans WHERE title = 'Alice plan'))));
RESET ROLE;

-- Alice makes it link-only
SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'student');
UPDATE study_plans SET visibility = 'unlisted' WHERE title = 'Alice plan';
RESET ROLE;
-- share code read as superuser to hand to Bob (like sharing the link)
SELECT set_config('test.code', (SELECT share_code FROM study_plans WHERE title = 'Alice plan'), true);

SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'bbbbbbbb-0000-0000-0000-00000000000b', 'student');
SELECT pg_temp.check('link-only plan not listed publicly',
  NOT EXISTS (SELECT 1 FROM list_public_study_plans() WHERE title = 'Alice plan'));
SELECT pg_temp.check('link-only plan not readable before joining', NOT EXISTS (SELECT 1 FROM study_plans WHERE title = 'Alice plan'));
SELECT pg_temp.check('link-only plan found by code', EXISTS (SELECT 1 FROM get_study_plan_by_code(current_setting('test.code'))));
DO $$ BEGIN
  INSERT INTO study_plan_members (user_id, plan_id)
    SELECT 'bbbbbbbb-0000-0000-0000-00000000000b', id FROM get_study_plan_by_code(current_setting('test.code'));
  RAISE NOTICE 'FAIL direct follow of link-only plan blocked';
EXCEPTION WHEN others THEN RAISE NOTICE 'PASS direct follow of link-only plan blocked'; END $$;
SELECT join_study_plan(current_setting('test.code'));
SELECT pg_temp.check('joined plan readable', EXISTS (SELECT 1 FROM study_plans WHERE title = 'Alice plan'));
SELECT pg_temp.check('joined plan days readable', EXISTS (SELECT 1 FROM study_plan_days WHERE subject = 'Day one'));
INSERT INTO study_plan_progress (user_id, day_id) SELECT 'bbbbbbbb-0000-0000-0000-00000000000b', id FROM study_plan_days WHERE subject = 'Day one';
SELECT pg_temp.check('follower can mark progress', EXISTS (SELECT 1 FROM study_plan_progress WHERE user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'));
SELECT pg_temp.check('follower cannot edit days',
  pg_temp.affected($q$UPDATE study_plan_days SET subject = 'hacked' WHERE subject = 'Day one'$q$) = 0);
SELECT pg_temp.check('follower cannot edit plan',
  pg_temp.affected($q$UPDATE study_plans SET title = 'hacked' WHERE title = 'Alice plan'$q$) = 0);
DO $$ BEGIN
  INSERT INTO study_plan_progress (user_id, day_id)
    SELECT 'aaaaaaaa-0000-0000-0000-00000000000a', id FROM study_plan_days WHERE subject = 'Day one';
  RAISE NOTICE 'FAIL cannot write progress for someone else';
EXCEPTION WHEN others THEN RAISE NOTICE 'PASS cannot write progress for someone else'; END $$;
SELECT copy_study_plan((SELECT id FROM study_plans WHERE title = 'Alice plan'));
SELECT pg_temp.check('copy is private and owned by Bob',
  EXISTS (SELECT 1 FROM study_plans WHERE title = 'Copy of Alice plan' AND visibility = 'private'
          AND owner_id = 'bbbbbbbb-0000-0000-0000-00000000000b' AND NOT is_official));
SELECT pg_temp.check('copy has the days',
  (SELECT count(*) FROM study_plan_days d JOIN study_plans p ON p.id = d.plan_id WHERE p.title = 'Copy of Alice plan') = 1);
RESET ROLE;

-- Alice cannot see Bob's progress; anon cannot write anything
SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'student');
SELECT pg_temp.check('progress is private', NOT EXISTS (SELECT 1 FROM study_plan_progress WHERE user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'));
SELECT pg_temp.check('cannot see Bob private copy', NOT EXISTS (SELECT 1 FROM study_plans WHERE title = 'Copy of Alice plan'));
RESET ROLE;

SET LOCAL ROLE web_anon; SELECT pg_temp.act('web_anon', NULL, NULL);
DO $$ BEGIN
  INSERT INTO study_plans (title) VALUES ('anon plan');
  RAISE NOTICE 'FAIL anon cannot create plans';
EXCEPTION WHEN others THEN RAISE NOTICE 'PASS anon cannot create plans'; END $$;
DO $$ BEGIN
  PERFORM join_study_plan(current_setting('test.code'));
  RAISE NOTICE 'FAIL anon cannot join plans';
EXCEPTION WHEN others THEN RAISE NOTICE 'PASS anon cannot join plans'; END $$;
RESET ROLE;

-- Admin can publish an official plan
SET LOCAL ROLE authenticated; SELECT pg_temp.act('authenticated', 'aaaaaaaa-0000-0000-0000-00000000000a', 'admin');
INSERT INTO study_plans (title, visibility, is_official, owner_id) VALUES ('Official 2', 'public', true, 'aaaaaaaa-0000-0000-0000-00000000000a');
SELECT pg_temp.check('admin can publish official plan', EXISTS (SELECT 1 FROM study_plans WHERE title = 'Official 2' AND is_official));
RESET ROLE;

ROLLBACK;
