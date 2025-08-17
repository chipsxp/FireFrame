-- =====================================================
-- SUPABASE AUTH USER PROFILE CREATION FIX
-- =====================================================
-- This SQL fixes the issue where users exist in auth.users 
-- but don't have corresponding records in public.users
-- 
-- Run this in your Supabase SQL Editor to fix the authentication issues
-- =====================================================

-- 1. FIRST: Temporarily disable the trigger to allow signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Create improved function to handle new user creation with username conflict resolution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  desired_username TEXT;
  final_username TEXT;
  username_suffix INTEGER := 1;
  max_attempts INTEGER := 10;
BEGIN
  -- Get the desired username
  desired_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.user_metadata->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Start with the desired username
  final_username := desired_username;

  -- Handle username conflicts by appending numbers
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) AND username_suffix <= max_attempts LOOP
    final_username := desired_username || username_suffix::TEXT;
    username_suffix := username_suffix + 1;
  END LOOP;

  -- If still conflicts after max attempts, use UUID suffix
  IF EXISTS (SELECT 1 FROM public.users WHERE username = final_username) THEN
    final_username := desired_username || '_' || substring(NEW.id::TEXT from 1 for 8);
  END IF;

  -- Insert the user with conflict-free username
  BEGIN
    INSERT INTO public.users (id, username, email, created_at, updated_at)
    VALUES (
      NEW.id,
      final_username,
      NEW.email,
      NOW(),
      NOW()
    );
  EXCEPTION WHEN OTHERS THEN
    -- If insert still fails, log error but don't break auth signup
    RAISE LOG 'Failed to create user profile for %: %', NEW.email, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger with the improved function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create user records for any existing auth users who don't have profiles
-- This handles users who signed up before the trigger was in place
INSERT INTO public.users (id, username, email, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    au.user_metadata->>'username',
    split_part(au.email, '@', 1)
  ) as username,
  au.email,
  au.created_at,
  au.updated_at
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.users)
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 4. Verify the setup worked
-- Check if all auth users now have corresponding user profiles
SELECT 
  'Auth users without profiles' as check_type,
  COUNT(*) as count
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- 5. Show recent user creations to verify
SELECT 
  'Recent user profiles' as info,
  id,
  username,
  email,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify everything is working:

-- Check trigger exists:
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';

-- Check function exists:
-- SELECT * FROM information_schema.routines WHERE routine_name = 'handle_new_user';

-- Check user count matches:
-- SELECT 
--   (SELECT COUNT(*) FROM auth.users) as auth_users,
--   (SELECT COUNT(*) FROM public.users) as public_users;
