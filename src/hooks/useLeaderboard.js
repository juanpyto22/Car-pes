import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook: Obtener leaderboard de usuarios por followers (contando realmente desde follows table)
 */
export const useLeaderboard = (limit = 100) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);

        // 1. Obtener todos los perfiles
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil, bio, created_at');

        if (profilesErr) throw profilesErr;

        // 2. Para cada perfil, contar sus followers realmente
        const profilesWithFollowerCounts = await Promise.all(
          (profilesData || []).map(async (profile) => {
            const { count: followersCount } = await supabase
              .from('follows')
              .select('id', { count: 'exact', head: true })
              .eq('following_id', profile.id);

            return {
              ...profile,
              followers_count: followersCount || 0
            };
          })
        );

        // 3. Ordenar por followers en descendente
        profilesWithFollowerCounts.sort((a, b) => b.followers_count - a.followers_count);

        // 4. Tomar solo los primeros 'limit'
        const topUsers = profilesWithFollowerCounts.slice(0, limit);

        // 5. Obtener estado PRO para cada usuario
        const profileIds = topUsers.map(p => p.id);
        let proStatus = {};
        if (profileIds.length > 0) {
          const { data: proData, error: proErr } = await supabase
            .from('pro_verification_requests')
            .select('user_id, status, business_type')
            .in('user_id', profileIds)
            .eq('status', 'approved');

          if (!proErr) {
            proStatus = (proData || []).reduce((acc, item) => {
              acc[item.user_id] = {
                isPro: true,
                businessType: item.business_type
              };
              return acc;
            }, {});
          }
        }

        // 6. Agregar rank y enriquecer datos
        const enrichedUsers = topUsers.map((profile, index) => ({
          ...profile,
          rank: index + 1,
          isPro: proStatus[profile.id]?.isPro || false,
          businessType: proStatus[profile.id]?.businessType || null
        }));

        setUsers(enrichedUsers);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setUsers([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  return { users, loading, error };
};

/**
 * Hook: Obtener posición de un usuario específico
 */
export const useUserLeaderboardPosition = (userId) => {
  const [position, setPosition] = useState(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchPosition = async () => {
      try {
        setLoading(true);

        // Obtener datos del usuario
        const { data: userData, error: userErr } = await supabase
          .from('profiles')
          .select('followers_count')
          .eq('id', userId)
          .single();

        if (userErr) throw userErr;

        // Contar cuántos usuarios tienen más followers
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gt('followers_count', userData.followers_count - 1);

        const { count: total } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setPosition((count || 0) + 1);
        setTotalUsers(total || 0);
      } catch (err) {
        console.error('Error fetching user position:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosition();
  }, [userId]);

  return { position, totalUsers, loading };
};

export default useLeaderboard;
