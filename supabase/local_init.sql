-- =======================================================
-- StudyMate Local PostgreSQL Initialization Script
-- Runs automatically when the postgres container boots
-- =======================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create Roles for PostgREST & Authenticated Clients
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'web_anon') THEN
    CREATE ROLE web_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'mysecretpassword';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO web_anon, authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO web_anon, authenticated, anon, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO web_anon, authenticated, anon, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO web_anon, authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO web_anon, authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO web_anon, authenticated, anon, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO web_anon, authenticated, anon, service_role;
GRANT web_anon, authenticated, anon, service_role TO authenticator;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  points INTEGER DEFAULT 0,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_accessed_ip TEXT DEFAULT '127.0.0.1',
  password_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Study Days Table
CREATE TABLE IF NOT EXISTS public.study_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week INTEGER NOT NULL DEFAULT 1,
  day INTEGER NOT NULL DEFAULT 1,
  phase TEXT DEFAULT 'Phase 1',
  subject TEXT NOT NULL DEFAULT 'Computer Science',
  module TEXT DEFAULT '',
  detailed_topics TEXT DEFAULT '',
  hours NUMERIC DEFAULT 2,
  mcq_target INTEGER DEFAULT 10,
  written_target INTEGER DEFAULT 5,
  pyq_target INTEGER DEFAULT 5,
  practice_checklist TEXT DEFAULT '',
  daily_deliverable TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  source TEXT DEFAULT ''
);

-- 4. Discussions Table
CREATE TABLE IF NOT EXISTS public.discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'mcq',
  duration INTEGER NOT NULL DEFAULT 30,
  questions INTEGER NOT NULL DEFAULT 10,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Exam Questions Table
CREATE TABLE IF NOT EXISTS public.exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options JSONB,
  correct_option INTEGER,
  points INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Exam Submissions Table
CREATE TABLE IF NOT EXISTS public.exam_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id UUID,
  status TEXT DEFAULT 'submitted',
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. Exam Answers Table
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.exam_submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.exam_questions(id) ON DELETE CASCADE,
  selected_option INTEGER,
  answer_file_url TEXT,
  is_correct BOOLEAN,
  points_awarded INTEGER DEFAULT 0,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. System Settings Table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Study Resources Table
CREATE TABLE IF NOT EXISTS public.study_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'file',
  url TEXT NOT NULL,
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'approved',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Courses Module Tables
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  instructor_name TEXT DEFAULT 'Instructor',
  instructor_title TEXT DEFAULT 'Senior Educator',
  instructor_avatar TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'General',
  level TEXT DEFAULT 'all_levels',
  youtube_playlist_url TEXT,
  youtube_playlist_id TEXT,
  duration TEXT DEFAULT '4 hours',
  price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'BDT',
  payment_instructions TEXT DEFAULT 'Please send the enrollment fee via bKash or Nagad (Send Money) to 01700-123456 (Personal). Then submit your Transaction ID (TrxID) and sender number below.',
  rating NUMERIC DEFAULT 4.9,
  enrolled_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  youtube_video_url TEXT,
  video_url TEXT,
  transcript TEXT,
  duration_seconds INTEGER DEFAULT 600,
  order_index INTEGER DEFAULT 0 NOT NULL,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT DEFAULT 'pdf',
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '1.2 MB',
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.course_user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completed_lessons JSONB DEFAULT '[]'::jsonb NOT NULL,
  last_lesson_id UUID,
  is_completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS public.course_lesson_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  note_text TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_lesson_note UNIQUE (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT DEFAULT 'bKash',
  transaction_id TEXT,
  sender_number TEXT,
  amount NUMERIC DEFAULT 0,
  proof_url TEXT,
  admin_notes TEXT,
  student_notes TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_course_enrollment UNIQUE (user_id, course_id)
);

-- 12. RPC Functions
CREATE OR REPLACE FUNCTION public.update_last_access()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET last_accessed_at = now()
  WHERE id = (SELECT id FROM public.profiles ORDER BY last_accessed_at DESC NULLS LAST LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- 13. Grant Permissions to web_anon
GRANT USAGE ON SCHEMA public TO web_anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO web_anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO web_anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO web_anon;

-- 14. Initial Demo Admin & Student Users
INSERT INTO public.profiles (id, email, password_hash, points, full_name, bio)
VALUES 
  ('10101010-1010-1010-1010-101010101010', 'admin@studymate.org', '5f8a3c2b1d0e4f7a9b8c7d6e5f4a3b2c$b98a19e3d8754eeb9eeb7f5f97853bafe32992a55659f2ccfbc48ea534794a8227cb1386de7088124881808478a956905a3a1d72920c1cd96efcb485d06428d5', 1000, 'Administrator', 'StudyMate Master Administrator'),
  ('11111111-1111-1111-1111-111111111111', 'admin@studymate.local', NULL, 250, 'Administrator', 'System Admin'),
  ('22222222-2222-2222-2222-222222222222', 'student@studymate.local', NULL, 100, 'Student User', 'Eager Learner')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- 15. Initial Demo Study Days
INSERT INTO public.study_days (week, day, phase, subject, module, detailed_topics, hours, mcq_target, written_target, pyq_target)
VALUES 
  (1, 1, 'Phase 1', 'Algorithms & Complexity', 'Module 1: Big-O & Analysis', 'Asymptotic notation, amortized analysis, recursion tree theorem', 3, 15, 5, 5),
  (1, 2, 'Phase 1', 'Data Structures', 'Module 2: Arrays & Hash Tables', 'Dynamic arrays, collision resolution, hash map implementations', 3, 20, 5, 5),
  (1, 3, 'Phase 1', 'Web Systems', 'Module 3: Frontend Architecture', 'React Virtual DOM, hooks, state machines, performance profiling', 4, 15, 3, 2)
ON CONFLICT DO NOTHING;
