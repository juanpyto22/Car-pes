import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook: Obtener todos los logros disponibles de la biblioteca
 */
export const useAchievementsLibrary = () => {
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAchievementsLibrary = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('achievements_library')
          .select('*')
          .order('tier', { ascending: true })
          .order('xp_reward', { ascending: true });

        if (err) throw err;
        setAchievements(data || []);
      } catch (err) {
        console.error('Error fetching achievements library:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievementsLibrary();
  }, []);

  return { achievements, loading, error };
};

/**
 * Hook: Obtener logros desbloqueados del usuario
 */
export const useUserUnlockedAchievements = (userId) => {
  const [unlockedIds, setUnlockedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUnlocked = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', userId);

        if (err && err.code !== 'PGRST116') throw err;
        
        const ids = data?.map(a => a.achievement_id) || [];
        setUnlockedIds(ids);
      } catch (err) {
        console.error('Error fetching unlocked achievements:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUnlocked();
  }, [userId]);

  return { unlockedIds, loading, error };
};

/**
 * Hook: Obtener ícono según el tier del logro
 */
export const getAchievementIcon = (tier) => {
  const tierIcons = {
    bronze: '🥉',
    silver: '🥈',
    gold: '🥇',
    platinum: '👑',
    diamond: '💎'
  };
  return tierIcons[tier] || '🏆';
};

/**
 * Hook: Obtener color del gradient según el tier
 */
export const getAchievementGradient = (tier) => {
  const gradients = {
    bronze: 'from-orange-600 to-amber-700',
    silver: 'from-gray-300 to-gray-500',
    gold: 'from-yellow-500 to-orange-600',
    platinum: 'from-purple-500 to-pink-600',
    diamond: 'from-blue-400 to-cyan-500'
  };
  return gradients[tier] || 'from-slate-600 to-slate-700';
};
