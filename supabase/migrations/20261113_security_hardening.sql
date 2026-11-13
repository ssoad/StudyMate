-- =======================================================
-- StudyMate security hardening (2026-11-13)
--
-- Replaces the blanket "GRANT ALL TO web_anon/authenticated" model with
-- least-privilege grants + row level security.
--
-- Roles (issued by server.js):
--   web_anon       anonymous visitors (read-only public catalog)
--   authenticated  signed-in users; JWT carries sub (user id) and app_role
--   service_role   server.js internal token only (BYPASSRLS)
--
-- Idempotent: safe to run more than once.
-- Apply to an existing database with:
--   docker exec -i study-mate-db psql -U postgres -d studymate < supabase/migrations/20261113_security_hardening.sql
-- =======================================================

BEGIN;

-- ---------- helpers ----------
CREATE SCHEMA IF NOT EXISTS app;
GRANT USAGE ON SCHEMA app TO web_anon, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION app.jwt_claim(name text) RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true), '')::json ->> name
$$;

CREATE OR REPLACE FUNCTION app.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN app.jwt_claim('role') = 'authenticated'
              THEN nullif(app.jwt_claim('sub'), '')::uuid END
$$;

CREATE OR REPLACE FUNCTION app.is_admin() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(app.jwt_claim('role') = 'authenticated' AND app.jwt_claim('app_role') = 'admin', false)
$$;

CREATE OR REPLACE FUNCTION app.is_service() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT current_user = 'service_role' OR app.jwt_claim('role') = 'service_role'
$$;

-- ---------- reset privileges ----------
ALTER ROLE service_role BYPASSRLS;

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM web_anon, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM web_anon, anon, authenticated;
REVOKE ALL ON ALL ROUTINES  IN SCHEMA public FROM web_anon, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM web_anon, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM web_anon, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON ROUTINES  FROM web_anon, anon, authenticated;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

-- Enable RLS on every table in public (including any created outside the init scripts).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- =======================================================
-- profiles
--   password_hash and last_accessed_ip are never readable by clients.
--   Users may edit their own name/avatar/bio. Points may only be raised by
--   small increments by the owner (client-side gamification); admins may set anything.
-- =======================================================
GRANT SELECT (id, full_name, avatar_url, points, bio) ON public.profiles TO web_anon, anon;
GRANT SELECT (id, email, full_name, avatar_url, points, bio, last_accessed_at, created_at) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url, bio, points) ON public.profiles TO authenticated;

CREATE POLICY profiles_read ON public.profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON public.profiles FOR UPDATE
  USING (id = app.uid() OR app.is_admin())
  WITH CHECK (id = app.uid() OR app.is_admin());

CREATE OR REPLACE FUNCTION app.guard_profile_points() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_admin() OR app.is_service() THEN RETURN NEW; END IF;
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    IF NEW.points < coalesce(OLD.points, 0) OR NEW.points - coalesce(OLD.points, 0) > 50 THEN
      RAISE EXCEPTION 'points can only be increased in small steps' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_points ON public.profiles;
CREATE TRIGGER guard_profile_points BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app.guard_profile_points();

