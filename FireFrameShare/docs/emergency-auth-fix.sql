-- =====================================================
-- EMERGENCY AUTH FIX - Run this IMMEDIATELY
-- =====================================================
-- This disables the problematic trigger that's causing signup failures
-- Run this first, then test signup, then run the full fix
-- =====================================================

-- 1. IMMEDIATELY disable the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Check if trigger was removed (should return 0 rows)
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 3. Test message
SELECT 'Trigger disabled - you can now test signup!' as status;

-- =====================================================
-- AFTER TESTING SIGNUP WORKS:
-- Run the updated database-auth-fix.sql to re-enable 
-- the trigger with proper username conflict handling
-- =====================================================
