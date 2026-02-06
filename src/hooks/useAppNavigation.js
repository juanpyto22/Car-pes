import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';

export const useAppNavigation = (user) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [pageTitle, setPageTitle] = useState('Car-Pes');
  const [backNavigation, setBackNavigation] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [unreadCounts, setUnreadCounts] = useState({
    notifications: 0,
    messages: 0
  });

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Actualizar título de página basado en la ruta
  useEffect(() => {
    const path = location.pathname;
    let title = 'Car-Pes';
    let back = null;

    switch (true) {
      case path === '/':
      case path === '/landing':
        title = 'Car-Pes - La Comunidad de Pesca';
        break;
      case path === '/feed':
        title = 'Feed - Car-Pes';
        break;
      case path === '/explore':
        title = 'Explorar - Car-Pes';
        break;
      case path === '/search':
        title = 'Buscar - Car-Pes';
        break;
      case path === '/create-post':
        title = 'Crear Post - Car-Pes';
        back = { path: '/feed', label: 'Feed' };
        break;
      case path === '/create-story':
        title = 'Crear Historia - Car-Pes';
        back = { path: '/feed', label: 'Feed' };
        break;
      case path === '/notifications':
        title = 'Notificaciones - Car-Pes';
        break;
      case path === '/messages':
        title = 'Mensajes - Car-Pes';
        break;
      case path === '/saved':
        title = 'Posts Guardados - Car-Pes';
        break;
      case path === '/profile':
        title = 'Mi Perfil - Car-Pes';
        break;
      case path === '/edit-profile':
        title = 'Editar Perfil - Car-Pes';
        back = { path: '/profile', label: 'Perfil' };
        break;
      case path === '/settings':
        title = 'Configuración - Car-Pes';
        break;
      case path.startsWith('/profile/'):
        title = 'Perfil - Car-Pes';
        back = { path: '/explore', label: 'Explorar' };
        break;
      case path.startsWith('/post/'):
        title = 'Post - Car-Pes';
        back = { path: '/feed', label: 'Feed' };
        break;
      case path.startsWith('/story/'):
        title = 'Historia - Car-Pes';
        back = { path: '/feed', label: 'Feed' };
        break;
      case path === '/login':
        title = 'Iniciar Sesión - Car-Pes';
        break;
      case path === '/signup':
        title = 'Registro - Car-Pes';
        break;
      case path === '/forgot-password':
        title = 'Recuperar Contraseña - Car-Pes';
        break;
      default:
        title = 'Car-Pes';
    }

    setPageTitle(title);
    setBackNavigation(back);
    document.title = title;
  }, [location.pathname]);

  // Obtener contadores de elementos no leídos
  const fetchUnreadCounts = useCallback(async () => {
    if (!user?.id) {
      setUnreadCounts({ notifications: 0, messages: 0 });
      return;
    }

    try {
      // Contar notificaciones no leídas
      const { count: notificationsCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      // Contar mensajes no leídos
      const { count: messagesCount } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      setUnreadCounts({
        notifications: notificationsCount || 0,
        messages: messagesCount || 0
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      setUnreadCounts({ notifications: 0, messages: 0 });
    }
  }, [user?.id]);

  // Suscribirse a cambios en notificaciones y mensajes en tiempo real
  useEffect(() => {
    if (!user?.id) return;

    fetchUnreadCounts();

    // Suscripción para notificaciones
    const notificationsSubscription = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    // Suscripción para mensajes
    const messagesSubscription = supabase
      .channel(`messages:${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`
      }, () => {
        fetchUnreadCounts();
      })
      .subscribe();

    return () => {
      notificationsSubscription.unsubscribe();
      messagesSubscription.unsubscribe();
    };
  }, [user?.id, fetchUnreadCounts]);

  // Funciones de navegación helpers
  const goBack = useCallback(() => {
    if (backNavigation) {
      navigate(backNavigation.path);
    } else {
      navigate(-1);
    }
  }, [backNavigation, navigate]);

  const goToProfile = useCallback((userId = null) => {
    if (userId && userId !== user?.id) {
      navigate(`/profile/${userId}`);
    } else {
      navigate('/profile');
    }
  }, [navigate, user?.id]);

  const goToPost = useCallback((postId) => {
    navigate(`/post/${postId}`);
  }, [navigate]);

  const goToStory = useCallback((userId) => {
    navigate(`/story/${userId}`);
  }, [navigate]);

  const goToExplore = useCallback((tab = null) => {
    if (tab) {
      navigate(`/explore?tab=${tab}`);
    } else {
      navigate('/explore');
    }
  }, [navigate]);

  const goToSearch = useCallback((query = null) => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/search');
    }
  }, [navigate]);

  // Funciones de compartir
  const sharePost = useCallback(async (postId, title = 'Mira este post en Car-Pes') => {
    const url = `${window.location.origin}/post/${postId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: '¡Mira esta increíble captura!',
          url
        });
        return true;
      } catch (error) {
        // Si el usuario cancela, no es realmente un error
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
        return false;
      }
    } else {
      // Fallback para navegadores que no soportan Web Share API
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        return false;
      }
    }
  }, []);

  const shareProfile = useCallback(async (userId, username) => {
    const url = `${window.location.origin}/profile/${userId}`;
    const title = `Perfil de @${username} en Car-Pes`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `Mira el perfil de @${username} en Car-Pes`,
          url
        });
        return true;
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing profile:', error);
        }
        return false;
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        return true;
      } catch (error) {
        console.error('Error copying profile URL:', error);
        return false;
      }
    }
  }, []);

  // Estados de navegación
  const isCurrentPath = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);

  const isOnPath = useCallback((basePath) => {
    return location.pathname.startsWith(basePath);
  }, [location.pathname]);

  return {
    // Estado actual
    currentPath: location.pathname,
    pageTitle,
    backNavigation,
    isOnline,
    unreadCounts,
    
    // Funciones de navegación
    goBack,
    goToProfile,
    goToPost,
    goToStory,
    goToExplore,
    goToSearch,
    
    // Funciones de compartir
    sharePost,
    shareProfile,
    
    // Utilidades
    isCurrentPath,
    isOnPath,
    refreshUnreadCounts: fetchUnreadCounts
  };
};