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

ALTER TABLE public.live_stream_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Live bans selectable by participants" ON public.live_stream_bans;
DROP POLICY IF EXISTS "Live bans insert by stream owner" ON public.live_stream_bans;
DROP POLICY IF EXISTS "Live bans delete by stream owner" ON public.live_stream_bans;

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

COMMIT;
