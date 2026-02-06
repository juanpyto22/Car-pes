-- ┌────────────────────────────────────────────────────────────┐
-- │  Preparación del Sistema de Roles para Admin Panel          │
-- │  Ejecutar en Supabase SQL Editor si es la primera vez       │
-- └────────────────────────────────────────────────────────────┘

-- Paso 1: Agregar columna role a profiles si no existe
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin'));

-- Paso 2: Crear índice para búsquedas de admin más rápidas
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Paso 3: Verificar que la columna fue creada correctamente
-- Exec: SELECT column_name, data_type, is_nullable FROM information_schema.columns 
--       WHERE table_name = 'profiles' AND column_name = 'role';

-- Paso 4: Dar permisos en RLS para que admins puedan leer sus propios datos
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden leer su propio perfil
DROP POLICY IF EXISTS profiles_self_read ON profiles;
CREATE POLICY profiles_self_read ON profiles
FOR SELECT USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil excepto el rol
DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

-- Paso 5: Crear función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_role() 
RETURNS TEXT AS $$
BEGIN
  RETURN (SELECT role FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Paso 6: Crear vista de administradores (útil para auditoría)
CREATE OR REPLACE VIEW admins_view AS
SELECT 
  id,
  username,
  email,
  created_at
FROM profiles
WHERE role = 'admin'
ORDER BY created_at DESC;

-- ┌────────────────────────────────────────────────────────────┐
-- │  INSTRUCCIONES DE USO:                                      │
-- │  1. Ejecuta este script completo en Supabase SQL Editor    │
-- │  2. Verifica que no hay errores                             │
-- │  3. Para designar admin, usa:                               │
-- │     UPDATE profiles SET role = 'admin'                      │
-- │     WHERE id = 'USER_ID_HERE';                              │
-- │  4. Haz logout/login para refrescar permisos                │
-- └────────────────────────────────────────────────────────────┘

-- ┌────────────────────────────────────────────────────────────┐
-- │  EJEMPLOS DE USO:                                           │
-- │  Ver todos los admins:                                      │
-- │  SELECT * FROM admins_view;                                 │
-- │                                                              │
-- │  Designar admin:                                            │
-- │  UPDATE profiles SET role = 'admin'                         │
-- │  WHERE email = 'usuario@example.com';                       │
-- │                                                              │
-- │  Remover permisos de admin:                                 │
-- │  UPDATE profiles SET role = 'user'                          │
-- │  WHERE email = 'usuario@example.com';                       │
-- │                                                              │
-- │  Ver rol actual de usuario:                                 │
-- │  SELECT id, email, role FROM profiles                       │
-- │  WHERE id = (SELECT id FROM auth.users                      │
-- │              WHERE email = 'usuario@example.com');          │
-- └────────────────────────────────────────────────────────────┘
