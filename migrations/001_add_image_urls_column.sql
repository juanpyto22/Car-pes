-- Migration: Add image_urls column to posts
-- Run this in Supabase SQL editor or with your DB admin

ALTER TABLE IF EXISTS public.posts
ADD COLUMN IF NOT EXISTS image_urls text;

-- Optionally, if you prefer JSONB:
-- ALTER TABLE IF EXISTS public.posts
-- ADD COLUMN IF NOT EXISTS image_urls jsonb;

-- Backfill existing posts with foto_url into image_urls (optional)
-- UPDATE public.posts SET image_urls = to_jsonb(ARRAY[foto_url]) WHERE foto_url IS NOT NULL AND (image_urls IS NULL OR image_urls = '');
