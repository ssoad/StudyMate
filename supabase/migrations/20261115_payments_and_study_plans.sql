-- =======================================================
-- StudyMate: payment methods + shareable study plans (2026-11-15)
--
-- 1. payment_methods: admin-managed receiving accounts. A row with course_id NULL
--    applies to every course; rows with a course_id apply only to that course and,
--    when present, replace the global list for it.
-- 2. study_plans (+ days, members, progress): anyone signed in can create plans,
--    keep them private, share them by link, or publish them; admins can mark plans
--    official. Following a plan gives each user their own progress.
--
-- Depends on 20261113_security_hardening.sql (app.uid(), app.is_admin()).
-- Idempotent: safe to run more than once. Apply after the hardening migration:
--   docker exec -i study-mate-db psql -U postgres -d studymate < supabase/migrations/20261115_payments_and_study_plans.sql
-- =======================================================

BEGIN;

-- =======================================================
-- Payment methods
-- =======================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id      uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  label          text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),          -- "bKash"
  kind           text NOT NULL DEFAULT 'mobile' CHECK (kind IN ('mobile', 'bank', 'other')),
  account_type   text NOT NULL DEFAULT '' CHECK (char_length(account_type) <= 80),   -- "Personal · Send Money"
  account_name   text NOT NULL DEFAULT '' CHECK (char_length(account_name) <= 120),
  account_number text NOT NULL CHECK (char_length(account_number) BETWEEN 1 AND 60),
  instructions   text NOT NULL DEFAULT '' CHECK (char_length(instructions) <= 2000), -- one step per line; {amount} is replaced
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_methods_course_idx ON public.payment_methods (course_id, sort_order);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_methods FROM web_anon, anon, authenticated;
GRANT SELECT ON public.payment_methods TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
DROP POLICY IF EXISTS payment_methods_read  ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_admin ON public.payment_methods;
CREATE POLICY payment_methods_read  ON public.payment_methods FOR SELECT USING (is_active OR app.is_admin());
CREATE POLICY payment_methods_admin ON public.payment_methods FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

-- =======================================================
-- Study plans
-- =======================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  visibility   text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'unlisted', 'public')),
  is_official  boolean NOT NULL DEFAULT false,
  share_code   text NOT NULL UNIQUE DEFAULT substr(md5(gen_random_uuid()::text), 1, 10),
  copied_from  uuid REFERENCES public.study_plans(id) ON DELETE SET NULL,
  legacy_import boolean NOT NULL DEFAULT false,  -- the plan imported from the old study_days table
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_plans_owner_idx ON public.study_plans (owner_id);
CREATE INDEX IF NOT EXISTS study_plans_public_idx ON public.study_plans (visibility, is_official);

CREATE TABLE IF NOT EXISTS public.study_plan_days (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  week               integer NOT NULL DEFAULT 1 CHECK (week BETWEEN 1 AND 520),
  day                integer NOT NULL DEFAULT 1 CHECK (day BETWEEN 1 AND 3650),
  phase              text NOT NULL DEFAULT '' CHECK (char_length(phase) <= 120),
  subject            text NOT NULL DEFAULT '' CHECK (char_length(subject) <= 200),
  module             text NOT NULL DEFAULT '' CHECK (char_length(module) <= 200),
  detailed_topics    text NOT NULL DEFAULT '' CHECK (char_length(detailed_topics) <= 4000),
  hours              numeric NOT NULL DEFAULT 2 CHECK (hours >= 0 AND hours <= 24),
  mcq_target         integer NOT NULL DEFAULT 0 CHECK (mcq_target >= 0),
  written_target     integer NOT NULL DEFAULT 0 CHECK (written_target >= 0),
  pyq_target         integer NOT NULL DEFAULT 0 CHECK (pyq_target >= 0),
  practice_checklist text NOT NULL DEFAULT '' CHECK (char_length(practice_checklist) <= 4000),
  daily_deliverable  text NOT NULL DEFAULT '' CHECK (char_length(daily_deliverable) <= 2000),
  source             text NOT NULL DEFAULT '' CHECK (char_length(source) <= 1000)
);
CREATE INDEX IF NOT EXISTS study_plan_days_plan_idx ON public.study_plan_days (plan_id, week, day);

-- A user's library: plans they follow (their own plans are always included implicitly).
CREATE TABLE IF NOT EXISTS public.study_plan_members (
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id   uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  added_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id)
);

-- Per-user completion of a day.
CREATE TABLE IF NOT EXISTS public.study_plan_progress (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_id       uuid NOT NULL REFERENCES public.study_plan_days(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_id)
);

-- ---------- visibility helper ----------
-- SECURITY DEFINER so policies on child tables can check the parent without recursion.
CREATE OR REPLACE FUNCTION app.can_view_plan(p_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_plans p
    WHERE p.id = p_plan_id
      AND (
        p.visibility = 'public'
        OR p.owner_id = app.uid()
        OR app.is_admin()
        OR EXISTS (SELECT 1 FROM public.study_plan_members m WHERE m.plan_id = p.id AND m.user_id = app.uid())
      )
  )