-- Admin user list (includes last IP) — admins only.
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (id uuid, email text, full_name text, avatar_url text, points integer, bio text,
               last_accessed_at timestamptz, last_accessed_ip text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, app AS $$
BEGIN
  IF NOT app.is_admin() THEN
    RAISE EXCEPTION 'admin only' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.full_name, p.avatar_url, p.points, p.bio,
           p.last_accessed_at, p.last_accessed_ip, p.created_at
    FROM public.profiles p
    ORDER BY p.last_accessed_at DESC NULLS LAST;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

-- The old update_last_access touched an arbitrary row; server.js handles this now.
DROP FUNCTION IF EXISTS public.update_last_access();

-- =======================================================
-- Course catalog: public read, admin write
-- =======================================================
GRANT SELECT ON public.courses, public.course_sections, public.course_lessons, public.course_resources
  TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.courses, public.course_sections, public.course_lessons, public.course_resources
  TO authenticated;

CREATE POLICY courses_read  ON public.courses FOR SELECT USING (is_published OR app.is_admin());
CREATE POLICY courses_admin ON public.courses FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

CREATE POLICY sections_read  ON public.course_sections FOR SELECT USING (true);
CREATE POLICY sections_admin ON public.course_sections FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

CREATE POLICY lessons_read  ON public.course_lessons FOR SELECT USING (true);
CREATE POLICY lessons_admin ON public.course_lessons FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

CREATE POLICY course_resources_read  ON public.course_resources FOR SELECT USING (true);
CREATE POLICY course_resources_admin ON public.course_resources FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

-- =======================================================
-- Per-user data: owner only (admins may read)
-- =======================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_user_progress, public.course_lesson_notes TO authenticated;

CREATE POLICY progress_owner ON public.course_user_progress FOR ALL
  USING (user_id = app.uid() OR app.is_admin()) WITH CHECK (user_id = app.uid());
CREATE POLICY notes_owner ON public.course_lesson_notes FOR ALL
  USING (user_id = app.uid()) WITH CHECK (user_id = app.uid());

-- =======================================================
-- Enrollments: students create/resubmit their own pending request;
-- only admins can approve/reject or edit admin fields.
-- =======================================================
GRANT SELECT, INSERT, UPDATE ON public.course_enrollments TO authenticated;
GRANT DELETE ON public.course_enrollments TO authenticated;

CREATE POLICY enrollments_read   ON public.course_enrollments FOR SELECT USING (user_id = app.uid() OR app.is_admin());
CREATE POLICY enrollments_insert ON public.course_enrollments FOR INSERT WITH CHECK (user_id = app.uid() OR app.is_admin());
CREATE POLICY enrollments_update ON public.course_enrollments FOR UPDATE
  USING (user_id = app.uid() OR app.is_admin()) WITH CHECK (user_id = app.uid() OR app.is_admin());
CREATE POLICY enrollments_delete ON public.course_enrollments FOR DELETE USING (app.is_admin());

CREATE OR REPLACE FUNCTION app.guard_enrollment() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_admin() OR app.is_service() THEN RETURN NEW; END IF;
  -- Students can only ever (re)submit a pending request.
  NEW.status      := 'pending';
  NEW.approved_at := NULL;
  NEW.approved_by := NULL;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'approved' THEN
      RAISE EXCEPTION 'approved enrollments cannot be changed' USING ERRCODE = '42501';
    END IF;
    NEW.admin_notes := OLD.admin_notes;
    NEW.user_id     := OLD.user_id;
  ELSE
    NEW.admin_notes := NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_enrollment ON public.course_enrollments;
CREATE TRIGGER guard_enrollment BEFORE INSERT OR UPDATE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION app.guard_enrollment();

-- =======================================================
-- Study plan: public read, admin write
-- =======================================================
GRANT SELECT ON public.study_days TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.study_days TO authenticated;
CREATE POLICY study_days_read  ON public.study_days FOR SELECT USING (true);
CREATE POLICY study_days_admin ON public.study_days FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

-- =======================================================
-- Discussions: public read, author writes own, admin moderates
-- =======================================================
GRANT SELECT ON public.discussions TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.discussions TO authenticated;
CREATE POLICY discussions_read   ON public.discussions FOR SELECT USING (true);
CREATE POLICY discussions_insert ON public.discussions FOR INSERT WITH CHECK (author_id = app.uid());
CREATE POLICY discussions_update ON public.discussions FOR UPDATE
  USING (author_id = app.uid() OR app.is_admin()) WITH CHECK (author_id = app.uid() OR app.is_admin());
CREATE POLICY discussions_delete ON public.discussions FOR DELETE USING (author_id = app.uid() OR app.is_admin());

-- =======================================================
-- Study resources: approved ones are public; users submit pending ones;
-- admins approve.
-- =======================================================
GRANT SELECT ON public.study_resources TO web_anon, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.study_resources TO authenticated;
CREATE POLICY study_resources_read ON public.study_resources FOR SELECT
  USING (status = 'approved' OR uploader_id = app.uid() OR app.is_admin());
CREATE POLICY study_resources_insert ON public.study_resources FOR INSERT
  WITH CHECK (uploader_id = app.uid() OR app.is_admin());
CREATE POLICY study_resources_admin ON public.study_resources FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());
CREATE POLICY study_resources_delete ON public.study_resources FOR DELETE
  USING (uploader_id = app.uid() OR app.is_admin());

