-- Script para arreglar las políticas de RLS de Supabase
-- Ejecutar en el SQL Editor de Supabase

-- 1. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE NOTIFICATIONS
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow users to create notifications for others" ON notifications;
DROP POLICY IF EXISTS "notification_select_policy" ON notifications;
DROP POLICY IF EXISTS "notification_insert_policy" ON notifications;
DROP POLICY IF EXISTS "notification_update_policy" ON notifications;
DROP POLICY IF EXISTS "notification_delete_policy" ON notifications;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE FOLLOWS
DROP POLICY IF EXISTS "Users can view all follows" ON follows;
DROP POLICY IF EXISTS "Users can create follows" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON follows;
DROP POLICY IF EXISTS "follow_select_policy" ON follows;
DROP POLICY IF EXISTS "follow_insert_policy" ON follows;
DROP POLICY IF EXISTS "follow_delete_policy" ON follows;

-- 3. CREAR POLÍTICAS NUEVAS PARA NOTIFICATIONS
-- Permitir leer notificaciones propias
CREATE POLICY "notification_select_own" ON notifications
FOR SELECT USING (user_id = auth.uid());

-- Permitir crear notificaciones para cualquier usuario (necesario para follow requests)
CREATE POLICY "notification_insert_any" ON notifications
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Permitir actualizar notificaciones propias
CREATE POLICY "notification_update_own" ON notifications
FOR UPDATE USING (user_id = auth.uid());

-- Permitir borrar notificaciones propias
CREATE POLICY "notification_delete_own" ON notifications
FOR DELETE USING (user_id = auth.uid());

-- 4. CREAR POLÍTICAS NUEVAS PARA FOLLOWS
-- Permitir leer todas las relaciones de seguimiento (necesario para verificar estado)
CREATE POLICY "follow_select_all" ON follows
FOR SELECT USING (true);

-- Permitir crear follows solo si eres el follower
CREATE POLICY "follow_insert_own" ON follows
FOR INSERT WITH CHECK (follower_id = auth.uid());

-- Permitir eliminar follows solo si eres el follower
CREATE POLICY "follow_delete_own" ON follows
FOR DELETE USING (follower_id = auth.uid());

-- 5. VERIFICAR QUE RLS ESTÁ HABILITADO
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- 6. VERIFICAR LA ESTRUCTURA DE LAS TABLAS
-- Si no existe la columna is_private en users, agregarla
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Verificar que las columnas necesarias existen
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'follows' 
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('is_private', 'followers_count', 'following_count')
ORDER BY ordinal_position;