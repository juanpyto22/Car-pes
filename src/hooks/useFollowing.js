import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export const useFollowing = () => {
  const { user } = useAuth();
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    fetchFollowing();
  }, [user?.id]);

  const fetchFollowing = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener todos los usuarios que el usuario actual sigue
      const { data, error: queryError } = await supabase
        .from('follows')
        .select('following:profiles!following_id(id, username, nombre, foto_perfil, bio)')
        .eq('follower_id', user.id);

      if (queryError) throw queryError;

      // Extraer los perfiles de usuario seguidos
      const followingUsers = data
        ?.map(follow => follow.following)
        .filter(profile => profile && profile.id)
        || [];

      setFollowing(followingUsers);
    } catch (err) {
      console.error('Error fetching following:', err);
      setError(err.message);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  return { following, loading, error, refetch: fetchFollowing };
};
