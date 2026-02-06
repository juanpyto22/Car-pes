-- ========================================
-- FUNCIONES ADMINISTRATIVAS
-- Gestión de usuarios, bans e infracciones
-- ========================================

-- Función: Es admin el usuario actual
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener todas las infracciones (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_get_all_infractions()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  username VARCHAR,
  email VARCHAR,
  violation_type VARCHAR,
  violation_details TEXT,
  detected_objects TEXT[],
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  RETURN QUERY
  SELECT 
    ui.id,
    ui.user_id,
    p.username,
    p.email,
    ui.violation_type,
    ui.violation_details,
    ui.detected_objects,
    ui.confidence,
    ui.created_at
  FROM public.user_infractions ui
  JOIN public.profiles p ON ui.user_id = p.id
  ORDER BY ui.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener todos los bans activos (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_get_all_active_bans()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  username VARCHAR,
  email VARCHAR,
  ban_type VARCHAR,
  reason TEXT,
  infraction_count INT,
  ban_started_at TIMESTAMP WITH TIME ZONE,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN,
  time_remaining_text VARCHAR
) AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  RETURN QUERY
  SELECT 
    ub.id,
    ub.user_id,
    p.username,
    p.email,
    ub.ban_type,
    ub.reason,
    ub.infraction_count,
    ub.ban_started_at,
    ub.ban_expires_at,
    ub.is_active,
    CASE 
      WHEN ub.ban_type = 'permanent' THEN 'Permanente'
      WHEN ub.ban_expires_at IS NULL THEN 'N/A'
      WHEN ub.ban_expires_at < CURRENT_TIMESTAMP THEN 'Expirado'
      ELSE CONCAT(
        EXTRACT(DAY FROM (ub.ban_expires_at - CURRENT_TIMESTAMP))::INT, 'd ',
        EXTRACT(HOUR FROM (ub.ban_expires_at - CURRENT_TIMESTAMP))::INT, 'h'
      )
    END
  FROM public.user_bans ub
  JOIN public.profiles p ON ub.user_id = p.id
  WHERE ub.is_active = true
  ORDER BY ub.ban_started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener infracciones de usuario específico (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_get_user_infractions(user_id UUID)
RETURNS TABLE(
  id UUID,
  violation_type VARCHAR,
  violation_details TEXT,
  image_url TEXT,
  detected_objects TEXT[],
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  RETURN QUERY
  SELECT 
    ui.id,
    ui.violation_type,
    ui.violation_details,
    ui.image_url,
    ui.detected_objects,
    ui.confidence,
    ui.created_at
  FROM public.user_infractions ui
  WHERE ui.user_id = $1
  ORDER BY ui.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Levantar ban de usuario (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_lift_user_ban(ban_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message VARCHAR,
  user_id UUID,
  username VARCHAR
) AS $$
DECLARE
  v_user_id UUID;
  v_username VARCHAR;
  v_count INT;
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  -- Obtener user_id antes de actualizar
  SELECT user_id, (SELECT username FROM public.profiles p WHERE p.id = ub.user_id)
  INTO v_user_id, v_username
  FROM public.user_bans ub
  WHERE id = ban_id;

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Ban no encontrado'::VARCHAR, NULL::UUID, NULL::VARCHAR;
    RETURN;
  END IF;

  -- Desactivar el ban
  UPDATE public.user_bans 
  SET is_active = false, updated_at = CURRENT_TIMESTAMP
  WHERE id = ban_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN QUERY SELECT true, 'Ban levantado exitosamente'::VARCHAR, v_user_id, v_username;
  ELSE
    RETURN QUERY SELECT false, 'Error al levantar ban'::VARCHAR, v_user_id, v_username;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Eliminar infracción específica (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_delete_infraction(infraction_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message VARCHAR
) AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  DELETE FROM public.user_infractions WHERE id = infraction_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count > 0 THEN
    RETURN QUERY SELECT true, 'Infracción eliminada'::VARCHAR;
  ELSE
    RETURN QUERY SELECT false, 'Infracción no encontrada'::VARCHAR;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Banear usuario manualmente (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_ban_type VARCHAR,
  p_reason TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  message VARCHAR,
  ban_id UUID
) AS $$
DECLARE
  v_ban_id UUID;
  v_infraction_count INT;
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  -- Contar infracciones
  SELECT COUNT(*) INTO v_infraction_count
  FROM public.user_infractions
  WHERE user_id = p_user_id;

  -- Crear ban manual
  INSERT INTO public.user_bans 
    (user_id, ban_type, reason, infraction_count, ban_expires_at, is_active)
  VALUES 
    (p_user_id, p_ban_type, p_reason, v_infraction_count,
     CASE 
       WHEN p_ban_type = 'temporary_24h' THEN CURRENT_TIMESTAMP + INTERVAL '24 hours'
       WHEN p_ban_type = 'temporary_7d' THEN CURRENT_TIMESTAMP + INTERVAL '7 days'
       WHEN p_ban_type = 'permanent' THEN NULL
     END,
     true)
  RETURNING id INTO v_ban_id;

  RETURN QUERY SELECT true, 'Usuario baneado exitosamente'::VARCHAR, v_ban_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Obtener estadísticas generales (ADMIN ONLY)
CREATE OR REPLACE FUNCTION public.admin_get_statistics()
RETURNS TABLE(
  total_users BIGINT,
  total_infractions BIGINT,
  active_bans BIGINT,
  permanent_bans BIGINT,
  infractions_today BIGINT,
  bans_this_week BIGINT
) AS $$
BEGIN
  IF NOT is_current_user_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requieren permisos de admin';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.profiles)::BIGINT,
    (SELECT COUNT(*) FROM public.user_infractions)::BIGINT,
    (SELECT COUNT(*) FROM public.user_bans WHERE is_active = true AND ban_type != 'permanent')::BIGINT,
    (SELECT COUNT(*) FROM public.user_bans WHERE is_active = true AND ban_type = 'permanent')::BIGINT,
    (SELECT COUNT(*) FROM public.user_infractions WHERE DATE(created_at) = CURRENT_DATE)::BIGINT,
    (SELECT COUNT(*) FROM public.user_bans WHERE is_active = true AND ban_started_at >= CURRENT_TIMESTAMP - INTERVAL '7 days')::BIGINT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Verificar si usuario actual está baneado
CREATE OR REPLACE FUNCTION public.get_current_user_ban_status()
RETURNS TABLE(
  is_banned BOOLEAN,
  ban_type VARCHAR,
  ban_reason TEXT,
  ban_expires_at TIMESTAMP WITH TIME ZONE,
  remaining_hours INT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::VARCHAR, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::INT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    true,
    ub.ban_type,
    ub.reason,
    ub.ban_expires_at,
    CASE 
      WHEN ub.ban_expires_at IS NULL THEN NULL
      ELSE EXTRACT(HOUR FROM (ub.ban_expires_at - CURRENT_TIMESTAMP))::INT
    END
  FROM public.user_bans ub
  WHERE ub.user_id = v_user_id 
    AND ub.is_active = true
    AND (ub.ban_expires_at IS NULL OR ub.ban_expires_at > CURRENT_TIMESTAMP)
  LIMIT 1;

  -- Si no hay ban activo
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::VARCHAR, NULL::TEXT, NULL::TIMESTAMP WITH TIME ZONE, NULL::INT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION public.admin_get_all_infractions() IS 'Obtener todas las infracciones (solo admin)';
COMMENT ON FUNCTION public.admin_get_all_active_bans() IS 'Obtener todos los bans activos (solo admin)';
COMMENT ON FUNCTION public.admin_lift_user_ban(UUID) IS 'Levantar un ban de usuario (solo admin)';
COMMENT ON FUNCTION public.admin_delete_infraction(UUID) IS 'Eliminar una infracción (solo admin)';
COMMENT ON FUNCTION public.admin_ban_user(UUID, VARCHAR, TEXT) IS 'Banear usuario manualmente (solo admin)';
COMMENT ON FUNCTION public.admin_get_statistics() IS 'Obtener estadísticas del sistema (solo admin)';
COMMENT ON FUNCTION public.get_current_user_ban_status() IS 'Verificar si el usuario autenticado está baneado';
