import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook: Monitorear logros desbloqueados en tiempo real
 * Retorna el logro más reciente que se acaba de desbloquear
 */
export const useAchievementNotifications = (userId) => {
  const [unlockedAchievement, setUnlockedAchievement] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  useEffect(() => {
    if (!userId) return;

    // Verificar inicialmente
    const checkNewAchievements = async () => {
      try {
        const now = new Date();
        const oneSecondAgo = new Date(now.getTime() - 1000);
        
        // Buscar logros desbloqueados en los últimos segundos
        const { data, error } = await supabase
          .from('user_achievements')
          .select('*')
          .eq('user_id', userId)
          .gte('unlocked_at', oneSecondAgo.toISOString())
          .order('unlocked_at', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0 && data[0].unlocked_at !== lastChecked) {
          setUnlockedAchievement(data[0].achievement_type);
          setLastChecked(data[0].unlocked_at);

          // Auto-limpiar después de 5 segundos
          setTimeout(() => {
            setUnlockedAchievement(null);
          }, 5000);
        }
      } catch (err) {
        console.error('Error checking achievements:', err);
      }
    };

    // Verificar inmediatamente
    checkNewAchievements();

    // Configurar polling cada 500ms
    const interval = setInterval(checkNewAchievements, 500);

    // Cleanup
    return () => clearInterval(interval);
  }, [userId, lastChecked]);

  // Para testing, exponer función para desbloquear logro manualmente
  const testUnlockAchievement = async (achievementType) => {
    try {
      const { data, error } = await supabase
        .rpc('unlock_achievement', { p_achievement_type: achievementType });

      if (error) throw error;
      
      if (data && data[0]?.success) {
        console.log('Achievement unlocked:', achievementType);
        setUnlockedAchievement(achievementType);
        
        // Auto-limpiar
        setTimeout(() => {
          setUnlockedAchievement(null);
        }, 5000);
      }
    } catch (err) {
      console.error('Error unlocking achievement:', err);
    }
  };

  return { unlockedAchievement, testUnlockAchievement };
};
