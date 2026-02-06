-- Script de prueba para verificar el funcionamiento de las políticas RLS
-- Ejecutar DESPUÉS del script fix_database_policies.sql

-- 1. Verificar que las políticas están activas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('notifications', 'follows')
ORDER BY tablename, policyname;

-- 2. Verificar estructura de usuarios
SELECT id, username, email, is_private, followers_count, following_count
FROM users
LIMIT 5;

-- 3. Verificar notificaciones existentes
SELECT id, user_id, type, related_user_id, read, created_at
FROM notifications
WHERE type = 'follow_request'
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verificar relaciones de seguimiento
SELECT f.follower_id, f.following_id, f.created_at,
       u1.username as follower_username,
       u2.username as following_username
FROM follows f
JOIN users u1 ON f.follower_id = u1.id
JOIN users u2 ON f.following_id = u2.id
ORDER BY f.created_at DESC
LIMIT 10;

-- 5. Prueba de inserción de notificación (reemplazar USER_ID_1 y USER_ID_2 con IDs reales)
-- INSERT INTO notifications (user_id, type, related_user_id, read) 
-- VALUES ('USER_ID_1', 'follow_request', 'USER_ID_2', false);

-- 6. Verificar que RLS está habilitado
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('notifications', 'follows', 'users');