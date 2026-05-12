-- ==============================================
-- Fix: Pro Verification RLS Policies
-- ==============================================
-- This script fixes the RLS policies for pro_verification_requests
-- to ensure admins can properly review and approve/reject requests

-- 1. First, identify who is an admin and ensure they have role='admin'
-- You can run this query to see current admins:
-- SELECT id, username, email, role FROM public.profiles WHERE role = 'admin' LIMIT 10;

-- 2. If needed, update a specific user to be admin (replace UUID below):
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'YOUR_ADMIN_UUID_HERE';

-- 3. Update the RLS policies to be more robust

-- Drop old policies
DROP POLICY IF EXISTS "pro_verification_admin_update" ON public.pro_verification_requests;
DROP POLICY IF EXISTS "pro_verification_admin_select_all" ON public.pro_verification_requests;

-- Create improved admin select policy (read all requests)
CREATE POLICY "pro_verification_admin_select_all"
ON public.pro_verification_requests
FOR SELECT
TO authenticated
USING (
  -- Admins can read all requests
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.role, 'user') = 'admin'
  )
  OR
  -- Or users can read their own requests and approved requests
  (
    auth.uid() = user_id
    OR status = 'approved'
  )
);

-- Create improved admin update policy (approve/reject requests)
CREATE POLICY "pro_verification_admin_update"
ON public.pro_verification_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.role, 'user') = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND COALESCE(p.role, 'user') = 'admin'
  )
);

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these to verify your setup:

-- 1. Check if profiles table has role column
-- SELECT column_name FROM information_schema.columns 
-- WHERE table_name = 'profiles' AND column_name = 'role';

-- 2. List all admin users
-- SELECT id, username, email, role FROM public.profiles WHERE role = 'admin';

-- 3. Check current RLS policies on pro_verification_requests
-- SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'pro_verification_requests';

-- 4. Test - try to read pro requests as admin user (replace UUID)
-- SELECT id, user_id, business_name, status FROM public.pro_verification_requests LIMIT 5;
