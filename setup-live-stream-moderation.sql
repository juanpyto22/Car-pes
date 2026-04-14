-- =====================================================
-- LIVE STREAM MODERATION SETUP (Car-Pes)
-- Expulsion + bloqueo temporal por directo
-- Ejecutar en SQL Editor de Supabase
-- =====================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.live_stream_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_bans_stream_id ON public.live_stream_bans(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_bans_user_id ON public.live_stream_bans(user_id);

CREATE TABLE IF NOT EXISTS public.live_stream_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_mutes_stream_id ON public.live_stream_mutes(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_mutes_user_id ON public.live_stream_mutes(user_id);

CREATE TABLE IF NOT EXISTS public.live_stream_moderators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stream_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_stream_moderators_stream_id ON public.live_stream_moderators(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_moderators_user_id ON public.live_stream_moderators(user_id);

CREATE TABLE IF NOT EXISTS public.live_stream_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  gift_type TEXT NOT NULL,
  gift_name TEXT NOT NULL,
  value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_stream_gifts_stream_id ON public.live_stream_gifts(stream_id);
CREATE INDEX IF NOT EXISTS idx_live_stream_gifts_sender_id ON public.live_stream_gifts(sender_id);

ALTER TABLE public.live_stream_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_gifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live bans selectable by participants" ON public.live_stream_bans;
DROP POLICY IF EXISTS "Live bans insert by stream owner" ON public.live_stream_bans;
DROP POLICY IF EXISTS "Live bans delete by stream owner" ON public.live_stream_bans;
DROP POLICY IF EXISTS "Live mutes selectable by participants" ON public.live_stream_mutes;
DROP POLICY IF EXISTS "Live mutes upsert by stream owner or mod" ON public.live_stream_mutes;
DROP POLICY IF EXISTS "Live mutes delete by stream owner or mod" ON public.live_stream_mutes;
DROP POLICY IF EXISTS "Live moderators selectable by participants" ON public.live_stream_moderators;
DROP POLICY IF EXISTS "Live moderators upsert by stream owner" ON public.live_stream_moderators;
DROP POLICY IF EXISTS "Live moderators delete by stream owner" ON public.live_stream_moderators;
DROP POLICY IF EXISTS "Live gifts selectable by authenticated" ON public.live_stream_gifts;
DROP POLICY IF EXISTS "Live gifts insert by authenticated" ON public.live_stream_gifts;

CREATE POLICY "Live bans selectable by participants"
ON public.live_stream_bans
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_bans.stream_id
      AND ls.user_id = auth.uid()
  )
);

CREATE POLICY "Live bans insert by stream owner"
ON public.live_stream_bans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_bans.stream_id
      AND ls.user_id = auth.uid()
      AND ls.is_live = true
  )
);

CREATE POLICY "Live bans delete by stream owner"
ON public.live_stream_bans
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_bans.stream_id
      AND ls.user_id = auth.uid()
  )
);

CREATE POLICY "Live mutes selectable by participants"
ON public.live_stream_mutes
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_mutes.stream_id
      AND ls.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.live_stream_moderators lm
    WHERE lm.stream_id = live_stream_mutes.stream_id
      AND lm.user_id = auth.uid()
  )
);

CREATE POLICY "Live mutes upsert by stream owner or mod"
ON public.live_stream_mutes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_mutes.stream_id
      AND ls.user_id = auth.uid()
      AND ls.is_live = true
  )
  OR EXISTS (
    SELECT 1
    FROM public.live_stream_moderators lm
    JOIN public.live_streams ls ON ls.id = lm.stream_id
    WHERE lm.stream_id = live_stream_mutes.stream_id
      AND lm.user_id = auth.uid()
      AND ls.is_live = true
  )
);

CREATE POLICY "Live mutes delete by stream owner or mod"
ON public.live_stream_mutes
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_mutes.stream_id
      AND ls.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.live_stream_moderators lm
    WHERE lm.stream_id = live_stream_mutes.stream_id
      AND lm.user_id = auth.uid()
  )
);

CREATE POLICY "Live moderators selectable by participants"
ON public.live_stream_moderators
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_moderators.stream_id
      AND ls.user_id = auth.uid()
  )
);

CREATE POLICY "Live moderators upsert by stream owner"
ON public.live_stream_moderators
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_moderators.stream_id
      AND ls.user_id = auth.uid()
      AND ls.is_live = true
  )
);

CREATE POLICY "Live moderators delete by stream owner"
ON public.live_stream_moderators
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.live_streams ls
    WHERE ls.id = live_stream_moderators.stream_id
      AND ls.user_id = auth.uid()
  )
);

CREATE POLICY "Live gifts selectable by authenticated"
ON public.live_stream_gifts
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Live gifts insert by authenticated"
ON public.live_stream_gifts
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

COMMIT;
