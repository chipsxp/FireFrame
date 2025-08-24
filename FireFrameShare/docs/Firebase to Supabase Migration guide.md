
# Firebase to Supabase Migration Guide

## 📁 File Structure Mapping

* Files to Replace/Create
* Firebase File Supabase Replacement Action
* src/lib/firebase.ts src/lib/supabase.ts Replace
* src/lib/firebase-posts.ts src/lib/supabase-posts.ts Replace
* src/lib/firebase-debug.ts src/lib/supabase-debug.ts Replace
* Files to Update (Import Changes)
* File Current Import New Import Changes Required
* src/hooks/use-post-store.ts from "@/lib/firebase-posts" from "@/lib/supabase-posts" Update imports
* src/app/page.tsx from "@/lib/firebase-debug" from "@/lib/supabase-debug" Update imports
* src/app/profile/[username]/page.tsx from "@/lib/firebase-posts" from "@/lib/supabase-posts" Update imports
* src/components/new-post-dialog.tsx Uses addPost from store No direct changes Already uses store
* Files to Remove
* File Reason

1. Remove file after configuration to Supabase: .firebaserc Firebase project configuration
2. Remove file after configuration to Supabase: apphosting.yaml Firebase hosting configuration
3. Remove file after configuration to Supabase: .idx/dev.nix (Firebase sections) Remove Firebase emulator config

** Files to Update (Configuration)
  -- File Changes

1. package.json Remove firebase, add @supabase/supabase-js
2. .gitignore Remove Firebase logs, add Supabase logs
3. next.config.ts Add Supabase domain to image remotePatterns

## 🗄️ Complete Supabase Schema Configuration

1. Database Schema (SQL)

`````sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (for future auth integration)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
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

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
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

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (true);

-- Create policies for posts table
CREATE POLICY "Posts are viewable by everyone" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can insert their own posts" ON posts FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (true);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

```
2. Storage Buckets Configuration
````sql
-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true);

-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Create storage policies for post-images bucket
CREATE POLICY "Anyone can view post images" ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Authenticated users can upload post images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own post images" ON storage.objects FOR UPDATE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own post images" ON storage.objects FOR DELETE USING (bucket_id = 'post-images' AND auth.role() = 'authenticated');

-- Create storage policies for avatars bucket
CREATE POLICY "Anyone can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
```

3. Real-time Configuration
    -- Enable real-time for posts table
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- Enable real-time for users table (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE users;

🔧 Supabase Configuration Files
Environment Variables (.env.local)
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

Package.json Dependencies
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  }
}
Remove:
{
  "dependencies": {
    "firebase": "^11.9.1"
  }
}

📋 Migration Checklist
Phase 1: Setup
Create Supabase project
Run database schema SQL
Configure storage buckets
Set up environment variables
Phase 2: Code Migration
Install @supabase/supabase-js
Create src/lib/supabase.ts
Create src/lib/supabase-posts.ts
Create src/lib/supabase-debug.ts
Update imports in use-post-store.ts
Update imports in page.tsx
Update imports in profile page
Phase 3: Cleanup
Remove Firebase dependency
Remove .firebaserc
Remove apphosting.yaml
Update .gitignore
Update next.config.ts
Phase 4: Testing
Test post creation
Test real-time updates
Test image uploads
Test profile functionality
🔄 Key Differences Summary
Feature	Firebase	Supabase
Database	Firestore (NoSQL)	PostgreSQL (SQL)
Real-time	onSnapshot()	supabase.channel().on()
Storage	Firebase Storage	Supabase Storage
Auth	Firebase Auth	Supabase Auth
Queries	Collection queries	SQL queries
File Upload	uploadBytes()	storage.upload()
Timestamps	Timestamp.now()	NOW()
IDs	Auto-generated	UUID
💡 Migration Benefits
Cost Effective: Generous free tier (500MB DB, 1GB storage, 2GB bandwidth)
SQL Database: More powerful queries and relationships
Built-in Auth: Real authentication system
Better DX: Excellent dashboard and tooling
Open Source: Self-hostable if needed
Real-time: Built-in real-time subscriptions
Type Safety: Auto-generated TypeScript types
This migration will eliminate your Firebase costs while providing a more robust and feature-rich backend solution.
`````
