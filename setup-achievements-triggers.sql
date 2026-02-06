-- ========================================
-- AUTO-DESBLOQUEO DE LOGROS
-- Triggers y funciones para desbloquear logros automáticamente
-- ========================================

-- FUNCIÓN: Verificar y desbloquear primer post
CREATE OR REPLACE FUNCTION public.check_first_post_achievement()
RETURNS TRIGGER AS $$
BEGIN
  -- Si es el primer post del usuario, desbloquear logro
  IF (SELECT COUNT(*) FROM public.posts WHERE user_id = NEW.user_id) = 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type)
    VALUES (NEW.user_id, 'first_catch')
    ON CONFLICT DO NOTHING;
    
    -- Sumar XP
    UPDATE public.user_stats
    SET xp = xp + 100, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id;
  END IF;
  
  -- Actualizar contador de posts
  UPDATE public.user_stats
  SET total_posts = total_posts + 1, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Auto-desbloquear primer post
DROP TRIGGER IF EXISTS trigger_first_post_achievement ON public.posts;
CREATE TRIGGER trigger_first_post_achievement
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_first_post_achievement();

-- FUNCIÓN: Verificar y desbloquear logro de seguidor
CREATE OR REPLACE FUNCTION public.check_follower_achievements()
RETURNS TRIGGER AS $$
DECLARE
  follower_count INT;
BEGIN
  -- Contar seguidores del usuario que es seguido
  SELECT COUNT(*) INTO follower_count
  FROM public.follows
  WHERE following_id = NEW.following_id;
  
  -- Si llega a 10 seguidores, desbloquear "Mariposa Social"
  IF follower_count = 10 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type)
    VALUES (NEW.following_id, 'social_butterfly')
    ON CONFLICT DO NOTHING;
    
    UPDATE public.user_stats
    SET xp = xp + 150, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.following_id;
  END IF;
  
  -- Si llega a 100 seguidores, desbloquear "Influencer"
  IF follower_count = 100 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type)
    VALUES (NEW.following_id, 'influencer')
    ON CONFLICT DO NOTHING;
    
    UPDATE public.user_stats
    SET xp = xp + 500, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.following_id;
  END IF;
  
  -- Actualizar contador de followers
  UPDATE public.user_stats
  SET total_followers = total_followers + 1, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = NEW.following_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Auto-desbloquear logros de seguidores
DROP TRIGGER IF EXISTS trigger_follower_achievements ON public.follows;
CREATE TRIGGER trigger_follower_achievements
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION public.check_follower_achievements();

-- FUNCIÓN: Verificar y desbloquear logro de likes
CREATE OR REPLACE FUNCTION public.check_like_achievements()
RETURNS TRIGGER AS $$
DECLARE
  total_likes_count INT;
BEGIN
  -- Contar total de likes que ha recibido el usuario
  SELECT COUNT(*) INTO total_likes_count
  FROM public.likes l
  JOIN public.posts p ON l.post_id = p.id
  WHERE p.user_id = (SELECT user_id FROM public.posts WHERE id = NEW.post_id);
  
  -- Actualizar contador de likes
  UPDATE public.user_stats
  SET total_likes = total_likes_count, updated_at = CURRENT_TIMESTAMP
  WHERE user_id = (SELECT user_id FROM public.posts WHERE id = NEW.post_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Actualizar likes cuando alguien da like
DROP TRIGGER IF EXISTS trigger_like_achievements ON public.likes;
CREATE TRIGGER trigger_like_achievements
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_like_achievements();

-- FUNCIÓN: Crear estadísticas por defecto cuando se crea usuario
CREATE OR REPLACE FUNCTION public.create_user_stats_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: Auto-crear stats cuando se crea nuevo usuario
DROP TRIGGER IF EXISTS trigger_create_user_stats ON public.profiles;
CREATE TRIGGER trigger_create_user_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_stats_on_signup();

-- COMENTARIOS
COMMENT ON FUNCTION public.check_first_post_achievement() IS 'Desbloquear logro de primer post';
COMMENT ON FUNCTION public.check_follower_achievements() IS 'Desbloquear logros relacionados a seguidores';
COMMENT ON FUNCTION public.check_like_achievements() IS 'Actualizar contador de likes y desbloquear logros';
COMMENT ON FUNCTION public.create_user_stats_on_signup() IS 'Crear estadísticas automáticas para nuevo usuario';
