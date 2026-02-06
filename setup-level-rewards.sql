-- ========================================
-- SISTEMA DE NIVELES, XP Y RECOMPENSAS
-- ========================================

-- 1. TABLA: Catálogo de Logros (Achievements Library)
CREATE TABLE IF NOT EXISTS public.achievements_library (
  id SERIAL PRIMARY KEY,
  achievement_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  xp_reward INT NOT NULL DEFAULT 100,
  icon VARCHAR(50) NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum, diamond
  condition_type VARCHAR(50) NOT NULL, -- first_post, followers, likes, comments, stories, etc.
  condition_value INT, -- threshold (e.g., 10 followers, 100 likes)
  is_repeatable BOOLEAN DEFAULT FALSE, -- Si se puede desbloquear múltiples veces
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar RLS
ALTER TABLE public.achievements_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Achievements library is public readable" ON public.achievements_library;
CREATE POLICY "Achievements library is public readable" ON public.achievements_library FOR SELECT USING (true);

-- 2. TABLA: Level Rewards (Recompensas por Nivel)
CREATE TABLE IF NOT EXISTS public.level_rewards (
  id SERIAL PRIMARY KEY,
  level INT UNIQUE NOT NULL,
  coins_earned INT NOT NULL, -- Monedas virtuales a dar
  euro_value DECIMAL(10, 2) NOT NULL, -- Valor en euros
  reward_tier VARCHAR(20) NOT NULL, -- bronze, silver, gold, platinum, diamond
  reward_description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Agregar RLS
ALTER TABLE public.level_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Level rewards are public readable" ON public.level_rewards;
CREATE POLICY "Level rewards are public readable" ON public.level_rewards FOR SELECT USING (true);

-- 3. TABLA: User Bank Accounts (para Cashout)
CREATE TABLE IF NOT EXISTS public.user_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type VARCHAR(20) NOT NULL, -- paypal, iban, stripe
  account_identifier VARCHAR(255) NOT NULL, -- email para PayPal, IBAN para banco
  account_holder_name VARCHAR(100),
  is_verified BOOLEAN DEFAULT FALSE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_account UNIQUE(user_id, account_type, account_identifier)
);

ALTER TABLE public.user_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own bank accounts" ON public.user_bank_accounts;
DROP POLICY IF EXISTS "Users can insert their own bank accounts" ON public.user_bank_accounts;
CREATE POLICY "Users can read their own bank accounts" ON public.user_bank_accounts 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank accounts" ON public.user_bank_accounts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. TABLA: Withdrawal Requests (Historial de Retiros)
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  coins_deducted INT NOT NULL,
  bank_account_id UUID NOT NULL REFERENCES public.user_bank_accounts(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  transaction_id VARCHAR(100), -- ID del proveedor de pago
  failure_reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  CONSTRAINT amount_ge_10 CHECK (amount >= 10.00)
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Users can read their own withdrawals" ON public.withdrawal_requests 
  FOR SELECT USING (auth.uid() = user_id);

-- 5. TABLA: Level Up Log (Registro de cuando suben de nivel)
CREATE TABLE IF NOT EXISTS public.level_up_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_level INT NOT NULL,
  new_level INT NOT NULL,
  xp_total INT NOT NULL,
  coins_earned INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE public.level_up_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own level up log" ON public.level_up_log;
CREATE POLICY "Users can read their own level up log" ON public.level_up_log 
  FOR SELECT USING (auth.uid() = user_id);

-- 6. TABLA: User Achievements (Logros desbloqueados por usuario)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(50) NOT NULL REFERENCES public.achievements_library(achievement_id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_achievement UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can read their own achievements" ON public.user_achievements 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- ACTUALIZAR user_stats - AGREGAR total_xp
-- ========================================
ALTER TABLE public.user_stats 
ADD COLUMN IF NOT EXISTS total_xp INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS level_up_coins INT DEFAULT 0; -- Monedas acumuladas sin retirar

-- ========================================
-- INSERTAR CATÁLOGO DE LOGROS
-- ========================================
-- Primero limpiar logros antiguos - DELETE para evitar problemas con FK
DELETE FROM public.user_achievements WHERE TRUE;
DELETE FROM public.achievements_library WHERE TRUE;

INSERT INTO public.achievements_library (achievement_id, name, description, xp_reward, icon, tier, condition_type, condition_value, is_repeatable)
VALUES
  -- Logros de Posts (Primeros y Milestones)
  ('first_post', 'Tu Primer Catch', 'Publica tu primer post en Car-Pes', 100, 'Fish', 'bronze', 'first_post', 1, FALSE),
  ('ten_posts', 'Publicador', 'Publica 10 posts', 200, 'Fish', 'bronze', 'total_posts', 10, FALSE),
  ('fifty_posts', 'Obseso del Contenido', 'Publica 50 posts', 500, 'Fish', 'silver', 'total_posts', 50, FALSE),
  ('hundred_posts', 'Prolífico', 'Publica 100 posts', 1000, 'Fish', 'gold', 'total_posts', 100, FALSE),
  ('five_hundred_posts', 'Leyenda de Contenido', 'Publica 500 posts', 2500, 'Fish', 'platinum', 'total_posts', 500, FALSE),
  
  -- Logros de Seguidores
  ('first_follower', 'Tu Primer Fan', 'Consigue tu primer seguidor', 50, 'Users', 'bronze', 'followers', 1, FALSE),
  ('social_butterfly', 'Mariposa Social', 'Alcanza 10 seguidores', 150, 'Users', 'bronze', 'followers', 10, FALSE),
  ('popular', 'Popular', 'Alcanza 50 seguidores', 300, 'Users', 'silver', 'followers', 50, FALSE),
  ('influencer', 'Influencer', 'Alcanza 100 seguidores', 500, 'Star', 'silver', 'followers', 100, FALSE),
  ('celebrity', 'Celebridad Local', 'Alcanza 250 seguidores', 800, 'Star', 'gold', 'followers', 250, FALSE),
  ('mega_influencer', 'Mega Influencer', 'Alcanza 1000 seguidores', 1500, 'Star', 'gold', 'followers', 1000, FALSE),
  ('superstar', 'Superestrella', 'Alcanza 5000 seguidores', 3000, 'Star', 'platinum', 'followers', 5000, FALSE),
  ('legend_follower', 'Leyenda Social', 'Alcanza 10000 seguidores', 5000, 'Star', 'diamond', 'followers', 10000, FALSE),
  
  -- Logros de Likes Recibidos
  ('first_like_received', 'Primer Me Gusta', 'Recibe tu primer like', 50, 'Heart', 'bronze', 'first_like_received', 1, FALSE),
  ('liked', 'Gustas', 'Recibe 25 likes en tus posts', 150, 'Heart', 'bronze', 'likes_received', 25, FALSE),
  ('like_collector', 'Coleccionista de Likes', 'Recibe 100 likes en tus posts', 300, 'Heart', 'silver', 'likes_received', 100, FALSE),
  ('very_liked', 'Muy Gustado', 'Recibe 500 likes en tus posts', 600, 'Heart', 'silver', 'likes_received', 500, FALSE),
  ('beloved', 'Amado', 'Recibe 1000 likes en tus posts', 1200, 'Heart', 'gold', 'likes_received', 1000, FALSE),
  ('heart_magnet', 'Imán de Corazones', 'Recibe 5000 likes en tus posts', 2500, 'Heart', 'platinum', 'likes_received', 5000, FALSE),
  
  -- Logros de Likes Dados
  ('first_like_given', 'Primer Like Dado', 'Da tu primer like a un post', 50, 'ThumbsUp', 'bronze', 'first_like_given', 1, FALSE),
  ('generous', 'Generoso', 'Da 50 likes a otros posts', 150, 'ThumbsUp', 'bronze', 'likes_given', 50, FALSE),
  ('like_giver', 'Repartidor de Loves', 'Da 100 likes a otros posts', 250, 'ThumbsUp', 'silver', 'likes_given', 100, FALSE),
  ('like_champion', 'Campeón de Likes', 'Da 500 likes a otros posts', 500, 'ThumbsUp', 'gold', 'likes_given', 500, FALSE),
  ('like_enthusiast', 'Entusiasta', 'Da 1000 likes a otros posts', 1000, 'ThumbsUp', 'gold', 'likes_given', 1000, FALSE),
  
  -- Logros de Comentarios
  ('first_comment', 'Primer Comentario', 'Comenta por primera vez', 50, 'MessageSquare', 'bronze', 'first_comment', 1, FALSE),
  ('commenter', 'Conversador', 'Haz 25 comentarios', 150, 'MessageSquare', 'bronze', 'comments', 25, FALSE),
  ('comment_regular', 'Regular en Comentarios', 'Haz 100 comentarios', 250, 'MessageSquare', 'silver', 'comments', 100, FALSE),
  ('comment_master', 'Maestro de Comentarios', 'Haz 500 comentarios', 600, 'MessageSquare', 'gold', 'comments', 500, FALSE),
  ('discussion_champion', 'Campeón de Discusiones', 'Haz 1000 comentarios', 1500, 'MessageSquare', 'platinum', 'comments', 1000, FALSE),
  
  -- Logros de Historias
  ('first_story', 'Tu Primera Historia', 'Publica tu primera historia', 75, 'BookOpen', 'bronze', 'first_story', 1, FALSE),
  ('story_teller', 'Narrador', 'Publica 5 historias', 150, 'BookOpen', 'bronze', 'stories', 5, FALSE),
  ('story_regular', 'Historiador', 'Publica 20 historias', 300, 'BookOpen', 'silver', 'stories', 20, FALSE),
  ('story_master', 'Maestro de Historias', 'Publica 50 historias', 600, 'BookOpen', 'gold', 'stories', 50, FALSE),
  ('story_legend', 'Leyenda de Historias', 'Publica 100 historias', 1500, 'BookOpen', 'platinum', 'stories', 100, FALSE),
  
  -- Logros de Marketplace
  ('first_listing', 'Primer Objeto', 'Crea tu primer anuncio en marketplace', 200, 'ShoppingBag', 'silver', 'marketplace_listings', 1, FALSE),
  ('seller', 'Vendedor', 'Crea 5 anuncios en marketplace', 300, 'ShoppingBag', 'silver', 'marketplace_listings', 5, FALSE),
  ('market_seller', 'Vendedor Activo', 'Crea 10 anuncios en marketplace', 500, 'ShoppingBag', 'gold', 'marketplace_listings', 10, FALSE),
  ('market_king', 'Rey del Mercado', 'Crea 50 anuncios en marketplace', 1200, 'ShoppingBag', 'gold', 'marketplace_listings', 50, FALSE),
  ('market_master', 'Maestro del Marketplace', 'Crea 100 anuncios en marketplace', 2500, 'ShoppingBag', 'platinum', 'marketplace_listings', 100, FALSE),
  
  -- Logros de Grupos
  ('group_creator', 'Creador de Grupos', 'Crea tu primer grupo', 300, 'Users', 'silver', 'groups_created', 1, FALSE),
  ('group_organizer', 'Organizador', 'Crea 3 grupos', 500, 'Users', 'silver', 'groups_created', 3, FALSE),
  ('group_leader', 'Líder de Grupo', 'Crea 5 grupos', 750, 'Users', 'gold', 'groups_created', 5, FALSE),
  ('group_empire', 'Imperio de Grupos', 'Crea 10 grupos', 1500, 'Users', 'platinum', 'groups_created', 10, FALSE),
  ('community_builder', 'Constructor de Comunidades', 'Crea 20 grupos', 3000, 'Users', 'platinum', 'groups_created', 20, FALSE),
  
  -- Logros de Eventos
  ('event_organizer', 'Organizador', 'Crea tu primer evento', 250, 'Calendar', 'silver', 'events_created', 1, FALSE),
  ('event_planner', 'Planificador', 'Crea 3 eventos', 400, 'Calendar', 'silver', 'events_created', 3, FALSE),
  ('event_master', 'Maestro de Eventos', 'Crea 10 eventos', 1000, 'Calendar', 'gold', 'events_created', 10, FALSE),
  ('event_legend', 'Leyenda de Eventos', 'Crea 25 eventos', 2000, 'Calendar', 'platinum', 'events_created', 25, FALSE),
  ('party_king', 'Rey de Fiestas', 'Crea 50 eventos', 4000, 'Calendar', 'diamond', 'events_created', 50, FALSE),
  
  -- Logros de Pesca
  ('fishing_spot', 'Cazador de Spots', 'Publica tu primer spot de pesca', 150, 'MapPin', 'bronze', 'fishing_spots', 1, FALSE),
  ('explorer', 'Explorador', 'Publica 10 spots de pesca', 300, 'MapPin', 'silver', 'fishing_spots', 10, FALSE),
  ('spot_collector', 'Cartógrafo', 'Guarda 25 spots de pesca', 400, 'MapPin', 'silver', 'fishing_spots_saved', 25, FALSE),
  ('map_master', 'Maestro de Mapas', 'Guarda 100 spots de pesca', 800, 'MapPin', 'gold', 'fishing_spots_saved', 100, FALSE),
  ('world_explorer', 'Explorador Mundial', 'Guarda 250 spots de pesca', 1500, 'MapPin', 'platinum', 'fishing_spots_saved', 250, FALSE),
  
  -- Logros de Permanencia y Consistencia
  ('first_week', 'Primer Semana', 'Mantén 7 días consecutivos de actividad', 150, 'Trophy', 'bronze', 'consecutive_days', 7, FALSE),
  ('two_weeks', 'Dos Semanas', 'Mantén 14 días consecutivos de actividad', 300, 'Trophy', 'bronze', 'consecutive_days', 14, FALSE),
  ('monthly', 'Mes Completo', 'Mantén 30 días consecutivos de actividad', 600, 'Trophy', 'silver', 'consecutive_days', 30, FALSE),
  ('loyal_fisherman', 'Pescador Leal', 'Mantén 60 días consecutivos de actividad', 800, 'Trophy', 'gold', 'consecutive_days', 60, FALSE),
  ('quarterly', 'Trimestral', 'Mantén 90 días consecutivos de actividad', 1200, 'Trophy', 'gold', 'consecutive_days', 90, FALSE),
  ('semi_annual', 'Semestral', 'Mantén 180 días consecutivos de actividad', 2000, 'Trophy', 'platinum', 'consecutive_days', 180, FALSE),
  ('annual', 'Anual', 'Mantén 365 días consecutivos de actividad', 5000, 'Trophy', 'diamond', 'consecutive_days', 365, FALSE),
  ('dedicated_angler', 'Angosto Dedicado', 'Alcanza 100 días de actividad total', 1500, 'Trophy', 'platinum', 'total_days_active', 100, FALSE),
  ('veteran', 'Veterano', 'Alcanza 365 días de actividad total', 3000, 'Trophy', 'platinum', 'total_days_active', 365, FALSE),
  ('eternal', 'Eterno', 'Alcanza 730 días de actividad total', 6000, 'Trophy', 'diamond', 'total_days_active', 730, FALSE),
  
  -- Logros Especiales / Diarios
  ('morning_person', 'Madrugador', 'Publica antes de las 8am', 100, 'Sun', 'bronze', 'morning_post', 1, TRUE),
  ('night_owl', 'Noctámbulo', 'Publica entre las 10pm y 5am', 100, 'Moon', 'bronze', 'night_post', 1, TRUE),
  ('weekend_warrior', 'Guerrero del Fin de Semana', 'Publica en fin de semana', 75, 'Flag', 'bronze', 'weekend_post', 1, TRUE),
  ('weekday_grind', 'Grind Entre Semana', 'Publica entre semana 5 veces', 200, 'Briefcase', 'silver', 'weekday_posts', 5, TRUE),
  
  -- Logros de Achievement Completados
  ('achiever_bronze', 'Cazador de Logros', 'Desbloquea 5 logros bronze', 200, 'Award', 'silver', 'bronze_achievements', 5, FALSE),
  ('achiever_silver', 'Buscador Persistente', 'Desbloquea 10 logros silver', 400, 'Award', 'silver', 'silver_achievements', 10, FALSE),
  ('achiever_gold', 'Coleccionista Oro', 'Desbloquea 5 logros gold', 600, 'Award', 'gold', 'gold_achievements', 5, FALSE),
  ('achiever_platinum', 'Elite', 'Desbloquea 5 logros platinum', 1000, 'Award', 'platinum', 'platinum_achievements', 5, FALSE),
  ('achievement_collector', 'Coleccionista Total', 'Desbloquea 50 logros diferentes', 2000, 'Award', 'platinum', 'total_achievements', 50, FALSE),
  ('perfect_collector', 'Perfeccionista', 'Desbloquea 75 logros diferentes', 4000, 'Award', 'diamond', 'total_achievements', 75, FALSE),
  
  -- Logros de Engagement Social
  ('shared_thousand', 'Compartidor', 'Consigue 10 comparticiones en tus posts', 300, 'Share2', 'silver', 'shares_received', 10, FALSE),
  ('viral_moment', 'Momento Viral', 'Consigue 100 de interacciones en un post', 500, 'TrendingUp', 'gold', 'viral_post', 1, FALSE),
  ('influencer_status', 'Estado Influencer', 'Tiene un engagement rate > 10%', 750, 'Zap', 'gold', 'high_engagement', 1, FALSE),
  
  -- Logros Misceláneos
  ('profile_complete', 'Perfil Completado', 'Completa todos los campos de tu perfil', 250, 'CheckCircle', 'silver', 'profile_complete', 1, FALSE),
  ('picture_perfect', 'Foto Perfecta', 'Sube una foto de perfil y portada', 100, 'Camera', 'bronze', 'has_profile_pictures', 1, FALSE),
  ('verifier', 'Verificador', 'Verifica tu email', 150, 'Check', 'bronze', 'email_verified', 1, FALSE),
  ('bio_master', 'Biógrafo', 'Crea una bio de más de 50 caracteres', 100, 'Edit', 'bronze', 'bio_length', 50, FALSE),
  
  -- Logros Raros (Difíciles)
  ('speedster', 'Velocista', 'Publica 10 posts en un solo día', 500, 'Zap', 'gold', 'posts_per_day', 10, FALSE),
  ('unstoppable', 'Imparable', 'Publica 20 posts en un solo día', 1000, 'Zap', 'platinum', 'posts_per_day', 20, FALSE),
  ('octopus', 'Pulpo', 'Interactúa (comenta + dlike) 50+ veces en un día', 400, 'Star', 'gold', 'interactions_per_day', 50, FALSE),
  ('multi_tasker', 'Multitarea', 'Crea posts, historias y eventos en el mismo día', 300, 'Workflow', 'silver', 'multi_content_day', 1, FALSE),
  ('comeback_kid', 'Niño de Regreso', 'Vuelve después de 30 días inactivo con un post viral', 750, 'RotateCw', 'gold', 'comeback', 1, FALSE);

-- ========================================
-- INSERTAR RECOMPENSAS POR NIVEL (cada 10 niveles)
-- ========================================
-- Primero limpiar recompensas antiguas - DELETE para evitar problemas con FK
DELETE FROM public.level_rewards WHERE TRUE;

INSERT INTO public.level_rewards (level, coins_earned, euro_value, reward_tier, reward_description)
VALUES
  (10, 5000, 0.50, 'bronze', 'Nivel 10 → Ganas 0.50€'),
  (20, 5000, 1.00, 'bronze', 'Nivel 20 → Ganas 1.00€ (Total: 1.00€)'),
  (30, 5000, 1.50, 'silver', 'Nivel 30 → Ganas 1.50€ (Total: 1.50€)'),
  (40, 5000, 2.00, 'silver', 'Nivel 40 → Ganas 2.00€ (Total: 2.00€)'),
  (50, 5000, 2.50, 'gold', 'Nivel 50 → Ganas 2.50€ (Total: 2.50€)'),
  (60, 5000, 3.00, 'gold', 'Nivel 60 → Ganas 3.00€ (Total: 3.00€)'),
  (70, 5000, 3.50, 'gold', 'Nivel 70 → Ganas 3.50€ (Total: 3.50€)'),
  (80, 5000, 4.00, 'platinum', 'Nivel 80 → Ganas 4.00€ (Total: 4.00€)'),
  (90, 5000, 4.50, 'platinum', 'Nivel 90 → Ganas 4.50€ (Total: 4.50€)'),
  (100, 5000, 5.00, 'platinum', 'Nivel 100 → Ganas 5.00€ (Total: 5.00€) 👑'),
  (110, 5000, 5.50, 'diamond', 'Nivel 110 → Ganas 5.50€ (Total: 5.50€)'),
  (120, 5000, 6.00, 'diamond', 'Nivel 120 → Ganas 6.00€ (Total: 6.00€)'),
  (150, 5000, 7.50, 'diamond', 'Nivel 150 → Ganas 7.50€ (Total: 7.50€)'),
  (200, 5000, 10.00, 'diamond', 'Nivel 200 → Ganas 10.00€ (Total: 10.00€) LEYENDA');

-- ========================================
-- FUNCIONES RPC
-- ========================================

-- 1. Calcular nivel actual basado en XP total
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp INT)
RETURNS INT AS $$
BEGIN
  -- Fórmula lineal: cada 100 XP = 1 nivel
  -- Nivel 1 comienza en 0 XP
  -- Nivel 2 requiere 100 XP total
  -- Nivel 3 requiere 200 XP total, etc.
  RETURN LEAST(200, GREATEST(1, (total_xp / 100) + 1));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Actualizar XP y check de recompensas por nivel
CREATE OR REPLACE FUNCTION public.add_xp_to_user(
  p_achievement_id VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  xp_gained INT,
  new_total_xp INT,
  old_level INT,
  new_level INT,
  coins_earned INT
) AS $$
DECLARE
  v_user_id UUID;
  v_xp_reward INT;
  v_current_xp INT;
  v_new_xp INT;
  v_old_level INT;
  v_new_level INT;
  v_coins INT;
  v_achievement_record RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'No authenticated user'::TEXT, 0, 0, 0, 0, 0;
    RETURN;
  END IF;

  -- Obtener XP del logro
  IF p_achievement_id IS NOT NULL THEN
    SELECT xp_reward INTO v_xp_reward
    FROM public.achievements_library
    WHERE achievement_id = p_achievement_id;
    
    IF v_xp_reward IS NULL THEN
      RETURN QUERY SELECT FALSE, 'Achievement not found'::TEXT, 0, 0, 0, 0, 0;
      RETURN;
    END IF;
  ELSE
    v_xp_reward := 0;
  END IF;

  -- Obtener XP actual
  SELECT COALESCE(total_xp, 0), COALESCE(current_level, 1) 
  INTO v_current_xp, v_old_level
  FROM public.user_stats
  WHERE user_id = v_user_id;

  -- Calcular nuevo XP
  v_new_xp := v_current_xp + v_xp_reward;
  v_new_level := public.calculate_level_from_xp(v_new_xp);

  -- Actualizar stats
  UPDATE public.user_stats
  SET 
    total_xp = v_new_xp,
    current_level = v_new_level
  WHERE user_id = v_user_id;

  -- Si subió de nivel y es múltiple de 10, dar recompensas
  v_coins := 0;
  IF v_new_level > v_old_level AND MOD(v_new_level, 10) = 0 THEN
    SELECT coins_earned INTO v_coins
    FROM public.level_rewards
    WHERE level = v_new_level;

    IF v_coins IS NOT NULL THEN
      UPDATE public.user_stats
      SET level_up_coins = COALESCE(level_up_coins, 0) + v_coins
      WHERE user_id = v_user_id;

      -- Log del level up
      INSERT INTO public.level_up_log (user_id, old_level, new_level, xp_total, coins_earned)
      VALUES (v_user_id, v_old_level, v_new_level, v_new_xp, v_coins);
    END IF;
  END IF;

  RETURN QUERY SELECT 
    TRUE, 
    CASE 
      WHEN v_new_level > v_old_level THEN '¡Subiste de nivel! ' || v_old_level || ' → ' || v_new_level
      ELSE 'XP agregado'
    END,
    v_xp_reward,
    v_new_xp,
    v_old_level,
    v_new_level,
    v_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Obtener estado actual del usuario (nivel, XP, coins)
CREATE OR REPLACE FUNCTION public.get_user_level_status()
RETURNS TABLE(
  current_level INT,
  total_xp INT,
  xp_for_next_level INT,
  xp_progress INT,
  coins_available INT,
  can_withdraw BOOLEAN
) AS $$
DECLARE
  v_user_id UUID;
  v_level INT;
  v_xp INT;
  v_coins INT;
BEGIN
  v_user_id := auth.uid();
  
  SELECT COALESCE(current_level, 1), COALESCE(total_xp, 0), COALESCE(level_up_coins, 0)
  INTO v_level, v_xp, v_coins
  FROM public.user_stats
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT 
    v_level,
    v_xp,
    ((v_level) * 100), -- XP necesario para siguiente nivel
    v_xp - ((v_level - 1) * 100), -- XP dentro del nivel actual
    v_coins,
    v_coins >= 10000; -- 10 euros en coins
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear cuenta bancaria del usuario
CREATE OR REPLACE FUNCTION public.add_user_bank_account(
  p_account_type VARCHAR,
  p_account_identifier VARCHAR,
  p_account_holder_name VARCHAR DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, account_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_account_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validar tipo de cuenta
  IF p_account_type NOT IN ('paypal', 'iban', 'stripe') THEN
    RETURN QUERY SELECT FALSE, 'Invalid account type'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Insertar cuenta
  INSERT INTO public.user_bank_accounts (user_id, account_type, account_identifier, account_holder_name, is_verified, is_primary)
  VALUES (v_user_id, p_account_type, p_account_identifier, p_account_holder_name, TRUE, TRUE)
  ON CONFLICT (user_id, account_type, account_identifier) DO UPDATE SET is_primary = TRUE
  RETURNING id INTO v_account_id;

  RETURN QUERY SELECT TRUE, 'Bank account added successfully'::TEXT, v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Solicitar retiro de dinero
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount DECIMAL,
  p_bank_account_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT, withdrawal_id UUID) AS $$
DECLARE
  v_user_id UUID;
  v_current_coins INT;
  v_coins_needed INT;
  v_withdrawal_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validar monto mínimo
  IF p_amount < 10.00 THEN
    RETURN QUERY SELECT FALSE, 'Minimum withdrawal is €10.00'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Validar que la cuenta pertenece al usuario
  IF NOT EXISTS (SELECT 1 FROM public.user_bank_accounts WHERE id = p_bank_account_id AND user_id = v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Bank account not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Obtener monedas disponibles del usuario
  SELECT COALESCE(level_up_coins, 0) INTO v_current_coins
  FROM public.user_stats
  WHERE user_id = v_user_id;

  -- Convertir euros a coins (1€ = 10000 coins)
  v_coins_needed := CAST(p_amount * 10000 AS INT);

  IF v_current_coins < v_coins_needed THEN
    RETURN QUERY SELECT FALSE, 'Insufficient coins. You have ' || v_current_coins || ' coins, need ' || v_coins_needed::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Crear withdrawal request
  INSERT INTO public.withdrawal_requests (user_id, amount, coins_deducted, bank_account_id, status)
  VALUES (v_user_id, p_amount, v_coins_needed, p_bank_account_id, 'pending')
  RETURNING id INTO v_withdrawal_id;

  -- Deducir coins
  UPDATE public.user_stats
  SET level_up_coins = level_up_coins - v_coins_needed
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT TRUE, 'Withdrawal request created. Processing...'::TEXT, v_withdrawal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Obtener historial de retiros
CREATE OR REPLACE FUNCTION public.get_withdrawal_history(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  amount DECIMAL,
  status VARCHAR,
  account_type VARCHAR,
  account_identifier VARCHAR,
  requested_at TIMESTAMP,
  processed_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wr.id,
    wr.amount,
    wr.status,
    uba.account_type,
    uba.account_identifier,
    wr.requested_at,
    wr.processed_at
  FROM public.withdrawal_requests wr
  JOIN public.user_bank_accounts uba ON wr.bank_account_id = uba.id
  WHERE wr.user_id = auth.uid()
  ORDER BY wr.requested_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- MENSAJE DE ÉXITO
-- ========================================
-- Si llegaste aquí sin errores, ¡el sistema de niveles está configurado!
