import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook: Obtener estadísticas del usuario
 */
export const useUserStats = (userId) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (err && err.code !== 'PGRST116') throw err;

        // Si no existen estadísticas, crearlas
        if (!data) {
          const newStats = {
            user_id: userId,
            level: 1,
            xp: 0,
            total_catches: 0,
            total_posts: 0,
            total_likes: 0,
            total_followers: 0,
            spots_visited: 0,
            days_active: 0,
            current_streak: 0,
            longest_streak: 0,
          };

          const { data: created, error: createErr } = await supabase
            .from('user_stats')
            .insert(newStats)
            .select()
            .single();

          if (createErr) throw createErr;
          setStats(created);
        } else {
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching user stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  return { stats, loading, error };
};

/**
 * Hook: Obtener logros desbloqueados
 */
export const useAchievements = (userId) => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_user_achievements', { p_user_id: userId });

        if (err) throw err;
        setAchievements(data || []);
      } catch (err) {
        console.error('Error fetching achievements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [userId]);

  return { achievements, loading, error };
};

/**
 * Hook: Desbloquear logro
 */
export const useUnlockAchievement = () => {
  const [loading, setLoading] = useState(false);

  const unlock = async (achievementType) => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .rpc('unlock_achievement', { p_achievement_type: achievementType });

      if (err) throw err;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return { success: true, xpAwarded: result.xp_awarded, message: result.message };
        } else {
          return { success: false, message: result.message };
        }
      }
    } catch (err) {
      console.error('Error unlocking achievement:', err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { unlock, loading };
};

/**
 * Hook: Actualizar estadísticas del usuario
 */
export const useUpdateStats = () => {
  const [loading, setLoading] = useState(false);

  const updateStats = async (stats) => {
    try {
      setLoading(true);
      const {
        xp = 0,
        catches = 0,
        posts = 0,
        likes = 0,
        followers = 0,
        spots = 0,
      } = stats;

      const { data, error: err } = await supabase
        .rpc('update_user_stats', {
          p_new_xp: xp,
          p_new_catches: catches,
          p_new_posts: posts,
          p_new_likes: likes,
          p_new_followers: followers,
          p_new_spots: spots,
        });

      if (err) throw err;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return {
            success: true,
            newLevel: result.new_level,
            newXp: result.new_xp,
            message: result.message,
          };
        } else {
          return { success: false, message: result.message };
        }
      }
    } catch (err) {
      console.error('Error updating stats:', err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { updateStats, loading };
};

/**
 * Hook: Obtener desafíos activos
 */
export const useChallenges = () => {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        setLoading(true);
        const now = new Date().toISOString();
        const { data, error: err } = await supabase
          .from('challenges')
          .select('*')
          .gte('end_date', now)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setChallenges(data || []);
      } catch (err) {
        console.error('Error fetching challenges:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, []);

  return { challenges, loading, error };
};

/**
 * Hook: Obtener leaderboard
 */
export const useLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('user_stats')
          .select(`
            *,
            user:profiles(id, username, foto_perfil)
          `)
          .order('xp', { ascending: false })
          .limit(10);

        if (err) throw err;
        setLeaderboard(data || []);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return { leaderboard, loading, error };
};
