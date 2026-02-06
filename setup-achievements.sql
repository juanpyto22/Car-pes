-- ========================================
-- SISTEMA DE LOGROS Y ESTADÍSTICAS
-- ========================================

-- Tabla: user_stats (estadísticas de usuarios)
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  total_catches INT DEFAULT 0,
  total_posts INT DEFAULT 0,
  total_likes INT DEFAULT 0,
  total_followers INT DEFAULT 0,
  spots_visited INT DEFAULT 0,
  days_active INT DEFAULT 0,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_stats_user_id_key UNIQUE(user_id)
);

-- Tabla: user_achievements (logros desbloqueados)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_achievements_unique UNIQUE(user_id, achievement_type)
);

-- Tabla: challenges (desafíos activos)
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(50),
  xp_reward INT DEFAULT 100,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  objective_type VARCHAR(50),
  objective_value INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_challenge_progress (progreso en desafíos)
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_challenge_progress_unique UNIQUE(user_id, challenge_id)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_user_id ON public.user_challenge_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenge_progress_challenge_id ON public.user_challenge_progress(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenges_end_date ON public.challenges(end_date);

-- RLS: user_stats
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own stats"
  ON public.user_stats
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can update own stats"
  ON public.user_stats
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "User can insert own stats"
  ON public.user_stats
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view all stats"
  ON public.user_stats
  FOR SELECT
  USING (true);

-- RLS: user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can insert own achievements"
  ON public.user_achievements
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Public can view all achievements"
  ON public.user_achievements
  FOR SELECT
  USING (true);

-- RLS: challenges
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view challenges"
  ON public.challenges
  FOR SELECT
  USING (true);

-- RLS: user_challenge_progress
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own progress"
  ON public.user_challenge_progress
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "User can update own progress"
  ON public.user_challenge_progress
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "User can insert own progress"
  ON public.user_challenge_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- FUNCIÓN: Obtener logros del usuario con detalles
CREATE OR REPLACE FUNCTION public.get_user_achievements(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  achievement_type VARCHAR,
  name VARCHAR,
  description TEXT,
  icon VARCHAR,
  color VARCHAR,
  xp INT,
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.id,
    ua.achievement_type,
    CASE ua.achievement_type
      WHEN 'first_catch' THEN 'Primera Captura'
      WHEN 'social_butterfly' THEN 'Mariposa Social'
      WHEN 'photographer' THEN 'Fotógrafo'
      WHEN 'big_catch' THEN 'Gran Captura'
      WHEN 'explorer' THEN 'Explorador'
      WHEN 'influencer' THEN 'Influencer'
      WHEN 'streak_master' THEN 'Racha Master'
      WHEN 'legend' THEN 'Leyenda'
      ELSE ua.achievement_type
    END::VARCHAR,
    CASE ua.achievement_type
      WHEN 'first_catch' THEN 'Compartiste tu primera captura'
      WHEN 'social_butterfly' THEN 'Sigue a 10 pescadores'
      WHEN 'photographer' THEN 'Sube 25 fotos de capturas'
      WHEN 'big_catch' THEN 'Captura un pez de más de 5kg'
      WHEN 'explorer' THEN 'Visita 5 spots diferentes'
      WHEN 'influencer' THEN 'Consigue 100 seguidores'
      WHEN 'streak_master' THEN 'Pesca 7 días seguidos'
      WHEN 'legend' THEN 'Alcanza nivel 50'
      ELSE ''
    END::TEXT,
    CASE ua.achievement_type
      WHEN 'first_catch' THEN 'Fish'
      WHEN 'social_butterfly' THEN 'Users'
      WHEN 'photographer' THEN 'Camera'
      WHEN 'big_catch' THEN 'Trophy'
      WHEN 'explorer' THEN 'Target'
      WHEN 'influencer' THEN 'Crown'
      WHEN 'streak_master' THEN 'Zap'
      WHEN 'legend' THEN 'Medal'
      ELSE 'Star'
    END::VARCHAR,
    CASE ua.achievement_type
      WHEN 'first_catch' THEN 'from-green-500 to-emerald-600'
      WHEN 'social_butterfly' THEN 'from-pink-500 to-rose-600'
      WHEN 'photographer' THEN 'from-purple-500 to-violet-600'
      WHEN 'big_catch' THEN 'from-yellow-500 to-orange-600'
      WHEN 'explorer' THEN 'from-blue-500 to-cyan-600'
      WHEN 'influencer' THEN 'from-amber-500 to-yellow-600'
      WHEN 'streak_master' THEN 'from-red-500 to-pink-600'
      WHEN 'legend' THEN 'from-indigo-500 to-purple-600'
      ELSE 'from-gray-500 to-slate-600'
    END::VARCHAR,
    CASE ua.achievement_type
      WHEN 'first_catch' THEN 100
      WHEN 'social_butterfly' THEN 150
      WHEN 'photographer' THEN 200
      WHEN 'big_catch' THEN 300
      WHEN 'explorer' THEN 250
      WHEN 'influencer' THEN 500
      WHEN 'streak_master' THEN 400
      WHEN 'legend' THEN 1000
      ELSE 50
    END::INT,
    ua.unlocked_at
  FROM public.user_achievements ua
  WHERE ua.user_id = p_user_id
  ORDER BY ua.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Desbloquear logro
CREATE OR REPLACE FUNCTION public.unlock_achievement(p_achievement_type VARCHAR)
RETURNS TABLE(
  success BOOLEAN,
  message VARCHAR,
  xp_awarded INT
) AS $$
DECLARE
  v_user_id UUID;
  v_xp INT;
  v_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Usuario no autenticado'::VARCHAR, 0::INT;
    RETURN;
  END IF;

  -- Verificar si ya tiene el logro
  SELECT COUNT(*) INTO v_count
  FROM public.user_achievements
  WHERE user_id = v_user_id AND achievement_type = p_achievement_type;

  IF v_count > 0 THEN
    RETURN QUERY SELECT false, 'El logro ya fue desbloqueado'::VARCHAR, 0::INT;
    RETURN;
  END IF;

  -- Determinar XP a otorgar
  v_xp := CASE p_achievement_type
    WHEN 'first_catch' THEN 100
    WHEN 'social_butterfly' THEN 150
    WHEN 'photographer' THEN 200
    WHEN 'big_catch' THEN 300
    WHEN 'explorer' THEN 250
    WHEN 'influencer' THEN 500
    WHEN 'streak_master' THEN 400
    WHEN 'legend' THEN 1000
    ELSE 50
  END;

  -- Insertar logro
  INSERT INTO public.user_achievements (user_id, achievement_type)
  VALUES (v_user_id, p_achievement_type);

  -- Sumar XP al usuario
  UPDATE public.user_stats
  SET xp = xp + v_xp, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT true, 'Logro desbloqueado'::VARCHAR, v_xp::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCIÓN: Actualizar estadísticas de usuario
CREATE OR REPLACE FUNCTION public.update_user_stats(
  p_new_xp INT DEFAULT 0,
  p_new_catches INT DEFAULT 0,
  p_new_posts INT DEFAULT 0,
  p_new_likes INT DEFAULT 0,
  p_new_followers INT DEFAULT 0,
  p_new_spots INT DEFAULT 0
)
RETURNS TABLE(
  success BOOLEAN,
  new_level INT,
  new_xp INT,
  message VARCHAR
) AS $$
DECLARE
  v_user_id UUID;
  v_new_level INT;
  v_new_xp INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 0::INT, 0::INT, 'Usuario no autenticado'::VARCHAR;
    RETURN;
  END IF;

  -- Actualizar estadísticas
  UPDATE public.user_stats
  SET 
    xp = xp + p_new_xp,
    total_catches = total_catches + p_new_catches,
    total_posts = total_posts + p_new_posts,
    total_likes = total_likes + p_new_likes,
    total_followers = total_followers + p_new_followers,
    spots_visited = spots_visited + p_new_spots,
    updated_at = CURRENT_TIMESTAMP
  WHERE user_id = v_user_id;

  -- Obtener nuevas estadísticas
  SELECT xp, level INTO v_new_xp, v_new_level
  FROM public.user_stats
  WHERE user_id = v_user_id;

  RETURN QUERY SELECT true, v_new_level::INT, v_new_xp::INT, 'Estadísticas actualizadas'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE public.user_stats IS 'Estadísticas y progreso de usuarios';
COMMENT ON TABLE public.user_achievements IS 'Logros desbloqueados por usuarios';
COMMENT ON TABLE public.challenges IS 'Desafíos activos en la plataforma';
COMMENT ON TABLE public.user_challenge_progress IS 'Progreso de usuarios en desafíos';
COMMENT ON FUNCTION public.get_user_achievements(UUID) IS 'Obtener logros detallados de un usuario';
COMMENT ON FUNCTION public.unlock_achievement(VARCHAR) IS 'Desbloquear un logro para el usuario actual';
COMMENT ON FUNCTION public.update_user_stats(INT, INT, INT, INT, INT, INT) IS 'Actualizar estadísticas del usuario actual';
