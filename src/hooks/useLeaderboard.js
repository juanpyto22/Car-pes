import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook: Obtener leaderboard de usuarios por followers
 */
export const useLeaderboard = (limit = 100, businessType = null) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);

        // Obtener perfiles ordenados por followers
        let query = supabase
          .from('profiles')
          .select(`
            id,
            username,
            nombre,
            foto_perfil,
            bio,
            followers_count,
            created_at
          `)
          .order('followers_count', { ascending: false })
          .limit(limit);

        const { data: profilesData, error: profilesErr } = await query;

        if (profilesErr) throw profilesErr;

        const profileIds = (profilesData || []).map(p => p.id);

        // Obtener estado PRO para cada usuario
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

        // Combinar datos
        const enrichedUsers = (profilesData || []).map((profile, index) => ({
          ...profile,
          rank: index + 1,
          isPro: proStatus[profile.id]?.isPro || false,
          businessType: proStatus[profile.id]?.businessType || null
        }));

        // Filtrar por tipo de negocio si se especifica
        let filtered = enrichedUsers;
        if (businessType) {
          filtered = enrichedUsers.filter(u => u.isPro && u.businessType === businessType);
          // Re-numerar ranks después de filtrar
          filtered = filtered.map((u, idx) => ({ ...u, rank: idx + 1 }));
        }

        setUsers(filtered);
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
  }, [limit, businessType]);

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
