-- ==============================================
-- FIX: RLS Security Issues (Supabase Advisor)
-- ==============================================
-- This script fixes:
-- 1. "Policy Exists RLS Disabled" on public.users
-- 2. "RLS Disabled in Public" on public.users and public.group_files
-- 3. Ensures all tables with policies have RLS enabled

-- =============================================
-- 1. ENABLE RLS on public.users
-- =============================================
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. ENABLE RLS on public.group_files  
-- =============================================
ALTER TABLE IF EXISTS public.group_files ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 3. Verify all critical tables have RLS enabled
-- =============================================
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.direct_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.direct_chat_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pro_verification_requests ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. Basic permissive policies (if none exist)
-- =============================================

-- For public.users - make read-only for authenticated users
DROP POLICY IF EXISTS "users_select_authenticated" ON public.users;
CREATE POLICY "users_select_authenticated"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- For public.group_files - allow read access
DROP POLICY IF EXISTS "group_files_select" ON public.group_files;
CREATE POLICY "group_files_select"
ON public.group_files
FOR SELECT
TO public
USING (true);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these to verify RLS is properly enabled:

/*
-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'group_files', 'profiles', 'posts', 'comments', 
    'likes', 'follows', 'notifications', 'stories', 'messages',
    'chat_groups', 'chat_group_members', 'group_messages',
    'direct_messages', 'pro_verification_requests'
  )
ORDER BY rowsecurity DESC, tablename;

-- Check all policies on each table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check tables with policies but RLS disabled
SELECT 
  'Table with policies but RLS disabled:' as issue,
  t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public' 
  AND t.rowsecurity = false
  AND EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
  );
*/
