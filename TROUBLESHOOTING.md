# 🚀 Guía de Solución de Problemas - Car-Pes

## ❌ Problema: No puedo registrarme

### Posibles causas y soluciones:

1. **Variables de entorno no configuradas**
   ```bash
   # Verificar archivo .env
   VITE_SUPABASE_URL=tu_url_aqui
   VITE_SUPABASE_ANON_KEY=tu_clave_aqui
   ```

2. **Tabla 'profiles' no existe en Supabase**
   - Ve a tu proyecto en [Supabase](https://app.supabase.com)
   - Crea la tabla `profiles` con estos campos:
     ```sql
     CREATE TABLE profiles (
       id UUID REFERENCES auth.users(id) PRIMARY KEY,
       email TEXT,
       username TEXT UNIQUE,
       nombre TEXT,
       foto_perfil TEXT,
       bio TEXT,
       ubicacion TEXT,
       followers_count INTEGER DEFAULT 0,
       following_count INTEGER DEFAULT 0,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     );
     ```

3. **Permisos RLS no configurados**
   ```sql
   -- Habilitar RLS
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   
   -- Política para leer perfiles públicos
   CREATE POLICY "Public profiles are viewable by everyone" 
   ON profiles FOR SELECT 
   USING (true);
   
   -- Política para que usuarios actualicen su propio perfil
   CREATE POLICY "Users can update own profile" 
   ON profiles FOR UPDATE 
   USING (auth.uid() = id);
   
   -- Política para crear perfil
   CREATE POLICY "Users can create own profile" 
   ON profiles FOR INSERT 
   WITH CHECK (auth.uid() = id);
   ```

## ❌ Problema: Errores de WebSocket en la consola

### Soluciones:

1. **Deshabilitar Realtime temporalmente**
   - Ya está configurado para usar menos conexiones
   - Los errores no afectan la funcionalidad básica

2. **Verificar configuración de red**
   - Algunos firewalls bloquean WebSocket
   - Prueba desde otra red o desactivar temporalmente el firewall

## ❌ Problema: Las historias no funcionan

### Solución:
- Las historias requieren tablas adicionales que pueden no existir
- Por ahora, se redirecciona automáticamente a crear publicaciones normales
- Tabla requerida:
  ```sql
  CREATE TABLE stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    media_url TEXT,
    media_type TEXT,
    text_content TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
  ```

## 🔧 Comandos de Debug

1. **Verificar configuración**
   ```bash
   node debug.js
   ```

2. **Ver logs del navegador**
   - F12 → Console
   - Buscar errores rojos
   - Tomar screenshot si necesitas ayuda

3. **Probar en incógnito**
   - A veces el cache causa problemas
   - Ctrl+Shift+N (Chrome) o Ctrl+Shift+P (Firefox)

## 📞 ¿Aún tienes problemas?

1. **Revisa la consola** del navegador (F12)
2. **Toma screenshot** del error
3. **Verifica que Vercel esté funcionando** - ve al dashboard de Vercel
4. **Prueba en diferentes navegadores** (Chrome, Firefox, Safari)

## ✅ Funcionalidades que SÍ deberían funcionar ahora:

- ✅ Registro de usuarios (con tabla profiles)
- ✅ Inicio de sesión
- ✅ Navegación básica
- ✅ Creación de publicaciones (redirigido desde historias)
- ✅ Feed principal
- ✅ Perfil de usuario
- ✅ Configuración básica

---

**Última actualización:** 6 de febrero de 2026
**Versión:** 1.1.0 (con correcciones de bugs)