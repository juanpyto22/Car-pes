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
CREATE POLICY "Users can read their own withdrawals" ON public.withdrawal_requests 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all withdrawals" ON public.withdrawal_requests 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

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
CREATE POLICY "Users can read their own level up log" ON public.level_up_log 
  FOR SELECT USING (auth.uid() = user_id);

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
INSERT INTO public.achievements_library (achievement_id, name, description, xp_reward, icon, tier, condition_type, condition_value, is_repeatable)
VALUES
  -- Logros sociales
  ('first_post', 'Tu Primer Catch', 'Publica tu primer post en Car-Pes', 100, 'Fish', 'bronze', 'first_post', 1, FALSE),
  ('social_butterfly', 'Mariposa Social', 'Alcanza 10 seguidores', 150, 'Users', 'bronze', 'followers', 10, FALSE),
  ('influencer', 'Influencer', 'Alcanza 100 seguidores', 500, 'Star', 'silver', 'followers', 100, FALSE),
  ('mega_influencer', 'Mega Influencer', 'Alcanza 1000 seguidores', 1500, 'Star', 'gold', 'followers', 1000, FALSE),
  
  -- Logros de interacción
  ('first_like', 'Me Gusta Primer Catch', 'Da tu primer like a un post', 50, 'Heart', 'bronze', 'first_like', 1, FALSE),
  ('like_collector', 'Coleccionista de Likes', 'Recibe 100 likes en tus posts', 300, 'Heart', 'silver', 'likes_received', 100, FALSE),
  ('like_giver', 'Generoso', 'Da 100 likes a otros posts', 250, 'Heart', 'silver', 'likes_given', 100, FALSE),
  
  -- Logros de comentarios
  ('first_comment', 'Primer Comentario', 'Comenta por primera vez', 50, 'MessageSquare', 'bronze', 'first_comment', 1, FALSE),
  ('comment_master', 'Maestro de Comentarios', 'Haz 50 comentarios', 300, 'MessageSquare', 'gold', 'comments', 50, FALSE),
  
  -- Logros de historias
  ('first_story', 'Tu Primera Historia', 'Publica tu primera historia', 75, 'BookOpen', 'bronze', 'first_story', 1, FALSE),
  ('story_master', 'Maestro de Historias', 'Publica 10 historias', 300, 'BookOpen', 'silver', 'stories', 10, FALSE),
  
  -- Logros de marketplace
  ('first_listing', 'Primer Objeto', 'Crea tu primer anuncio en marketplace', 200, 'ShoppingBag', 'silver', 'marketplace_listings', 1, FALSE),
  ('market_seller', 'Vendedor', 'Crea 10 anuncios en marketplace', 500, 'ShoppingBag', 'gold', 'marketplace_listings', 10, FALSE),
  
  -- Logros de grupos
  ('group_creator', 'Creador de Grupos', 'Crea tu primer grupo', 300, 'Users', 'silver', 'groups_created', 1, FALSE),
  ('group_leader', 'Líder de Grupo', 'Crea 5 grupos', 750, 'Users', 'gold', 'groups_created', 5, FALSE),
  
  -- Logros de eventos
  ('event_organizer', 'Organizador', 'Crea tu primer evento', 250, 'Calendar', 'silver', 'events_created', 1, FALSE),
  ('event_master', 'Maestro de Eventos', 'Crea 10 eventos', 1000, 'Calendar', 'gold', 'events_created', 10, FALSE),
  
  -- Logros de pesca
  ('fishing_spot', 'Cazador de Spots', 'Publica tu primer spot de pesca', 150, 'MapPin', 'bronze', 'fishing_spots', 1, FALSE),
  ('spot_collector', 'Explorador', 'Guarda 25 spots de pesca', 400, 'MapPin', 'silver', 'fishing_spots_saved', 25, FALSE),
  
  -- Logros de permanencia
  ('loyal_fisherman', 'Pescador Leal', 'Mantén 30 días consecutivos de actividad', 600, 'Trophy', 'gold', 'consecutive_days', 30, FALSE),
  ('dedicated_angler', 'Angosto Dedicado', 'Alcanza 100 días de actividad', 1500, 'Trophy', 'platinum', 'total_days_active', 100, FALSE)
ON CONFLICT (achievement_id) DO NOTHING;

-- ========================================
-- INSERTAR RECOMPENSAS POR NIVEL (cada 10 niveles)
-- ========================================
INSERT INTO public.level_rewards (level, coins_earned, euro_value, reward_tier, reward_description)
VALUES
  (10, 5000, 0.50, 'bronze', 'Alcanzaste nivel 10 - ¡Primer hito!'),
  (20, 10000, 1.00, 'bronze', 'Nivel 20 - Vas muy bien'),
  (30, 15000, 1.50, 'silver', 'Nivel 30 - Ya eres experimentado'),
  (40, 20000, 2.00, 'silver', 'Nivel 40 - Casi a la mitad'),
  (50, 25000, 2.50, 'gold', 'Nivel 50 - ¡Oro!'),
  (60, 30000, 3.00, 'gold', 'Nivel 60 - Siguiendo fuerte'),
  (70, 35000, 3.50, 'gold', 'Nivel 70 - Casi platinum'),
  (80, 40000, 4.00, 'platinum', 'Nivel 80 - Platinum alcanzado'),
  (90, 45000, 4.50, 'platinum', 'Nivel 90 - Casi la perfección'),
  (100, 50000, 5.00, 'platinum', 'Nivel 100 - LEYENDA'),
  (110, 55000, 5.50, 'diamond', 'Nivel 110 - Diamond'),
  (120, 60000, 6.00, 'diamond', 'Nivel 120 - Clase master'),
  (150, 75000, 7.50, 'diamond', 'Nivel 150 - Elite'),
  (200, 100000, 10.00, 'diamond', 'Nivel 200 - DIOS DE LA PESCA 👑')
ON CONFLICT (level) DO NOTHING;

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
