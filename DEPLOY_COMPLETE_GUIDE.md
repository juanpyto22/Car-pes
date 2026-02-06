# 🚀 Guía Completa de Despliegue - Sistema de Moderación + Admin Panel

## 📋 Resumen

Este documento proporciona instrucciones paso a paso para desplegar completamente el sistema de moderación y el panel de administración en tu aplicación Car-Pes.

## 🔗 Estructura del Sistema

```
User Upload Post
    ↓
Image Analysis (AI)
    ↓
No Fish Detected?
    ↓ YES
Create Infraction
    ↓
Check Ban Status
    ↓
Apply Ban (24h/7d/Permanent)
    ↓
↓
Admin Sees in Panel
    ↓
Lift Ban / Delete Infraction / Manual Ban
```

## 📝 Checklist de Despliegue

- [ ] Paso 1: Desplegar esquema de moderación
- [ ] Paso 2: Desplegar roles y funciones de admin
- [ ] Paso 3: Designar usuarios como admin
- [ ] Paso 4: Configurar variables de entorno
- [ ] Paso 5: Probar el sistema
- [ ] Paso 6: Monitorear en producción

---

## 🔧 Paso 1: Desplegar Esquema de Moderación

### 1.1 Acceder a Supabase SQL Editor

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto **Car-Pes**
3. En el menú lateral, haz clic en **SQL Editor**
4. Haz clic en **New Query**

### 1.2 Ejecutar setup-moderation.sql

1. Copia todo el contenido de `setup-moderation.sql` (ubicado en la raíz del proyecto)
2. Pégalo en el SQL Editor
3. Haz clic en **Run** (o presiona Ctrl+Enter)
4. Espera a que se complete (debe decir "Success")

**Lo que se crea:**
- Tabla `user_infractions` (registra violaciones)
- Tabla `user_bans` (registra bans activos)
- Vista `active_user_bans` (bans aún activos)
- Funciones: `check_user_ban()`, `create_user_infraction()`, etc.

### 1.3 Verificar

```sql
-- Ejecuta esto para verificar que todo fue creado:
SELECT tablename FROM pg_tables WHERE tablename LIKE 'user_%';
-- Debe mostrar dos tablas: user_infractions, user_bans

SELECT routine_name FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' AND specific_schema = 'public' 
AND routine_name LIKE '%moderation%' OR routine_name LIKE '%ban%';
```

---

## 👤 Paso 2: Desplegar Roles y Funciones de Admin

### 2.1 Preparar Esquema de Roles

1. En el SQL Editor, nueva query
2. Copia el contenido de `setup-admin-roles.sql`
3. Haz clic en **Run**

**Lo que se crea:**
- Columna `role` en tabla `profiles`
- Índice para búsquedas rápidas
- Función `get_current_user_role()`
- Vista `admins_view` para auditoría

### 2.2 Desplegar Funciones de Admin

1. En el SQL Editor, nueva query
2. Copia el contenido de `setup-admin-panel.sql`
3. Haz clic en **Run**

**Lo que se crea:**
- Función `is_current_user_admin()` - Verifica permisos
- Función `admin_get_all_infractions()` - Lista todas las infracciones
- Función `admin_get_all_active_bans()` - Lista todos los bans
- Función `admin_lift_user_ban()` - Levanta un ban
- Función `admin_delete_infraction()` - Elimina infracción
- Función `admin_ban_user()` - Ban manual
- Función `admin_get_statistics()` - Estadísticas en tiempo real

### 2.3 Verificar

```sql
-- Ver todas las funciones admin creadas:
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name LIKE 'admin_%'
ORDER BY routine_name;

-- Debe mostrar 8 funciones
```

---

## 👥 Paso 3: Designar Usuarios como Admin

### 3.1 Obtener el ID del Usuario

```sql
-- En Supabase SQL Editor, ejecuta:
SELECT id, email FROM auth.users 
WHERE email = 'tu_email@example.com';

-- Copia el ID (se ve como: 550e8400-e29b-41d4-a716-446655440000)
```

### 3.2 Designar como Admin

```sql
-- Reemplaza 'USER_ID_AQUI' con el ID que copiaste arriba
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'USER_ID_AQUI';

-- Verifica:
SELECT id, email, role FROM profiles WHERE id = 'USER_ID_AQUI';
-- Debe mostrar role = 'admin'
```

**⚠️ Importante**: Haz logout y login de nuevo en la aplicación para que se refresquen los permisos.

---

## 🔌 Paso 4: Configurar Variables de Entorno

### 4.1 Variables de Imagen (Opcional)

Si usas AI para detectar peces, necesitas una de estas:

**Opción A: Google Cloud Vision**
```
REACT_APP_GOOGLE_VISION_API_KEY=tu_api_key_aqui
```

**Opción B: Clarifai**
```
REACT_APP_CLARIFAI_PAT=tu_personal_access_token_aqui
```

**Opción C: Local TensorFlow.js (Sin API key)**
```
# No requiere configuración, funciona offline
```

### 4.2 Actualizar .env.local

1. En la raíz del proyecto, abre o crea `.env.local`
2. Agrega las variables que necesites
3. Guarda el archivo
4. Restartea el servidor: `npm run dev`

---

## ✅ Paso 5: Probar el Sistema

### 5.1 Prueba 1: Acceder al Admin Panel

1. Inicia sesión con tu cuenta (la que designamos como admin)
2. Ve a `http://localhost:5173/admin` (o tu URL en producción)
3. **Resultado esperado**: Ves el panel de admin con estadísticas