$$;

CREATE OR REPLACE FUNCTION app.can_edit_plan(p_plan_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_plans p
    WHERE p.id = p_plan_id AND (p.owner_id = app.uid() OR app.is_admin())
  )
$$;
REVOKE ALL ON FUNCTION app.can_view_plan(uuid), app.can_edit_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.can_view_plan(uuid), app.can_edit_plan(uuid) TO web_anon, anon, authenticated;

-- ---------- guard: only admins set is_official; owner can't be reassigned ----------
CREATE OR REPLACE FUNCTION app.guard_study_plan() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Trusted paths: the server's service role, admins, and direct database sessions
  -- (migrations / psql) which carry no API token.
  IF app.is_service() OR app.is_admin()
     OR coalesce(current_setting('request.jwt.claims', true), '') = '' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.owner_id := app.uid();
    NEW.is_official := false;
    NEW.share_code := substr(md5(gen_random_uuid()::text), 1, 10);
  ELSE
    NEW.owner_id := OLD.owner_id;
    NEW.is_official := OLD.is_official;
    NEW.share_code := OLD.share_code;
    NEW.copied_from := OLD.copied_from;
    NEW.legacy_import := OLD.legacy_import;
  END IF;
  IF TG_OP = 'INSERT' THEN NEW.legacy_import := false; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_study_plan ON public.study_plans;
CREATE TRIGGER guard_study_plan BEFORE INSERT OR UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION app.guard_study_plan();

-- ---------- privileges + policies ----------
ALTER TABLE public.study_plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_plan_progress ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.study_plans, public.study_plan_days, public.study_plan_members, public.study_plan_progress
  FROM web_anon, anon, authenticated;

GRANT SELECT ON public.study_plans, public.study_plan_days TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.study_plans, public.study_plan_days TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.study_plan_members, public.study_plan_progress TO authenticated;

DROP POLICY IF EXISTS plans_read   ON public.study_plans;
DROP POLICY IF EXISTS plans_insert ON public.study_plans;
DROP POLICY IF EXISTS plans_update ON public.study_plans;
DROP POLICY IF EXISTS plans_delete ON public.study_plans;
CREATE POLICY plans_read ON public.study_plans FOR SELECT USING (
  visibility = 'public' OR owner_id = app.uid() OR app.is_admin()
  OR EXISTS (SELECT 1 FROM public.study_plan_members m WHERE m.plan_id = study_plans.id AND m.user_id = app.uid())
);
CREATE POLICY plans_insert ON public.study_plans FOR INSERT WITH CHECK (app.uid() IS NOT NULL);
CREATE POLICY plans_update ON public.study_plans FOR UPDATE
  USING (owner_id = app.uid() OR app.is_admin()) WITH CHECK (owner_id = app.uid() OR app.is_admin());
CREATE POLICY plans_delete ON public.study_plans FOR DELETE USING (owner_id = app.uid() OR app.is_admin());

DROP POLICY IF EXISTS plan_days_read  ON public.study_plan_days;
DROP POLICY IF EXISTS plan_days_write ON public.study_plan_days;
CREATE POLICY plan_days_read  ON public.study_plan_days FOR SELECT USING (app.can_view_plan(plan_id));
CREATE POLICY plan_days_write ON public.study_plan_days FOR ALL
  USING (app.can_edit_plan(plan_id)) WITH CHECK (app.can_edit_plan(plan_id));

DROP POLICY IF EXISTS plan_members_own    ON public.study_plan_members;
DROP POLICY IF EXISTS plan_members_insert ON public.study_plan_members;
DROP POLICY IF EXISTS plan_members_delete ON public.study_plan_members;
CREATE POLICY plan_members_own ON public.study_plan_members FOR SELECT USING (user_id = app.uid() OR app.is_admin());
-- Following directly is only allowed for plans you can already see (public/own);
-- link-only plans are followed through join_study_plan(code).
CREATE POLICY plan_members_insert ON public.study_plan_members FOR INSERT WITH CHECK (
  user_id = app.uid() AND EXISTS (
    SELECT 1 FROM public.study_plans p WHERE p.id = plan_id AND (p.visibility = 'public' OR p.owner_id = app.uid())
  )
);
CREATE POLICY plan_members_delete ON public.study_plan_members FOR DELETE USING (user_id = app.uid());

DROP POLICY IF EXISTS plan_progress_own    ON public.study_plan_progress;
DROP POLICY IF EXISTS plan_progress_insert ON public.study_plan_progress;
DROP POLICY IF EXISTS plan_progress_delete ON public.study_plan_progress;
CREATE POLICY plan_progress_own ON public.study_plan_progress FOR SELECT USING (user_id = app.uid());
CREATE POLICY plan_progress_insert ON public.study_plan_progress FOR INSERT WITH CHECK (
  user_id = app.uid() AND EXISTS (SELECT 1 FROM public.study_plan_days d WHERE d.id = day_id AND app.can_view_plan(d.plan_id))
);
CREATE POLICY plan_progress_delete ON public.study_plan_progress FOR DELETE USING (user_id = app.uid());

