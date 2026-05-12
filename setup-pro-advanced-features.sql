-- ==============================================
-- Pro Features Enhancement
-- ==============================================
-- This script adds additional tables and features for PRO users

-- 1. Featured Posts Table (PRO users can highlight up to 3 posts)
CREATE TABLE IF NOT EXISTS public.featured_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  position int not null check (position between 1 and 3),
  created_at timestamptz not null default now(),
  unique(user_id, position)
);

CREATE INDEX IF NOT EXISTS idx_featured_posts_user_id
  ON public.featured_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_featured_posts_post_id
  ON public.featured_posts(post_id);

ALTER TABLE public.featured_posts ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read featured posts
DROP POLICY IF EXISTS "featured_posts_select" ON public.featured_posts;
CREATE POLICY "featured_posts_select"
ON public.featured_posts
FOR SELECT
TO public
USING (true);

-- RLS: Only PRO users can manage their featured posts
DROP POLICY IF EXISTS "featured_posts_manage" ON public.featured_posts;
CREATE POLICY "featured_posts_manage"
ON public.featured_posts
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.pro_verification_requests pr
    WHERE pr.user_id = auth.uid()
      AND pr.status = 'approved'
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.pro_verification_requests pr
    WHERE pr.user_id = auth.uid()
      AND pr.status = 'approved'
  )
);

-- =============================================
-- 2. Pro User Links (for PRO profiles)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pro_user_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text not null,
  icon_type text default 'globe', -- globe, instagram, twitter, facebook, youtube, website
  position int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, position)
);

CREATE INDEX IF NOT EXISTS idx_pro_user_links_user_id
  ON public.pro_user_links(user_id);

ALTER TABLE public.pro_user_links ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can read PRO user links
DROP POLICY IF EXISTS "pro_user_links_select" ON public.pro_user_links;
CREATE POLICY "pro_user_links_select"
ON public.pro_user_links
FOR SELECT
TO public
USING (true);

-- RLS: Only user can manage their links
DROP POLICY IF EXISTS "pro_user_links_manage" ON public.pro_user_links;
CREATE POLICY "pro_user_links_manage"
ON public.pro_user_links
FOR INSERT, UPDATE, DELETE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 3. Pro Analytics Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.pro_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  total_profile_views int default 0,
  total_post_impressions int default 0,
  total_engagement int default 0,
  avg_engagement_rate float default 0,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_pro_analytics_user_id
  ON public.pro_analytics(user_id);

ALTER TABLE public.pro_analytics ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read only their own analytics
DROP POLICY IF EXISTS "pro_analytics_select_own" ON public.pro_analytics;
CREATE POLICY "pro_analytics_select_own"
ON public.pro_analytics
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- =============================================
-- 4. Verification Trigger for auto-creating analytics
-- =============================================
CREATE OR REPLACE FUNCTION public.create_pro_analytics_for_approved_user()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO public.pro_analytics (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_pro_analytics ON public.pro_verification_requests;
CREATE TRIGGER trg_create_pro_analytics
AFTER UPDATE ON public.pro_verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.create_pro_analytics_for_approved_user();

-- =============================================
-- 5. Sample views for PRO monitoring
-- =============================================

-- View: Top PRO users by followers
CREATE OR REPLACE VIEW public.top_pro_users AS
SELECT 
  p.id,
  p.username,
  p.nombre,
  p.foto_perfil,
  p.followers_count,
  pr.business_type,
  pr.business_name,
  pr.created_at as pro_since
FROM public.profiles p
JOIN public.pro_verification_requests pr ON p.id = pr.user_id
WHERE pr.status = 'approved'
ORDER BY p.followers_count DESC;

-- View: PRO users by business type
CREATE OR REPLACE VIEW public.pro_users_by_type AS
SELECT 
  pr.business_type,
  COUNT(DISTINCT pr.user_id) as count,
  AVG(p.followers_count) as avg_followers
FROM public.pro_verification_requests pr
JOIN public.profiles p ON p.id = pr.user_id
WHERE pr.status = 'approved'
GROUP BY pr.business_type;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
/*
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('featured_posts', 'pro_user_links', 'pro_analytics');

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('featured_posts', 'pro_user_links', 'pro_analytics');

-- Check views
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'pro_%';

-- Test query: Get top PRO users
SELECT * FROM public.top_pro_users LIMIT 5;
*/
