-- ========================================
-- SISTEMA DE MODERACIÓN AUTOMÁTICA
-- Detección de peces en fotos + Baneos automáticos
-- ========================================

-- Tabla: user_infractions (Registro de infracciones)
CREATE TABLE IF NOT EXISTS public.user_infractions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('invalid_image', 'no_fish')),
  violation_details TEXT,
  image_url TEXT,
  detected_objects TEXT[], -- Array de objetos detectados por IA
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: user_bans (Sistema de baneos)
CREATE TABLE IF NOT EXISTS public.user_bans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ban_type VARCHAR(50) NOT NULL CHECK (ban_type IN ('temporary_24h', 'temporary_7d', 'permanent')),
  reason TEXT NOT NULL,
  infraction_count INT NOT NULL,
  ban_started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_user_infractions_user_id ON public.user_infractions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_infractions_created_at ON public.user_infractions(created_at);
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_is_active ON public.user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_user_bans_expires_at ON public.user_bans(ban_expires_at);

-- Vista: Usuario baneado actualmente
CREATE OR REPLACE VIEW public.active_user_bans AS
SELECT 
  ub.*,
  CASE 
    WHEN ub.ban_type = 'permanent' THEN 'Permanente'
    WHEN ub.ban_type = 'temporary_7d' THEN 'Temporal (7 días)'
    WHEN ub.ban_type = 'temporary_24h' THEN 'Temporal (24 horas)'
  END as ban_duration_text,
  CASE 
    WHEN ub.ban_type = 'permanent' THEN true
    WHEN ub.ban_expires_at < CURRENT_TIMESTAMP THEN false
    ELSE true
  END as is_currently_banned
FROM public.user_bans ub
WHERE ub.is_active = true;

-- RLS Policies
ALTER TABLE public.user_infractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo admin y el usuario pueden ver sus infracciones
CREATE POLICY "usuarios_ven_sus_infracciones" ON public.user_infractions
  FOR SELECT USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "admin_ve_todas_infracciones" ON public.user_infractions
  FOR ALL USING (is_admin_user(auth.uid()));

-- Políticas: Solo admin y el usuario pueden ver sus baneos
CREATE POLICY "usuarios_ven_sus_baneos" ON public.user_bans
  FOR SELECT USING (auth.uid() = user_id OR is_admin_user(auth.uid()));

CREATE POLICY "admin_ve_todos_baneos" ON public.user_bans
  FOR ALL USING (is_admin_user(auth.uid()));

-- Función helper: verificar si usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si usuario está baneado
CREATE OR REPLACE FUNCTION public.check_user_ban(user_id UUID)
RETURNS TABLE(is_banned BOOLEAN, ban_info JSON) AS $$
DECLARE
  ban_record RECORD;
BEGIN
  SELECT * INTO ban_record FROM public.active_user_bans 
  WHERE user_id = $1 AND is_currently_banned = true
  LIMIT 1;
  
  IF ban_record IS NOT NULL THEN
    RETURN QUERY SELECT 
      true,
      json_build_object(
        'ban_type', ban_record.ban_type,
        'ban_duration_text', ban_record.ban_duration_text,
        'reason', ban_record.reason,
        'ban_started_at', ban_record.ban_started_at,
        'ban_expires_at', ban_record.ban_expires_at,
        'infraction_count', ban_record.infraction_count
      );
  ELSE
    RETURN QUERY SELECT false, '{}'::json;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Crear infracción y manejar baneos automáticos
CREATE OR REPLACE FUNCTION public.create_user_infraction(
  p_user_id UUID,
  p_violation_type VARCHAR,
  p_violation_details TEXT,
  p_image_url TEXT,
  p_detected_objects TEXT[],
  p_confidence FLOAT
)
RETURNS TABLE(
  infraction_id UUID,
  infraction_count INT,
  new_ban BOOLEAN,
  ban_type VARCHAR
) AS $$
DECLARE
  v_infraction_count INT;
  v_new_ban BOOLEAN := false;
  v_ban_type VARCHAR;
  v_new_ban_id UUID;
