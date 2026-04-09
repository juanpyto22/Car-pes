# Guía de Setup Completo - Marketplace y Analytics

## ✅ Status Actual

- **Analytics**: Ya funciona (muestra stats en tiempo real de posts, likes, seguidores)
- **Marketplace**: Funciona en modo local (localStorage) pero requiere setup en BD para persistencia

---

## 🚀 Paso 1: Configurar Marketplace en Supabase

Para que el Marketplace funcione con persistencia en BD:

### Opción A: Ejecutar el Script SQL (Recomendado)

1. Ve a tu proyecto en Supabase: https://app.supabase.com
2. Abre **SQL Editor** → **New Query**
3. Copia el contenido completo de `setup-marketplace.sql` desde tu proyecto
4. Ejecuta el script (botón ▶️)
5. ✅ Deberías ver "Marketplace setup completado exitosamente"

### Opción B: Manual (Si el script no funciona)

Ejecuta estas queries una por una en Supabase SQL Editor:

```sql
-- 1. Crear tabla de productos
CREATE TABLE IF NOT EXISTS marketplace_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  condition VARCHAR(50),
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX idx_marketplace_seller_id ON marketplace_products(seller_id);
CREATE INDEX idx_marketplace_category ON marketplace_products(category);
CREATE INDEX idx_marketplace_status ON marketplace_products(status);
CREATE INDEX idx_marketplace_created_at ON marketplace_products(created_at DESC);

-- 3. Habilitar RLS
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas de seguridad
CREATE POLICY "Users can view all active products"
  ON marketplace_products FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

CREATE POLICY "Users can create their own products"
  ON marketplace_products FOR INSERT
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update their own products"
  ON marketplace_products FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can delete their own products"
  ON marketplace_products FOR DELETE
  USING (seller_id = auth.uid());
```

---

## 📊 Analytics - Ya Funciona ✅

La página de Estadísticas ya está optimizada y funciona perfectamente:

### Qué mide:
- **Publicaciones**: Total de posts creados
- **Likes recibidos**: Cuántos likes han dado a tus posts
- **Seguidores**: Cantidad de usuarios que te siguen
- **Comentarios**: Total de comentarios en tus posts
- **Media likes/post**: Promedio de engagement
- **Engagement rate**: Likes / Seguidores

### Gráfico de Actividad:
- Muestra posts y likes por día
- Periodos disponibles: 7 días, 30 días, 90 días
- Actualiza automáticamente cada cambio

### Mejores Publicaciones:
- Ranking de tus mejores posts por engagement
- Muestra likes y comentarios de cada uno

---

## 🛒 Marketplace - Setup Completado

### Características:
- ✅ Crear productos para vender
- ✅ Buscar productos por categoría
- ✅ Filtrar por condición (Nuevo, Como nuevo, Buen estado, Aceptable)
- ✅ Guardar favoritos
- ✅ Ver detalles del vendedor

### Categorías disponibles:
- 🎣 Cañas
- 🔄 Carretes
- 🪱 Señuelos
- 🧰 Accesorios
- 🧥 Ropa
- 🚤 Embarcaciones
- 📡 Electrónica
- 📦 Otros

### Cómo funciona actualmente:
1. **Modo Local**: Los productos se guardan en localStorage del navegador
2. **Con BD configurada**: Se guardan en Supabase para ver en otros dispositivos/navegadores

---

## 🔧 Verificar que Todo Funciona

### En Analytics:
- [ ] Página carga sin spinner de carga
- [ ] Muestra tus stats reales (posts, likes, seguidores)
- [ ] Puedes cambiar período (7D, 30D, 90D)
- [ ] Los gráficos responden

### En Marketplace:
- [ ] Puedes ver productos existentes (o vacío si no hay)
- [ ] Puedes crear nuevos productos con "+ Vender"
- [ ] Puedes filtrar por categoría
- [ ] Puedes guardar favoritos (icono ❤️)

---

## ⚠️ Si Aparece Aviso "Base de datos no configurada"

Esto significa que la tabla `marketplace_products` no existe en Supabase:

**Solución**: Ejecuta el script `setup-marketplace.sql` como se indica en Paso 1.

Después de ejecutarlo:
- [ ] Recarga la página (F5)
- [ ] El aviso debería desaparecer
- [ ] Los productos ahora se guardan en la BD

---

## 🎯 Próximos Pasos (Opcional)

Para optimizar aún más:

1. **Agregar imágenes**: Los productos pueden tener fotos
2. **Sistema de ofertas**: Compradores pueden hacer ofertas
3. **Historial de transacciones**: Ver qué vendiste/compraste
4. **Reputación**: Ratings de vendedores

---

## 💡 Soporte Rápido

**¿Stats vacíos en Analytics?**
- Crea más posts para ver actividad
- Los números se actualizan en tiempo real

**¿Marketplace no guarda productos?**
- Chequea que hayas ejecutado `setup-marketplace.sql`
- Verifica que no haya errores de permisos en Supabase RLS

**¿Sigue saliendo loader?**
- Limpia cache: Ctrl+Shift+Delete
- Recarga: Ctrl+Shift+R
- Si persiste, avísame

---

✅ **Tu app está lista. Estos son los dos ajustes finales para máxima funcionalidad.**
