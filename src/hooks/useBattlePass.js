import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook: Obtener progreso del battle pass actual
 */
export const useBattlePass = () => {
  const [battlePass, setBattlePass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBattlePass = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_current_battle_pass');

        if (err) throw err;

        if (data && data.length > 0) {
          setBattlePass(data[0]);
        }
      } catch (err) {
        console.error('Error fetching battle pass:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBattlePass();

    // Actualizar cada 10 segundos
    const interval = setInterval(fetchBattlePass, 10000);
    return () => clearInterval(interval);
  }, []);

  return { battlePass, loading, error };
};

/**
 * Hook: Obtener recompensas del battle pass
 */
export const useBattlePassRewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRewards = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_battle_pass_rewards');

        if (err) throw err;
        setRewards(data || []);
      } catch (err) {
        console.error('Error fetching rewards:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  return { rewards, loading, error };
};

/**
 * Hook: Reclamar recompensa
 */
export const useClaimReward = () => {
  const [loading, setLoading] = useState(false);

  const claimReward = async (rewardId) => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .rpc('claim_battle_pass_reward', { p_reward_id: rewardId });

      if (err) throw err;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          return {
            success: true,
            message: result.message,
            coinsEarned: result.coins_earned
          };
        } else {
          return { success: false, message: result.message };
        }
      }
    } catch (err) {
      console.error('Error claiming reward:', err);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { claimReward, loading };
};

/**
 * Hook: Obtener billetera del usuario
 */
export const useWallet = () => {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_user_wallet');

        if (err) throw err;

        if (data && data.length > 0) {
          setWallet(data[0]);
        } else {
          // Si no existe, crear una vacía
          setWallet({
            balance: 0.00,
            total_earned: 0.00,
            total_spent: 0.00
          });
        }
      } catch (err) {
        console.error('Error fetching wallet:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchWallet();

    // Actualizar cada 5 segundos
    const interval = setInterval(fetchWallet, 5000);
    return () => clearInterval(interval);
  }, []);

  return { wallet, loading, error };
};

/**
 * Hook: Obtener historial de transacciones
 */
export const useWalletTransactions = (limit = 20) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_wallet_transactions', { p_limit: limit });

        if (err) throw err;
        setTransactions(data || []);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [limit]);

  return { transactions, loading, error };
};
