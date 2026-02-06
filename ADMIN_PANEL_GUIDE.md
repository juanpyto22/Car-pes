# 🛡️ Panel de Administración - Guía Completa

## 🎯 Descripción General

El panel de administración permite a los usuarios con rol de admin gestionar infracciones y bans de usuarios dentro de la plataforma. Incluye estadísticas en tiempo real, visualización de bans activos, historial de infracciones, y capacidad para aplicar bans manuales.

## 📋 Índice

1. [Configuración Inicial](#configuración-inicial)
2. [Características](#características)
3. [Acceso al Panel](#acceso-al-panel)
4. [Cómo Usar](#cómo-usar)
5. [Designar Administradores](#designar-administradores)
6. [Seguridad](#seguridad)

---

## ⚙️ Configuración Inicial

### Paso 1: Desplegar las Funciones SQL

El archivo `setup-admin-panel.sql` contiene todas las funciones necesarias para el admin panel. Debes ejecutar este SQL en Supabase:

1. Ve a [Supabase Console](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** → **New Query**
4. Copia y pega el contenido de `setup-admin-panel.sql`
5. Haz clic en **Run**

**Funciones creadas:**
- `is_current_user_admin()` - Verifica si el usuario actual es admin
- `admin_get_all_infractions()` - Obtiene todas las infracciones
- `admin_get_all_active_bans()` - Obtiene todos los bans activos
- `admin_get_user_infractions(user_id)` - Obtiene infracciones de un usuario específico
- `admin_lift_user_ban(ban_id)` - Levanta un ban
- `admin_delete_infraction(infraction_id)` - Elimina una infracción
- `admin_ban_user(user_id, ban_type, reason)` - Crea un ban manual
- `admin_get_statistics()` - Obtiene estadísticas de la plataforma

### Paso 2: Crear la Columna `role` en la Tabla `profiles`

Si aún no existe, debes agregar la columna `role` a la tabla `profiles`:

```sql
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
```

### Paso 3: Designar un Administrador

Ejecuta este SQL en Supabase para convertir un usuario en admin:

```sql
UPDATE profiles 
SET role = 'admin' 
WHERE id = '<USER_ID>' AND email = '<USER_EMAIL>';
```

Obtén el `USER_ID` de la tabla `auth.users` en Supabase.

---

## 🎨 Características

### 1. **Dashboard de Estadísticas**
- Total de usuarios en la plataforma
- Total de infracciones registradas
- Bans activos
- Bans permanentes
- Infracciones hoy
- Bans esta semana

**Actualización**: Automática cada 30 segundos

### 2. **Gestión de Bans Activos**
Tabla que muestra:
- Nombre de usuario y email
- Tipo de ban (24h, 7d, Permanente)
- Razón del ban
- Número de infracciones
- Tiempo restante (excepto permanentes)
- Botón para **Levantar Ban**

**Filtros disponibles:**
- Por tipo de ban
- Búsqueda por usuario/email

### 3. **Historial de Infracciones**
Tabla que muestra:
- Nombre de usuario y email
- Tipo de violación (sin_peces, persona_detectada, otro)
- Detalles de la infracción
- Objetos detectados por IA
- Fecha y hora
- Botón para **Eliminar Infracción**

**Búsqueda disponible:**
- Por usuario, email o tipo de violación

### 4. **Banear Manual**
Formulario para aplicar bans manuales a usuarios:
- Selecciona usuario (filtrando por nombre/email)
- Elige tipo de ban
- Escribe la razón
- Confirma la acción

---

## 📖 Cómo Usar

### Acceder al Panel

1. Inicia sesión con una cuenta admin
2. Ve a `https://tudominio.com/admin`
3. Si no eres admin, verás un mensaje de "Acceso Denegado"

### Levantar un Ban

1. Ve a la pestaña **"Bans Activos"**
2. Busca o filtra el ban que deseas levantar
3. Haz clic en el botón ♻️ (Levantar Ban)
4. Confirma la acción en el cuadro de diálogo

El usuario podrá publicar inmediatamente después.

### Eliminar una Infracción

1. Ve a la pestaña **"Infracciones"**
2. Busca la infracción que deseas eliminar
3. Haz clic en el botón 🗑️ (Eliminar)
4. Confirma la acción

**Nota**: Eliminar una infracción no levanta bans asociados.

### Banear Manualmente

1. Ve a la pestaña **"Banear Manual"**
2. Busca el usuario en la lista (se muestran usuarios con infracciones previas)
3. Haz clic en la tarjeta del usuario
4. Selecciona tipo de ban:
   - 🟡 **24 Horas** - Ban temporal corto
   - 🟠 **7 Días** - Ban temporal moderado
   - 🔴 **Permanente** - Ban indefinido
5. Escribe la razón (ej: "Violación grave de políticas")
6. Haz clic en **Banear**

El usuario quedará baneado inmediatamente.

---

## 👤 Designar Administradores

### Opción 1: Mediante SQL (Recomendado)

En Supabase SQL Editor:

```sql
-- Buscar el usuario primero
SELECT id, email FROM auth.users WHERE email = 'usuario@example.com';

-- Luego actualizar su rol
UPDATE profiles 
SET role = 'admin' 
WHERE id = '<USER_ID_OBTENIDO>';

-- Verificar
SELECT id, email, role FROM profiles WHERE id = '<USER_ID_OBTENIDO>';
```

### Opción 2: Panel de Supabase

1. Ve a **Supabase Console** → **Database** → **profiles**
2. Encuentra el usuario
3. Edita la columna `role` y cambia a `'admin'`
4. Guarda los cambios

### Opción 3: En la Aplicación (Requiere Desarrollo)

Puedes crear un componente para designar admins si lo necesitas, pero por seguridad se recomienda usar SQL.

### Verificar Permisos

Para verificar que un usuario es admin:

```sql
SELECT is_current_user_admin() AS is_admin;
-- Si devuelve true, el usuario actual es admin
```

---

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las funciones admin incluyen verificaciones de seguridad:

```javascript
// En useIsAdmin(userId)
// Solo el usuario actual puede ser admin
// No se puede impersonar a otros usuarios
```

### Funciones Protegidas

Cada función SQL comienza con:

```sql
IF NOT is_current_user_admin() THEN
  RAISE EXCEPTION 'Not authorized';
END IF;
```

Esto asegura que solo admins puedan:
- Ver todas las infracciones
- Ver todos los bans
- Levantar bans
- Banear usuarios manuales
- Ver estadísticas

### Auditoría

Se recomienda agregar logs de admin para auditoría:
- Quién levantó qué ban
- Quién deletó qué infracción
- Quién baneó a quién y por qué

---

## 🛠️ Troubleshooting

### "Acceso Denegado"

- Verifica que tu usuario tenga `role = 'admin'` en la tabla `profiles`
- Haz logout y login de nuevo para refrescar los permisos
- Revisa la consola del navegador para ver errores específicos

### Funciones No Funcionan

- Verifica que las funciones SQL están creadas: Ve a **Supabase** → **Database** → **Functions**
- Si faltan, ejecuta nuevamente `setup-admin-panel.sql`

### Tabla de Bans Vacía

- Si no hay bans, la tabla mostrará "Sin bans activos"
- Verifica que el sistema de moderación está activo (check `setup-moderation.sql`)

### Búsqueda No Funciona

- Los filtros no son sensibles a mayúsculas/minúsculas (case-insensitive)
- Verifica escribir correctamente el nombre de usuario o email

---

## 📚 Archivos Relacionados

```
src/
├── pages/AdminPanel.jsx              # Página principal del admin
├── components/
│   ├── AdminRoute.jsx                # Protección de ruta por admin
│   └── AdminPanelComponents.jsx      # Componentes UI reutilizables
└── hooks/useAdminPanel.js            # Hooks para operaciones admin

setup-admin-panel.sql                 # Funciones SQL del admin
```

---

## 🚀 Próximos Pasos

1. ✅ Desplegar SQL en Supabase
2. ✅ Designar usuarios admin
3. ✅ Acceder a `/admin` con tu cuenta
4. 📊 Comenzar a monitorear infracciones y bans
5. 🛂 Configurar logs de auditoría (opcional)

---

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección [Troubleshooting](#troubleshooting)
2. Verifica los logs del navegador (F12 → Console)
3. Revisa los logs de Supabase (SQL Editor → Logs)
4. Contacta al equipo de desarrollo

---

**Última actualización**: Enero 2025
**Estado**: ✅ Completamente funcional
