-- ========================================
-- SISTEMA DE BATTLE PASS Y RECOMPENSAS
-- Gamificación con recompensas monetarias
-- ========================================

-- Tabla: battle_pass_seasons (temporadas del pase de batalla)
CREATE TABLE IF NOT EXISTS public.battle_pass_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_level INT DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: battle_pass_rewards (recompensas de batalla)
CREATE TABLE IF NOT EXISTS public.battle_pass_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE,
  level INT NOT NULL,
  tier VARCHAR(50),
  reward_type VARCHAR(50) NOT NULL, -- 'coins', 'badge', 'avatar_frame', 'title'
  reward_value INT, -- Cantidad de moneda o puntos
  reward_name VARCHAR(255),
  reward_description TEXT,
  icon VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT battle_pass_rewards_unique UNIQUE(season_id, level, reward_type)
);

-- Tabla: user_battle_pass_progress (progreso del usuario en el pase)
CREATE TABLE IF NOT EXISTS public.user_battle_pass_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.battle_pass_seasons(id) ON DELETE CASCADE,
  current_level INT DEFAULT 1,
  current_xp INT DEFAULT 0,
  xp_for_next_level INT DEFAULT 1000,
  total_rewards_claimed INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_battle_pass_unique UNIQUE(user_id, season_id)
);

-- Tabla: user_rewards_claimed (recompensas reclamadas)
CREATE TABLE IF NOT EXISTS public.user_rewards_claimed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.battle_pass_rewards(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_rewards_unique UNIQUE(user_id, reward_id)
);

