-- 🗂️ CREAR STORAGE BUCKETS - MÉTODO ALTERNATIVO
-- Usar este SQL si storage.create_bucket() no funciona

-- Método 1: Crear buckets mediante INSERT directo con permisos elevados
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types, created_at, updated_at)
VALUES 
  ('posts', 'posts', true, 52428800, '{"image/*"}', now(), now()),
  ('stories', 'stories', true, 52428800, '{"image/*"}', now(), now()),
  ('avatars', 'avatars', true, 10485760, '{"image/*"}', now(), now())
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = now();

-- Verificar que se crearon
SELECT id, name, public, file_size_limit FROM storage.buckets 
WHERE id IN ('posts', 'stories', 'avatars');

-- RESTO DE POLÍTICAS (estas sí funcionan)
-- Políticas para buckets posts
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
CREATE POLICY "Anyone can view post images" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');

DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
CREATE POLICY "Authenticated users can upload post images" ON storage.objects  
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own post images" ON storage.objects;
CREATE POLICY "Users can delete own post images" ON storage.objects
FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para buckets stories
DROP POLICY IF EXISTS "Anyone can view story images" ON storage.objects;
CREATE POLICY "Anyone can view story images" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "Authenticated users can upload story images" ON storage.objects;
CREATE POLICY "Authenticated users can upload story images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own story images" ON storage.objects;
CREATE POLICY "Users can delete own story images" ON storage.objects  
FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para buckets avatars
DROP POLICY IF EXISTS "Anyone can view avatar images" ON storage.objects;
CREATE POLICY "Anyone can view avatar images" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated users can upload avatar images" ON storage.objects;
CREATE POLICY "Authenticated users can upload avatar images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own avatar images" ON storage.objects;
CREATE POLICY "Users can delete own avatar images" ON storage.objects  
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ✅ BUCKETS Y POLÍTICAS CREADOS CORRECTAMENTE