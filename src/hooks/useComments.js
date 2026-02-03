import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useComments = (postId) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
  }, [postId]);

  const getComments = async (id) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user:users(*)')
        .eq('post_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (userId, content) => {
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{ post_id: postId, user_id: userId, contenido: content }]);

      if (error) throw error;

      // Optimistic update handled by realtime subscription usually, 
      // but for immediate feedback we can append manually if needed.
      // We'll rely on fetch refetching triggered by subscription or manual call.
      return true;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to post comment"
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