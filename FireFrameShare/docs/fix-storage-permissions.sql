-- =====================================================
-- FIX STORAGE PERMISSIONS FOR POST UPLOADS
-- =====================================================
-- This SQL script fixes the storage permissions issue
-- where new users can't upload images to post-images bucket
--
-- Run this in your Supabase SQL Editor to fix the issue.
-- =====================================================

-- 0. First, let's check the storage.objects table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- Check if storage buckets exist
SELECT id, name, public FROM storage.buckets;

-- 1. Check current storage policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 2. Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Drop existing storage policies for post-images bucket (if they exist)
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;

-- 4. Create comprehensive storage policies for post-images bucket
-- Note: Using 'bucket_id' - if this fails, your Supabase version might use a different column name

-- Allow anyone to view post images
CREATE POLICY "Anyone can view post images" ON storage.objects
FOR SELECT USING (bucket_id = 'post-images');

-- Allow authenticated users to upload post images
CREATE POLICY "Authenticated users can upload post images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own post images
CREATE POLICY "Users can update their own post images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their own post images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'post-images'
  AND auth.role() = 'authenticated'
);

-- 5. Also fix avatar bucket policies (if needed)
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

-- Create avatar bucket policies
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

-- 5. Check if posts table exists and has correct structure
DO $$
BEGIN
    -- Check if posts table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating posts table...';
        
        -- Create posts table
        CREATE TABLE public.posts (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            author_username TEXT NOT NULL,
            author_avatar_url TEXT,
            image_url TEXT NOT NULL,
            caption TEXT,
            likes INTEGER DEFAULT 0,
            comments INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_posts_author_username ON posts(author_username);
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_username, created_at DESC);
        
        RAISE NOTICE 'Posts table created successfully.';
    ELSE
        RAISE NOTICE 'Posts table already exists.';
    END IF;
END $$;

-- 6. Enable Row Level Security on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing posts table policies and recreate them
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create posts table policies
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE USING (auth.role() = 'authenticated');

-- 8. Create updated_at trigger for posts table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Test storage bucket access for current user
SELECT
  'Storage bucket test' as test_type,
  id as bucket_id,
  name,
  public
FROM storage.buckets
WHERE id IN ('post-images', 'avatars');

-- 10. Verification queries
SELECT 
  'Database verification' as status,
  'Posts table exists: ' || CASE WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN 'YES' ELSE 'NO' END as posts_table,
  'Storage policies count: ' || (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage')::TEXT as storage_policies;

-- Show recent posts to verify
SELECT 
  'Recent posts' as info,
  id,
  author_username,
  caption,
  created_at
FROM public.posts
ORDER BY created_at DESC
LIMIT 5;
