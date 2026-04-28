-- ============================================
-- MARKETPLACE SETUP - Car-Pes
-- Ejecuta este script en Supabase para crear las tablas del marketplace
-- ============================================

-- Crear tabla de productos del marketplace
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
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT positive_price CHECK (price > 0)
);

-- Índices para buscar productos rápidamente
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_id ON marketplace_products(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_products(category);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_products(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace_products(created_at DESC);

-- Crear tabla de ofertas/mensajes para comprador-vendedor
CREATE TABLE IF NOT EXISTS marketplace_offers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_price DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_offers_product_id ON marketplace_offers(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_buyer_id ON marketplace_offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_seller_id ON marketplace_offers(seller_id);

-- Crear tabla de favoritos del marketplace
CREATE TABLE IF NOT EXISTS marketplace_favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES marketplace_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_user_id ON marketplace_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_favorites_product_id ON marketplace_favorites(product_id);

-- Políticas de seguridad para marketplace_products
ALTER TABLE marketplace_products ENABLE ROW LEVEL SECURITY;
-- Ensure existing policies are removed so the script is re-runnable
DROP POLICY IF EXISTS "Users can view all active products" ON marketplace_products;
CREATE POLICY "Users can view all active products"
  ON marketplace_products FOR SELECT
  USING (status = 'active' OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own products" ON marketplace_products;
CREATE POLICY "Users can create their own products"
  ON marketplace_products FOR INSERT
  WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own products" ON marketplace_products;
CREATE POLICY "Users can update their own products"
  ON marketplace_products FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own products" ON marketplace_products;
CREATE POLICY "Users can delete their own products"
  ON marketplace_products FOR DELETE
  USING (seller_id = auth.uid());

-- Políticas para marketplace_offers
ALTER TABLE marketplace_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own offers" ON marketplace_offers;
CREATE POLICY "Users can view their own offers"
  ON marketplace_offers FOR SELECT
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Buyers can create offers" ON marketplace_offers;
CREATE POLICY "Buyers can create offers"
  ON marketplace_offers FOR INSERT
  WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "Sellers can update offers on their products" ON marketplace_offers;
CREATE POLICY "Sellers can update offers on their products"
  ON marketplace_offers FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Políticas para marketplace_favorites
ALTER TABLE marketplace_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own favorites" ON marketplace_favorites;
CREATE POLICY "Users can view their own favorites"
  ON marketplace_favorites FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own favorites" ON marketplace_favorites;
CREATE POLICY "Users can manage their own favorites"
  ON marketplace_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own favorites" ON marketplace_favorites;
CREATE POLICY "Users can delete their own favorites"
  ON marketplace_favorites FOR DELETE
  USING (user_id = auth.uid());

-- Crear tabla de estadísticas de usuario (para Analytics)
CREATE TABLE IF NOT EXISTS user_statistics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_posts INT DEFAULT 0,
  total_likes_received INT DEFAULT 0,
  total_comments_received INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Políticas para user_statistics
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own statistics" ON user_statistics;
CREATE POLICY "Users can view their own statistics"
  ON user_statistics FOR SELECT
  USING (user_id = auth.uid());

-- Crear vistas para Analytics
CREATE OR REPLACE VIEW user_post_stats AS
SELECT 
  p.user_id,
  COUNT(DISTINCT p.id) as total_posts,
  COUNT(DISTINCT CASE WHEN l.created_at >= NOW() - INTERVAL '7 days' THEN l.id END) as likes_this_week,
  COUNT(DISTINCT CASE WHEN c.created_at >= NOW() - INTERVAL '7 days' THEN c.id END) as comments_this_week,
  COUNT(DISTINCT l.id) as total_likes,
  COUNT(DISTINCT c.id) as total_comments
FROM posts p
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments c ON p.id = c.post_id
GROUP BY p.user_id;

-- Crear vista para tendencias
CREATE OR REPLACE VIEW daily_activity_stats AS
SELECT 
  user_id,
  DATE(created_at) as date,
  COUNT(DISTINCT CASE WHEN object_type = 'post' THEN id END) as posts,
  COUNT(DISTINCT CASE WHEN object_type = 'like' THEN id END) as likes
FROM (
  SELECT user_id, created_at, 'post' as object_type, id FROM posts
  UNION ALL
  SELECT p.user_id, l.created_at, 'like', l.id FROM likes l
  JOIN posts p ON l.post_id = p.id
) activities
GROUP BY user_id, DATE(created_at);

-- Mensaje de éxito
COMMIT;
-- ✅ Marketplace setup completado exitosamente
