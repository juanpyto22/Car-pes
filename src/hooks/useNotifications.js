import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useNotifications = (currentUser) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          related_user:profiles!related_user_id(id, username, foto_perfil),
          post:posts!post_id(id)
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', currentUser.id)
        .eq('read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron marcar como leídas"
      });
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar la notificación"
      });
    }
  };

  // Aceptar solicitud de seguimiento
  const acceptFollowRequest = async (notification) => {
    try {
      // Crear el follow
      const { error: followError } = await supabase
        .from('follows')
        .insert([{ 
          follower_id: notification.related_user_id, 
          following_id: currentUser.id 
        }]);

      if (followError) throw followError;

      // Actualizar contador de seguidores del usuario actual
      const { data: userData } = await supabase
        .from('profiles')
        .select('followers_count')
        .eq('id', currentUser.id)
        .single();

      await supabase
        .from('profiles')
        .update({ followers_count: (userData?.followers_count || 0) + 1 })
        .eq('id', currentUser.id);

      // Actualizar contador de seguidos del solicitante
      const { data: followerData } = await supabase
        .from('profiles')
        .select('following_count')
        .eq('id', notification.related_user_id)
        .single();

      await supabase
        .from('profiles')
        .update({ following_count: (followerData?.following_count || 0) + 1 })
        .eq('id', notification.related_user_id);

      // Eliminar la solicitud de notificación
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      // Crear notificación de aceptación para el solicitante
      await supabase.from('notifications').insert([{
        user_id: notification.related_user_id,
        type: 'follow_accepted',
        related_user_id: currentUser.id,
        read: false
      }]);

      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      toast({
        title: "Solicitud aceptada",
        description: `${notification.related_user?.username} ahora te sigue`
      });
    } catch (error) {
      console.error('Error aceptando solicitud:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo aceptar la solicitud"
      });
    }
  };

  // Rechazar solicitud de seguimiento
  const rejectFollowRequest = async (notification) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notification.id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notification.id));
      
      toast({
        title: "Solicitud rechazada"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo rechazar la solicitud"
      });
    }
  };

  useEffect(() => {
    if (currentUser) {
      getNotifications();

      const subscription = supabase
        .channel('notifications_user')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}` 
        }, () => {
          getNotifications();
          toast({
            title: "Nueva notificación",
            description: "¡Tienes una nueva actualización!"
          });
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [currentUser]);

  return { 
    notifications, 
    unreadCount, 
    loading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification,
    acceptFollowRequest,
    rejectFollowRequest,
    refreshNotifications: getNotifications
  };
};