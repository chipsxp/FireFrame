-- =====================================================
-- CORRECTED FIX FOR "Error fetching user profile: {}" ISSUE
-- =====================================================
-- This SQL script fixes the user profile creation issue
-- that occurs when new users sign up.
-- 
-- Run this in your Supabase SQL Editor to fix the issue.
-- =====================================================

-- 1. First, check if the users table exists and has the correct structure
DO $$
BEGIN
    -- Check if users table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating users table...';
        
        -- Create users table with all required columns
        CREATE TABLE public.users (
            id UUID PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            website_url TEXT,
            website_public BOOLEAN DEFAULT false,
            phone TEXT,
            phone_public BOOLEAN DEFAULT false,
            messaging_platform TEXT,
            messaging_username TEXT,
            messaging_public BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Users table created successfully.';
    ELSE
        RAISE NOTICE 'Users table already exists.';
    END IF;
END $$;

-- 2. Ensure all required columns exist (in case table was created with missing columns)
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'bio') THEN
        ALTER TABLE public.users ADD COLUMN bio TEXT;
        RAISE NOTICE 'Added bio column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'website_url') THEN
        ALTER TABLE public.users ADD COLUMN website_url TEXT;
        RAISE NOTICE 'Added website_url column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'website_public') THEN
        ALTER TABLE public.users ADD COLUMN website_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added website_public column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
        RAISE NOTICE 'Added phone column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_public') THEN
        ALTER TABLE public.users ADD COLUMN phone_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added phone_public column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'messaging_platform') THEN
        ALTER TABLE public.users ADD COLUMN messaging_platform TEXT;
        RAISE NOTICE 'Added messaging_platform column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'messaging_username') THEN
        ALTER TABLE public.users ADD COLUMN messaging_username TEXT;
        RAISE NOTICE 'Added messaging_username column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'messaging_public') THEN
        ALTER TABLE public.users ADD COLUMN messaging_public BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added messaging_public column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
        ALTER TABLE public.users ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added created_at column';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    END IF;
END $$;

-- 3. Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create RLS policies
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 5. Create or replace the trigger function (CORRECTED VERSION)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  username_suffix INTEGER := 1;
  max_attempts INTEGER := 10;
BEGIN
  -- Get the desired username (CORRECTED - only use raw_user_meta_data)
  desired_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  -- Ensure username is not null or empty
  IF desired_username IS NULL OR desired_username = '' THEN
    desired_username := 'user';
  END IF;
  
  -- Find a unique username
  final_username := desired_username;
  WHILE username_suffix <= max_attempts LOOP
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE username = final_username) THEN
      EXIT;
    END IF;
    final_username := desired_username || username_suffix::TEXT;
    username_suffix := username_suffix + 1;
  END LOOP;

  -- Insert the user with conflict-free username
  BEGIN
    INSERT INTO public.users (
      id, 
      username, 
      email, 
      avatar_url,
      bio,
      website_url,
      website_public,
      phone,
      phone_public,
      messaging_platform,
      messaging_username,
      messaging_public,
      created_at, 
      updated_at
    )
    VALUES (
      NEW.id,
      final_username,
      NEW.email,
      NULL,
      NULL,
      NULL,
      false,
      NULL,
      false,
      NULL,
      NULL,
      false,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created user profile for % with username %', NEW.email, final_username;
  EXCEPTION WHEN OTHERS THEN
    -- If insert still fails, log error but don't break auth signup
    RAISE LOG 'Failed to create user profile for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Drop existing trigger and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Create user records for any existing auth users who don't have profiles (CORRECTED)
INSERT INTO public.users (
  id, 
  username, 
  email, 
  avatar_url,
  bio,
  website_url,
  website_public,
  phone,
  phone_public,
  messaging_platform,
  messaging_username,
  messaging_public,
  created_at, 
  updated_at
)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    split_part(au.email, '@', 1),
    'user'
  ) as username,
  au.email,
  NULL,
  NULL,
  NULL,
  false,
  NULL,
  false,
  NULL,
  NULL,
  false,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 8. Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 9. Create updated_at trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Verification queries
SELECT 
  'Database setup verification' as status,
  'Users table exists: ' || CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN 'YES' ELSE 'NO' END as users_table,
  'Trigger exists: ' || CASE WHEN EXISTS (SELECT FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created') THEN 'YES' ELSE 'NO' END as trigger_exists,
  'Auth users without profiles: ' || (SELECT COUNT(*) FROM auth.users au LEFT JOIN public.users pu ON au.id = pu.id WHERE pu.id IS NULL)::TEXT as missing_profiles;

-- Show recent user profiles
SELECT 
  'Recent user profiles' as info,
  id,
  username,
  email,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