### 5.2 Prueba 2: Ver Infracciones

1. En el panel, haz clic en pestaña **"Infracciones"**
2. **Resultado esperado**: Ves una tabla con infracciones (si las hay)

### 5.3 Prueba 3: Ver Bans Activos

1. En el panel, haz clic en pestaña **"Bans Activos"**
2. **Resultado esperado**: Ves una tabla con bans activos (si los hay)

### 5.4 Prueba 4: Banear Usuario Manual

1. En el panel, haz clic en pestaña **"Banear Manual"**
2. Busca un usuario
3. Haz clic en su tarjeta
4. Selecciona tipo de ban: 24 Horas
5. Escribe razón: "Prueba de sistema"
6. Haz clic en **Banear**
7. **Resultado esperado**: Toast de éxito, usuario aparece en "Bans Activos"

### 5.5 Prueba 5: Levantar Ban

1. Ve a pestaña **"Bans Activos"**
2. Encuentra el ban que acabas de crear
3. Haz clic en botón ♻️
4. Confirma
5. **Resultado esperado**: Ban desaparece de la lista

---

## 📊 Paso 6: Monitorear en Producción

### 6.1 Supervisar Diariamente

Acciones recomendadas cada día:

1. **Revisar Estadísticas**
   - Ver cuántas infracciones se crearon hoy
   - Ver cuántos bans están activos
   - Identificar patrones

2. **Gestionar Bans Expirados**
   - El sistema automáticamente levanta bans expirados
   - Pero puedes revisarlos manualmente

3. **Revisar Infracciones Recientes**
   - Ver qué tipo de violaciones son más comunes
   - Evaluar si el AI está detectando correctamente

### 6.2 Responder a Apelaciones

Si un usuario apela un ban:

1. Busca su usuario en el panel
2. Revisa todas sus infracciones
3. Decide si levantar el ban
4. Comunícate con el usuario

---

## 🚨 Troubleshooting

### Problema: "Acceso Denegado" en Admin Panel

**Solución:**
```sql
-- Verifica que eres admin:
SELECT role FROM profiles WHERE id = auth.uid();
-- Debe devolver 'admin'

-- Si mostró 'user', entonces:
UPDATE profiles SET role = 'admin' WHERE id = auth.uid();
```

**Luego**: Haz logout completo (cierra navegador) y login de nuevo.

### Problema: Panel Vacío (Sin Estadísticas)

**Solución:**
1. Verifica que `setup-moderation.sql` fue ejecutado
2. Verifica que `setup-admin-panel.sql` fue ejecutado
3. Mira la consola del navegador (F12) para errores
4. Revisa logs de Supabase: **Functions** tab

### Problema: No Puedo Designar Admin

**Solución:**
```sql
-- Verifica que la columna role existe:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- Si no existe, ejecuta setup-admin-roles.sql nuevamente

-- Verifica que el usuario existe:
SELECT * FROM auth.users WHERE email = 'tu@email.com';
```

---

## 📚 Archivos de Configuración

```
project-root/
├── setup-moderation.sql              ← Ejecutar primero
├── setup-admin-roles.sql             ← Ejecutar segundo  
├── setup-admin-panel.sql             ← Ejecutar tercero
├── src/
│   ├── pages/AdminPanel.jsx
│   ├── components/
│   │   ├── AdminRoute.jsx
│   │   ├── AdminPanelComponents.jsx
│   │   └── ModerationComponents.jsx
│   ├── hooks/
│   │   ├── useAdminPanel.js
│   │   ├── useModerationSystem.js
│   │   └── ... otros hooks
│   └── lib/imageAnalysis.js
├── ADMIN_PANEL_GUIDE.md              ← Guía de uso
└── DEPLOY_GUIDE.md                   ← Este archivo
```

---

## 🎯 Resumen de Archivos a Ejecutar en SQL (EN ESTE ORDEN)

### Orden Crítico:
1. **setup-moderation.sql** - Sistema de infracciones y bans básico
2. **setup-admin-roles.sql** - Estructuras de roles y seguridad
3. **setup-admin-panel.sql** - Funciones administrativas

### Verificación:

```sql
-- Al final, ejecuta esto para verificar TODO está listo:

-- 1. Revisar tablas de moderación
SELECT 'user_infractions' as table_name FROM pg_tables 
WHERE tablename = 'user_infractions'
UNION ALL
SELECT 'user_bans' FROM pg_tables WHERE tablename = 'user_bans';

-- 2. Revisar columna de roles
SELECT 'role column exists' FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'role';

-- 3. Revisar funciones admin
SELECT COUNT(*) as admin_functions FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND (routine_name LIKE 'admin_%' OR routine_name LIKE '%ban%');

-- Resultado esperado:
-- - 2 tablas
-- - 1 columna role
-- - 8+ funciones admin
```

---

## ✨ ¡Listo!

Una vez completados todos los pasos:

✅ Sistema de moderación completamente funcional
✅ Panel de admin accesible solo para admins
✅ Estadísticas en tiempo real
✅ Bans automáticos progresivos
✅ Capacidad de gestionar bans manuales
✅ Auditoría completa de infracciones

---

**Únicamente completar este guía garantiza una configuración correcta 100%**

---

## 📞 Próximos Pasos

1. Designar más administradores según sea necesario
2. Crear documentación para los administradores
3. Configurar emails de notificación (opcional)
4. Implementar logs de auditoría (opcional)
5. Monitorear regularmente

---

**Última actualización**: Enero 2025
**Status**: ✅ Completamente documentado
