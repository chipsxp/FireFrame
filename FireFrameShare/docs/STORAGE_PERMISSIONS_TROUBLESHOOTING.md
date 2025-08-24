# Storage Permissions Troubleshooting Guide

## Problem

Users are experiencing random errors where some profiles can't change profile images while others can, and some can't edit post images while others can. The error `column "bucket_id" does not exist` appears when running the storage permissions fix script.

## Root Cause Analysis

The error indicates that your Supabase instance's `storage.objects` table doesn't have a `bucket_id` column, which could be due to:

1. **Older Supabase version**: Earlier versions used different column names
2. **Storage extension not properly enabled**: The storage schema might not be fully initialized
3. **Custom storage setup**: Your instance might have a different storage configuration

## Diagnostic Steps

### Step 1: Run Diagnostics

First, run the diagnostic script to understand your storage setup:

```sql
-- Run this in your Supabase SQL Editor
\i storage-diagnostics.sql
```

Or copy and paste the contents of `storage-diagnostics.sql` into your SQL editor.

### Step 2: Check Results

Look for these key indicators:

- ✅ **storage schema EXISTS**: Good, storage is enabled
- ❌ **storage schema MISSING**: Storage extension needs to be enabled
- Check what columns exist in `storage.objects` table
- Verify buckets exist and are properly configured

## Solutions

### Solution 1: Use the Updated Fix Script

Try the updated `fix-storage-permissions.sql` which includes better error handling and bucket creation.

### Solution 2: Use the Alternative Approach

If the standard approach fails, use `fix-storage-permissions-alternative.sql` which:

- Dynamically checks for column existence
- Provides detailed error messages
- Uses conditional logic to handle different storage setups

### Solution 3: Manual Bucket and Policy Creation

If automated scripts fail, create buckets and policies manually:

```sql
-- 1. Create buckets manually
INSERT INTO storage.buckets (id, name, public) 
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create policies using the Supabase Dashboard
-- Go to Authentication > Policies > storage.objects
-- Create policies manually through the UI
```

### Solution 4: Enable Storage Extension (if missing)

If storage schema is missing entirely:

```sql
-- Enable the storage extension
CREATE EXTENSION IF NOT EXISTS "storage" SCHEMA "storage";
```

## Testing Your Fix

After applying any solution, test with these queries:

```sql
-- 1. Verify buckets exist
SELECT id, name, public FROM storage.buckets;

-- 2. Check policies are active
SELECT policyname, cmd FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. Test upload permissions (replace with actual user ID)
SELECT auth.role(); -- Should return 'authenticated' when logged in
```

## Application-Level Fixes

While fixing database permissions, also ensure your application handles errors gracefully:

### 1. Add Better Error Handling in Upload Functions

```typescript
// In your upload functions, add specific error handling
try {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file);
    
  if (error) {
    console.error('Storage error:', error);
    // Handle specific error types
    if (error.message.includes('policy')) {
      throw new Error('Permission denied. Please try logging out and back in.');
    }
    throw error;
  }
} catch (error) {
  console.error('Upload failed:', error);
  // Show user-friendly error message
}
```

### 2. Add Retry Logic

```typescript
const uploadWithRetry = async (file: File, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadImage(file, 'avatars');
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

## Prevention

To prevent future issues:

1. **Regular Monitoring**: Set up monitoring for storage operations
2. **Consistent Testing**: Test upload functionality across different user accounts
3. **Error Logging**: Implement comprehensive error logging for storage operations
4. **User Feedback**: Provide clear error messages to users when uploads fail

## Next Steps

1. Run `storage-diagnostics.sql` first
2. Based on results, choose the appropriate solution
3. Test thoroughly with multiple user accounts
4. Monitor for any remaining issues
5. Consider implementing application-level improvements

## Support

If none of these solutions work:

1. Check your Supabase project version in the dashboard
2. Contact Supabase support with the diagnostic results
3. Consider migrating to a newer Supabase instance if using a very old version
