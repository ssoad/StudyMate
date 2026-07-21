-- Supabase Schema for Study Mate

-- 1. Profiles Table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create a profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Discussions Table
CREATE TABLE public.discussions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    author_id UUID REFERENCES public.profiles(id) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discussions are viewable by everyone." ON public.discussions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert discussions." ON public.discussions FOR INSERT WITH CHECK (auth.uid() = author_id);


-- 3. Leaderboard view (optional, since we can just order by points on profiles)
-- This is just for demonstration if we wanted complex aggregation.


-- =====================================
-- DUMMY DATA FOR DEMONSTRATION
-- =====================================
-- Note: Insert these *after* creating users in the auth system to satisfy foreign keys.
-- But since we can't do that here safely, we will just use dummy strings or rely on the UI to create them.


-- 4. Study Topics Table
CREATE TABLE public.study_topics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    week INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL
);

ALTER TABLE public.study_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone." ON public.study_topics FOR SELECT USING (true);
CREATE POLICY "Only admins can insert topics." ON public.study_topics FOR INSERT WITH CHECK (auth.email() LIKE '%admin%');


-- 5. Exams Table
CREATE TABLE public.exams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER NOT NULL,
    questions INTEGER NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Exams are viewable by everyone." ON public.exams FOR SELECT USING (true);
CREATE POLICY "Only admins can insert exams." ON public.exams FOR INSERT WITH CHECK (auth.email() LIKE '%admin%');