CREATE OR REPLACE FUNCTION app.guard_study_resource() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT (app.is_admin() OR app.is_service()) THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_study_resource ON public.study_resources;
CREATE TRIGGER guard_study_resource BEFORE INSERT ON public.study_resources
  FOR EACH ROW EXECUTE FUNCTION app.guard_study_resource();

-- =======================================================
-- Exams
-- =======================================================
GRANT SELECT ON public.exams, public.exam_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.exams, public.exam_questions TO authenticated;
CREATE POLICY exams_read  ON public.exams FOR SELECT USING (app.uid() IS NOT NULL);
CREATE POLICY exams_admin ON public.exams FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());
CREATE POLICY exam_questions_read  ON public.exam_questions FOR SELECT USING (app.uid() IS NOT NULL);
CREATE POLICY exam_questions_admin ON public.exam_questions FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

GRANT SELECT, INSERT, UPDATE ON public.exam_submissions, public.exam_answers TO authenticated;
GRANT DELETE ON public.exam_submissions, public.exam_answers TO authenticated;

CREATE POLICY submissions_read   ON public.exam_submissions FOR SELECT USING (user_id = app.uid() OR app.is_admin());
CREATE POLICY submissions_insert ON public.exam_submissions FOR INSERT WITH CHECK (user_id = app.uid());
CREATE POLICY submissions_update ON public.exam_submissions FOR UPDATE
  USING ((user_id = app.uid() AND status IN ('started', 'in_progress', 'submitted')) OR app.is_admin())
  WITH CHECK (user_id = app.uid() OR app.is_admin());
CREATE POLICY submissions_delete ON public.exam_submissions FOR DELETE USING (app.is_admin());

-- Students cannot move their own submission to graded.
CREATE OR REPLACE FUNCTION app.guard_submission() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF app.is_admin() OR app.is_service() THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('started', 'in_progress', 'submitted') THEN
    RAISE EXCEPTION 'only admins can change grading status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_submission ON public.exam_submissions;
CREATE TRIGGER guard_submission BEFORE INSERT OR UPDATE ON public.exam_submissions
  FOR EACH ROW EXECUTE FUNCTION app.guard_submission();

CREATE POLICY answers_read ON public.exam_answers FOR SELECT USING (
  app.is_admin() OR EXISTS (SELECT 1 FROM public.exam_submissions s WHERE s.id = submission_id AND s.user_id = app.uid()));
CREATE POLICY answers_insert ON public.exam_answers FOR INSERT WITH CHECK (
  app.is_admin() OR EXISTS (SELECT 1 FROM public.exam_submissions s WHERE s.id = submission_id AND s.user_id = app.uid()));
CREATE POLICY answers_admin_update ON public.exam_answers FOR UPDATE USING (app.is_admin()) WITH CHECK (app.is_admin());
CREATE POLICY answers_admin_delete ON public.exam_answers FOR DELETE USING (app.is_admin());

-- =======================================================
-- System settings (holds the LLM API key): admins only
-- =======================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
CREATE POLICY settings_admin ON public.system_settings FOR ALL USING (app.is_admin()) WITH CHECK (app.is_admin());

-- Sequences used by identity/serial columns, if any
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;

-- Tell PostgREST to reload its schema cache (picks up the new RPC / dropped RPC).
NOTIFY pgrst, 'reload schema';
