import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useComments = (postId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const getComments = useCallback(async (id) => {
    if (!id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *, 
          profiles(
            id,
            username,
            nombre,
            foto_perfil
          )
        `)
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (postId) {
      getComments(postId);
      
      const subscription = supabase
        .channel(`comments:${postId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'comments',
          filter: `post_id=eq.${postId}`
        }, () => {
          getComments(postId);
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [postId, getComments]);

  const addComment = async (userId, content, postOwnerId) => {
    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([{ post_id: postId, user_id: userId, contenido: content }])
        .select(`
          *,
          profiles(
            id,
            username,
            nombre,
            foto_perfil
          )
        `)
        .single();

      if (error) throw error;

      // Agregar comentario localmente para respuesta inmediata
      setComments(prev => [...prev, newComment]);

      // Enviar notificación si el comentario es de otro usuario
      if (postOwnerId && postOwnerId !== userId) {
        await supabase.from('notifications').insert([{
          user_id: postOwnerId,
          type: 'comment',
          related_user_id: userId,
          post_id: postId,
          read: false
        }]);
      }

      return true;
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo publicar el comentario"
      });
      return false;
    }
  };

  const deleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      
      setComments(prev => prev.filter(c => c.id !== commentId));
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete comment"
      });
      return false;
    }
  };

  return { comments, loading, addComment, deleteComment };
};