-- ---------- RPCs ----------
-- Open a plan from its share code (works for link-only plans without listing them).
CREATE OR REPLACE FUNCTION public.get_study_plan_by_code(p_code text)
RETURNS TABLE (id uuid, title text, description text, visibility text, is_official boolean,
               owner_name text, day_count bigint, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.description, p.visibility, p.is_official,
         coalesce(nullif(pr.full_name, ''), 'StudyMate'), (SELECT count(*) FROM study_plan_days d WHERE d.plan_id = p.id),
         p.created_at
  FROM study_plans p LEFT JOIN profiles pr ON pr.id = p.owner_id
  WHERE p.share_code = p_code AND p.visibility IN ('public', 'unlisted')
$$;

-- Follow a plan by share code. Returns the plan id.
CREATE OR REPLACE FUNCTION public.join_study_plan(p_code text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan uuid;
BEGIN
  IF app.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to add plans' USING ERRCODE = '42501'; END IF;
  SELECT p.id INTO v_plan FROM study_plans p WHERE p.share_code = p_code AND p.visibility IN ('public', 'unlisted');
  IF v_plan IS NULL THEN RAISE EXCEPTION 'Plan not found or not shared' USING ERRCODE = 'P0002'; END IF;
  INSERT INTO study_plan_members (user_id, plan_id) VALUES (app.uid(), v_plan) ON CONFLICT DO NOTHING;
  RETURN v_plan;
END $$;

-- Make an editable private copy of a plan the caller can see. Returns the new plan id.
CREATE OR REPLACE FUNCTION public.copy_study_plan(p_plan_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_new uuid; v_title text;
BEGIN
  IF app.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to copy plans' USING ERRCODE = '42501'; END IF;
  IF NOT app.can_view_plan(p_plan_id) THEN RAISE EXCEPTION 'Plan not found' USING ERRCODE = 'P0002'; END IF;
  SELECT left('Copy of ' || title, 120) INTO v_title FROM study_plans WHERE id = p_plan_id;
  INSERT INTO study_plans (owner_id, title, description, visibility, copied_from)
    SELECT app.uid(), v_title, description, 'private', id FROM study_plans WHERE id = p_plan_id
    RETURNING id INTO v_new;
  INSERT INTO study_plan_days (plan_id, week, day, phase, subject, module, detailed_topics, hours,
                               mcq_target, written_target, pyq_target, practice_checklist, daily_deliverable, source)
    SELECT v_new, week, day, phase, subject, module, detailed_topics, hours,
           mcq_target, written_target, pyq_target, practice_checklist, daily_deliverable, source
    FROM study_plan_days WHERE plan_id = p_plan_id;
  RETURN v_new;
END $$;

-- Public listing with owner name, day and follower counts.
CREATE OR REPLACE FUNCTION public.list_public_study_plans()
RETURNS TABLE (id uuid, title text, description text, is_official boolean, owner_name text,
               share_code text, day_count bigint, follower_count bigint, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.title, p.description, p.is_official, coalesce(nullif(pr.full_name, ''), 'StudyMate'), p.share_code,
         (SELECT count(*) FROM study_plan_days d WHERE d.plan_id = p.id),
         (SELECT count(*) FROM study_plan_members m WHERE m.plan_id = p.id),
         p.updated_at
  FROM study_plans p LEFT JOIN profiles pr ON pr.id = p.owner_id
  WHERE p.visibility = 'public'
  ORDER BY p.is_official DESC, p.updated_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_study_plan_by_code(text), public.join_study_plan(text),
                       public.copy_study_plan(uuid), public.list_public_study_plans() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_study_plan_by_code(text), public.list_public_study_plans() TO web_anon, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.join_study_plan(text), public.copy_study_plan(uuid) TO authenticated;

-- ---------- one-time import of the legacy single plan ----------
-- The old study_days table held one global plan (with a status shared by every user).
-- Import its days once into an official public plan; per-user status starts fresh.
DO $$
DECLARE v_plan uuid;
BEGIN
  IF to_regclass('public.study_days') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.study_plans WHERE legacy_import)
     AND EXISTS (SELECT 1 FROM public.study_days) THEN
    INSERT INTO public.study_plans (owner_id, title, description, visibility, is_official, legacy_import)
      VALUES (NULL, 'AD (ICT) Study Plan', 'The original StudyMate preparation plan.', 'public', true, true)
      RETURNING id INTO v_plan;
    INSERT INTO public.study_plan_days (plan_id, week, day, phase, subject, module, detailed_topics, hours,
                                        mcq_target, written_target, pyq_target, practice_checklist, daily_deliverable, source)
      SELECT v_plan, coalesce(week, 1), coalesce(day, 1), coalesce(phase, ''), coalesce(subject, ''), coalesce(module, ''),
             coalesce(detailed_topics, ''), coalesce(hours, 2), coalesce(mcq_target, 0), coalesce(written_target, 0),
             coalesce(pyq_target, 0), coalesce(practice_checklist, ''), coalesce(daily_deliverable, ''), coalesce(source, '')
      FROM public.study_days ORDER BY week, day;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
