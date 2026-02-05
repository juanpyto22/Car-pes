import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useFollowActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const followUser = async (targetUserId) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('follows')
        .insert([{ follower_id: user.id, following_id: targetUserId }]);

      if (error) throw error;

      await supabase.from('notifications').insert([{
        user_id: targetUserId,
        type: 'follow',
        related_user_id: user.id,
        read: false
      }]);

      toast({ title: "¡Ahora sigues a este usuario!" });
      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "No se pudo seguir al usuario" 
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unfollowUser = async (targetUserId) => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId);

      if (error) throw error;
      toast({ title: "Dejaste de seguir a este usuario" });
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: "No se pudo dejar de seguir" 
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getFollowStatus = async (targetUserId) => {
    if (!user) return false;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .single();
    return !!data;
  };

  return { followUser, unfollowUser, getFollowStatus, loading };
};