BEGIN
  -- Contar infracciones previas
  SELECT COUNT(*) INTO v_infraction_count 
  FROM public.user_infractions 
  WHERE user_id = p_user_id;
  
  v_infraction_count := v_infraction_count + 1;
  
  -- Crear la infracción
  INSERT INTO public.user_infractions 
    (user_id, violation_type, violation_details, image_url, detected_objects, confidence)
  VALUES 
    (p_user_id, p_violation_type, p_violation_details, p_image_url, p_detected_objects, p_confidence)
  RETURNING id INTO infraction_id;
  
  -- Determinar if ban applies y qué tipo
  IF v_infraction_count = 1 THEN
    v_ban_type := 'temporary_24h';
    v_new_ban := true;
  ELSIF v_infraction_count = 2 THEN
    v_ban_type := 'temporary_7d';
    v_new_ban := true;
  ELSIF v_infraction_count >= 3 THEN
    v_ban_type := 'permanent';
    v_new_ban := true;
  END IF;
  
  -- Crear ban si aplica
  IF v_new_ban THEN
    INSERT INTO public.user_bans 
      (user_id, ban_type, reason, infraction_count, ban_expires_at)
    VALUES 
      (p_user_id, v_ban_type, 
       CASE 
         WHEN v_ban_type = 'temporary_24h' THEN 'Primera infracción: Foto sin pez detectado'
         WHEN v_ban_type = 'temporary_7d' THEN 'Segunda infracción: Foto sin pez detectado'
         WHEN v_ban_type = 'permanent' THEN 'Tercera infracción: Baneo permanente por violar política'
       END,
       v_infraction_count,
       CASE 
         WHEN v_ban_type = 'temporary_24h' THEN CURRENT_TIMESTAMP + INTERVAL '24 hours'
         WHEN v_ban_type = 'temporary_7d' THEN CURRENT_TIMESTAMP + INTERVAL '7 days'
         WHEN v_ban_type = 'permanent' THEN NULL
       END)
    RETURNING id INTO v_new_ban_id;
  END IF;
  
  RETURN QUERY SELECT 
    infraction_id,
    v_infraction_count,
    v_new_ban,
    v_ban_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener resumen de infracciones de usuario
CREATE OR REPLACE FUNCTION public.get_user_violation_summary(user_id UUID)
RETURNS TABLE(
  total_infractions INT,
  violation_details JSON,
  current_ban JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT,
    json_agg(json_build_object(
      'id', id,
      'violation_type', violation_type,
      'created_at', created_at,
      'detected_objects', detected_objects
    )),
    (SELECT json_build_object(
      'ban_type', ban_type,
      'reason', reason,
      'ban_started_at', ban_started_at,
      'ban_expires_at', ban_expires_at
    ) FROM public.user_bans 
    WHERE user_id = $1 AND is_active = true AND ban_expires_at > CURRENT_TIMESTAMP 
    LIMIT 1)
  FROM public.user_infractions ui
  WHERE ui.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Limpiar bans expirados
CREATE OR REPLACE FUNCTION public.cleanup_expired_bans()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.user_bans 
  SET is_active = false
  WHERE is_active = true 
    AND ban_type != 'permanent'
    AND ban_expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE public.user_infractions IS 'Registro de infracciones de usuarios (fotos sin peces)';
COMMENT ON TABLE public.user_bans IS 'Sistema de baneos automáticos: 1ª=24h, 2ª=7d, 3ª=permanente';
COMMENT ON FUNCTION public.check_user_ban(UUID) IS 'Verificar si un usuario está actualmente baneado';
COMMENT ON FUNCTION public.create_user_infraction(UUID, VARCHAR, TEXT, TEXT, TEXT[], FLOAT) IS 'Crear infracción y aplicar ban automático si necesario';
COMMENT ON FUNCTION public.get_user_violation_summary(UUID) IS 'Obtener resumen de infracciones y bans actuales del usuario';
