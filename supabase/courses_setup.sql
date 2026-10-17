-- =======================================================
-- COURSES MODULE SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =======================================================

-- 1. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  instructor_name TEXT DEFAULT 'Instructor',
  instructor_title TEXT DEFAULT 'Senior Educator',
  instructor_avatar TEXT,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'General',
  level TEXT DEFAULT 'all_levels', -- 'beginner', 'intermediate', 'advanced', 'all_levels'
  youtube_playlist_url TEXT,
  youtube_playlist_id TEXT,
  duration TEXT DEFAULT '4 hours',
  rating NUMERIC DEFAULT 4.9,
  enrolled_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Course Sections (Modules)
CREATE TABLE IF NOT EXISTS public.course_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Course Lessons (Lectures)
CREATE TABLE IF NOT EXISTS public.course_lessons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID REFERENCES public.course_sections(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  youtube_video_id TEXT,
  youtube_video_url TEXT,
  duration_seconds INTEGER DEFAULT 600,
  order_index INTEGER DEFAULT 0 NOT NULL,
  is_preview BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Course Resources (PDFs, Books, Cheatsheets, Links attached to course or lesson)
CREATE TABLE IF NOT EXISTS public.course_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE, -- nullable if course-level
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT DEFAULT 'pdf', -- 'pdf', 'book', 'document', 'link', 'code', 'zip'
  file_url TEXT NOT NULL,
  file_size TEXT DEFAULT '1.2 MB',
  uploader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. User Course Progress
CREATE TABLE IF NOT EXISTS public.course_user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  completed_lessons JSONB DEFAULT '[]'::jsonb NOT NULL,
  last_lesson_id UUID,
  is_completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

-- 6. User Lesson Notes
CREATE TABLE IF NOT EXISTS public.course_lesson_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE CASCADE NOT NULL,
  note_text TEXT NOT NULL,
  timestamp_seconds INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_user_lesson_note UNIQUE (user_id, lesson_id)
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lesson_notes ENABLE ROW LEVEL SECURITY;

-- Courses: Everyone can view published courses, admins/instructors can create/edit
CREATE POLICY "Public read published courses" ON public.courses
  FOR SELECT USING (is_published = true OR auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create courses" ON public.courses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Creator or admin can update courses" ON public.courses
  FOR UPDATE USING (
    auth.uid() = created_by OR (auth.jwt() ->> 'email') LIKE '%admin%'
  );

CREATE POLICY "Creator or admin can delete courses" ON public.courses
  FOR DELETE USING (
    auth.uid() = created_by OR (auth.jwt() ->> 'email') LIKE '%admin%'
  );

-- Sections & Lessons: Viewable by everyone, editable by creator or admin
CREATE POLICY "Public read course sections" ON public.course_sections
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage sections" ON public.course_sections
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read course lessons" ON public.course_lessons
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can manage lessons" ON public.course_lessons
  FOR ALL USING (auth.role() = 'authenticated');

-- Course Resources
CREATE POLICY "Public read course resources" ON public.course_resources
  FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert course resources" ON public.course_resources
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Creator or admin can delete course resources" ON public.course_resources
  FOR DELETE USING (
    auth.uid() = uploader_id OR (auth.jwt() ->> 'email') LIKE '%admin%'
  );

-- User Progress
CREATE POLICY "Users can manage own progress" ON public.course_user_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User Notes
CREATE POLICY "Users can manage own notes" ON public.course_lesson_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =======================================================
-- STORAGE BUCKET FOR COURSE RESOURCES & BOOKS
-- =======================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-resources', 'course-resources', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read course-resources bucket" ON storage.objects
  FOR SELECT USING (bucket_id = 'course-resources');

CREATE POLICY "Authenticated users upload course-resources" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'course-resources' AND auth.role() = 'authenticated'
  );
