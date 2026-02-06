-- 🗂️ CREAR STORAGE BUCKETS PARA CARPES - VERSIÓN CORREGIDA
-- Ejecutar TODO este código en Supabase SQL Editor

-- Primero, habilitar las extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear storage buckets usando función administrativa
SELECT storage.create_bucket('posts');
SELECT storage.create_bucket('stories'); 
SELECT storage.create_bucket('avatars');

-- Configurar buckets como públicos
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('posts', 'stories', 'avatars');

-- Configurar límites de tamaño
UPDATE storage.buckets 
SET file_size_limit = 52428800 -- 50MB
WHERE id IN ('posts', 'stories');

UPDATE storage.buckets 
SET file_size_limit = 10485760 -- 10MB  
WHERE id = 'avatars';

-- POLÍTICAS DE ACCESO PÚBLICO PARA STORAGE

-- Políticas para bucket POSTS
CREATE POLICY "Anyone can view post images" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Authenticated users can upload post images" ON storage.objects  
FOR INSERT WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own post images" ON storage.objects
FOR DELETE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own post images" ON storage.objects
FOR UPDATE USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para bucket STORIES  
CREATE POLICY "Anyone can view story images" ON storage.objects
FOR SELECT USING (bucket_id = 'stories');

CREATE POLICY "Authenticated users can upload story images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own story images" ON storage.objects  
FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own story images" ON storage.objects
FOR UPDATE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Políticas para bucket AVATARS
CREATE POLICY "Anyone can view avatar images" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatar images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete own avatar images" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar images" ON storage.objects  
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Verificar buckets creados
SELECT 
  id,
  name, 
  public,
  file_size_limit,
  created_at
FROM storage.buckets 
WHERE id IN ('posts', 'stories', 'avatars');

-- ✅ STORAGE CONFIGURADO CORRECTAMENTE
-- Ahora las imágenes cargarán sin errores 400/404