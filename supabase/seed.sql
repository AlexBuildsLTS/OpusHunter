-- STREAMING_CHUNK:Initializing database schema for OpusHunter...

-- 1. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create the Profiles table (links to Supabase Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    cv_storage_path TEXT, -- Path to the CV in the storage bucket
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the Job Vault table
CREATE TYPE job_status AS ENUM ('pending', 'approved', 'rejected', 'applied');

CREATE TABLE public.job_vault (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    external_job_id TEXT NOT NULL, -- To prevent scraping duplicates
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    description TEXT,
    url TEXT NOT NULL,
    match_score INTEGER, -- 0-100 assigned by Gemini
    status job_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, external_job_id) -- User cannot have the same job twice
);

-- 4. Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_vault ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Job Vault RLS
CREATE POLICY "Users can view own jobs" 
    ON public.job_vault FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" 
    ON public.job_vault FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" 
    ON public.job_vault FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" 
    ON public.job_vault FOR DELETE 
    USING (auth.uid() = user_id);

-- 5. Create Storage Bucket for CVs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cv_vault', 'cv_vault', false);

-- Storage RLS
CREATE POLICY "Users can upload their own CV"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'cv_vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own CV"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'cv_vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own CV"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'cv_vault' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own CV"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'cv_vault' AND auth.uid()::text = (storage.foldername(name))[1]);

-- STREAMING_CHUNK:Adding endgame Auth Trigger for automatic profile creation...

-- 6. Automate Profile Creation on Signup (THE ENDGAME ADDITION)
-- This ensures you never have to manually insert a profile when someone signs up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();