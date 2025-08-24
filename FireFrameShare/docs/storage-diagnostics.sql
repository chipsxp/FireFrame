-- =====================================================
-- STORAGE DIAGNOSTICS SCRIPT
-- =====================================================
-- Run this first to diagnose storage issues
-- =====================================================

-- 1. Check if storage schema exists
SELECT 
    'Schema check' as test,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.schemata 
        WHERE schema_name = 'storage'
    ) THEN 'storage schema EXISTS' 
    ELSE 'storage schema MISSING' 
    END as result;

-- 2. Check storage tables
SELECT 
    'Storage tables' as test,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'storage'
ORDER BY table_name;

-- 3. Check storage.objects table structure
SELECT 
    'storage.objects columns' as test,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- 4. Check storage.buckets table structure  
SELECT 
    'storage.buckets columns' as test,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'buckets'
ORDER BY ordinal_position;

-- 5. List existing buckets
SELECT 
    'Existing buckets' as test,
    *
FROM storage.buckets
ORDER BY created_at;

-- 6. Check current storage policies
SELECT 
    'Current storage policies' as test,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'storage'
ORDER BY tablename, policyname;

-- 7. Check if RLS is enabled on storage tables
SELECT 
    'RLS status' as test,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'storage'
ORDER BY tablename;

-- 8. Test basic storage access (if objects exist)
SELECT 
    'Sample storage objects' as test,
    COUNT(*) as total_objects
FROM storage.objects;

-- 9. Check auth functions availability
SELECT 
    'Auth functions' as test,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'auth' 
AND routine_name IN ('role', 'uid', 'jwt')
ORDER BY routine_name;

-- 10. Check extensions
SELECT 
    'Extensions' as test,
    extname as extension_name,
    extversion as version
FROM pg_extension 
WHERE extname IN ('storage', 'supabase_vault', 'pgjwt')
ORDER BY extname;