-- Tabla: user_wallet (billetera/saldo del usuario)
CREATE TABLE IF NOT EXISTS public.user_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: wallet_transactions (historial de transacciones)
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL, -- 'reward', 'purchase', 'refund', 'bonus'
  description TEXT,
  related_reward_id UUID REFERENCES public.battle_pass_rewards(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_battle_pass_user_id ON public.user_battle_pass_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_battle_pass_season ON public.user_battle_pass_progress(season_id);
CREATE INDEX IF NOT EXISTS idx_battle_pass_rewards_season ON public.battle_pass_rewards(season_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_claimed_user ON public.user_rewards_claimed(user_id);
CREATE INDEX IF NOT EXISTS idx_user_wallet_user ON public.user_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);

-- RLS Policies
ALTER TABLE public.battle_pass_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_pass_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_battle_pass_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards_claimed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS: battle_pass_seasons
CREATE POLICY "Anyone can view active seasons"
  ON public.battle_pass_seasons
  FOR SELECT
  USING (is_active = true OR NOW() < end_date);

-- RLS: battle_pass_rewards
CREATE POLICY "Anyone can view rewards"
  ON public.battle_pass_rewards
  FOR SELECT
  USING (true);

-- RLS: user_battle_pass_progress
CREATE POLICY "User can view own progress"
  ON public.user_battle_pass_progress
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can update own progress"
  ON public.user_battle_pass_progress
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Public can view all progress"
  ON public.user_battle_pass_progress
  FOR SELECT
  USING (true);

-- RLS: user_rewards_claimed
CREATE POLICY "User can view own rewards"
  ON public.user_rewards_claimed
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can claim rewards"
  ON public.user_rewards_claimed
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: user_wallet
CREATE POLICY "User can view own wallet"
  ON public.user_wallet
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can update own wallet"
  ON public.user_wallet
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "User can insert own wallet"
  ON public.user_wallet
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: wallet_transactions
CREATE POLICY "User can view own transactions"
  ON public.wallet_transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can insert own transactions"
  ON public.wallet_transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ========================================
-- FUNCIONES
-- ========================================

-- FUNCIÓN: Obtener progreso del battle pass actual
CREATE OR REPLACE FUNCTION public.get_current_battle_pass()
RETURNS TABLE(
  season_id UUID,
  season_number INT,
  season_name VARCHAR,
  current_level INT,
  current_xp INT,
  xp_for_next_level INT,
  max_level INT,
  progress_percent INT,
  completed BOOLEAN,
  days_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bps.id,
    bps.season_number,
    bps.name,
    COALESCE(ubpp.current_level, 1),
    COALESCE(ubpp.current_xp, 0),
    COALESCE(ubpp.xp_for_next_level, 1000),
    bps.max_level,
    CASE 
      WHEN COALESCE(ubpp.current_level, 1) >= bps.max_level THEN 100
      ELSE LEAST(100, GREATEST(0, (COALESCE(ubpp.current_xp, 0)::INT / NULLIF(COALESCE(ubpp.xp_for_next_level, 1000), 0)) * 100))
    END,
    COALESCE(ubpp.completed, false),
    EXTRACT(DAY FROM (bps.end_date - CURRENT_TIMESTAMP))::INT
  FROM public.battle_pass_seasons bps
  LEFT JOIN public.user_battle_pass_progress ubpp 
    ON ubpp.season_id = bps.id AND ubpp.user_id = auth.uid()
  WHERE bps.is_active = true
  ORDER BY bps.season_number DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Obtener recompensas del battle pass actual
CREATE OR REPLACE FUNCTION public.get_battle_pass_rewards()
RETURNS TABLE(
  reward_id UUID,
  level INT,
  tier VARCHAR,
  reward_type VARCHAR,
  reward_value INT,
  reward_name VARCHAR,
  reward_description TEXT,
  icon VARCHAR,
  claimed BOOLEAN
) AS $$
DECLARE
  v_season_id UUID;
BEGIN
  -- Obtener season actual
  SELECT id INTO v_season_id
  FROM public.battle_pass_seasons
  WHERE is_active = true
  ORDER BY season_number DESC
  LIMIT 1;

  RETURN QUERY
  SELECT 
    bpr.id,
    bpr.level,
    bpr.tier,
    bpr.reward_type,
    bpr.reward_value,
    bpr.reward_name,
    bpr.reward_description,
    bpr.icon,
    CASE 
      WHEN EXISTS(
        SELECT 1 FROM public.user_rewards_claimed urc 
        WHERE urc.reward_id = bpr.id AND urc.user_id = auth.uid()
      ) THEN true
      ELSE false
    END
  FROM public.battle_pass_rewards bpr
  WHERE bpr.season_id = v_season_id
  ORDER BY bpr.level ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Reclamar recompensa
CREATE OR REPLACE FUNCTION public.claim_battle_pass_reward(p_reward_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message VARCHAR,
  coins_earned INT
) AS $$
DECLARE
  v_user_id UUID;
  v_reward_value INT;
  v_reward_type VARCHAR;
  v_claimed_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Usuario no autenticado'::VARCHAR, 0::INT;
    RETURN;
  END IF;

  -- Verificar si ya fue reclamada
  SELECT COUNT(*) INTO v_claimed_count
  FROM public.user_rewards_claimed
  WHERE user_id = v_user_id AND reward_id = p_reward_id;

  IF v_claimed_count > 0 THEN
    RETURN QUERY SELECT false, 'Ya reclamaste esta recompensa'::VARCHAR, 0::INT;
    RETURN;
  END IF;

  -- Obtener detalles de recompensa
  SELECT reward_value, reward_type INTO v_reward_value, v_reward_type
  FROM public.battle_pass_rewards
  WHERE id = p_reward_id;

  -- Insertar recompensa reclamada
  INSERT INTO public.user_rewards_claimed (user_id, reward_id)
  VALUES (v_user_id, p_reward_id);

  -- Si es moneda, actualizar billetera
  IF v_reward_type = 'coins' THEN
    -- Actualizar o crear billetera
    INSERT INTO public.user_wallet (user_id, balance, total_earned)
    VALUES (v_user_id, v_reward_value, v_reward_value)
    ON CONFLICT (user_id) DO UPDATE SET
      balance = user_wallet.balance + v_reward_value,
      total_earned = user_wallet.total_earned + v_reward_value,
      updated_at = CURRENT_TIMESTAMP;

    -- Registrar transacción
    INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, related_reward_id)
    VALUES (v_user_id, v_reward_value, 'reward', 'Battle Pass Reward', p_reward_id);

    RETURN QUERY SELECT true, 'Recompensa reclamada'::VARCHAR, v_reward_value::INT;
  ELSE
    RETURN QUERY SELECT true, 'Recompensa reclamada'::VARCHAR, 0::INT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Obtener saldo de billetera
CREATE OR REPLACE FUNCTION public.get_user_wallet()
RETURNS TABLE(
  balance DECIMAL,
  total_earned DECIMAL,
  total_spent DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(uw.balance, 0.00),
    COALESCE(uw.total_earned, 0.00),
    COALESCE(uw.total_spent, 0.00)
  FROM public.user_wallet uw
  WHERE uw.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Obtener historial de transacciones
CREATE OR REPLACE FUNCTION public.get_wallet_transactions(p_limit INT DEFAULT 20)
RETURNS TABLE(
  id UUID,
  amount DECIMAL,
  transaction_type VARCHAR,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id,
    wt.amount,
    wt.transaction_type,
    wt.description,
    wt.created_at
  FROM public.wallet_transactions wt
  WHERE wt.user_id = auth.uid()
  ORDER BY wt.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMENTARIOS
COMMENT ON TABLE public.battle_pass_seasons IS 'Temporadas del pase de batalla';
COMMENT ON TABLE public.battle_pass_rewards IS 'Recompensas de cada nivel del battle pass';
COMMENT ON TABLE public.user_battle_pass_progress IS 'Progreso del usuario en el battle pass';
COMMENT ON TABLE public.user_wallet IS 'Billetera virtual del usuario';
COMMENT ON TABLE public.wallet_transactions IS 'Historial de transacciones de moneda';
COMMENT ON FUNCTION public.get_current_battle_pass() IS 'Obtener información del battle pass actual';
COMMENT ON FUNCTION public.get_battle_pass_rewards() IS 'Obtener recompensas disponibles del battle pass';
COMMENT ON FUNCTION public.claim_battle_pass_reward(UUID) IS 'Reclamar una recompensa del battle pass';
COMMENT ON FUNCTION public.get_user_wallet() IS 'Obtener información de billetera del usuario';
COMMENT ON FUNCTION public.get_wallet_transactions(INT) IS 'Obtener historial de transacciones';
