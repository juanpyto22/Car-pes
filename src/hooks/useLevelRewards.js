import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

export const useLevelStatus = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState({
    currentLevel: 1,
    totalXp: 0,
    xpForNextLevel: 100,
    xpProgress: 0,
    coinsAvailable: 0,
    canWithdraw: false,
    loading: true,
    error: null
  });

  useEffect(() => {
    if (!user) return;

    const fetchStatus = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_level_status');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          const d = data[0];
          setStatus({
            currentLevel: d.current_level || 1,
            totalXp: d.total_xp || 0,
            xpForNextLevel: d.xp_for_next_level || 100,
            xpProgress: d.xp_progress || 0,
            coinsAvailable: d.coins_available || 0,
            canWithdraw: d.can_withdraw || false,
            loading: false,
            error: null
          });
        }
      } catch (err) {
        console.error('Error fetching level status:', err);
        setStatus(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchStatus();
    
    // Re-fetch every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  return status;
};

export const useAddXP = () => {
  const { user } = useAuth();

  const addXP = async (achievementId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error } = await supabase.rpc('add_xp_to_user', {
        p_achievement_id: achievementId
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: result.success,
          message: result.message,
          xpGained: result.xp_gained,
          newTotalXp: result.new_total_xp,
          oldLevel: result.old_level,
          newLevel: result.new_level,
          coinsEarned: result.coins_earned
        };
      }
    } catch (err) {
      console.error('Error adding XP:', err);
      throw err;
    }
  };

  return { addXP };
};

export const useUserBankAccounts = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchAccounts = async () => {
      try {
        const { data, error: err } = await supabase
          .from('user_bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (err) throw err;
        setAccounts(data || []);
      } catch (err) {
        console.error('Error fetching bank accounts:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [user]);

  const addAccount = async (accountType, accountIdentifier, accountHolderName) => {
    try {
      const { data, error: err } = await supabase.rpc('add_user_bank_account', {
        p_account_type: accountType,
        p_account_identifier: accountIdentifier,
        p_account_holder_name: accountHolderName
      });

      if (err) throw err;

      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          setAccounts(prev => [...prev, {
            id: result.account_id,
            account_type: accountType,
            account_identifier: accountIdentifier,
            account_holder_name: accountHolderName,
            is_verified: true,
            is_primary: true,
            created_at: new Date().toISOString()
          }]);
          return { success: true, message: result.message };
        }
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.error('Error adding bank account:', err);
      throw err;
    }
  };

  return { accounts, loading, error, addAccount };
};

export const useRequestWithdrawal = () => {
  const { user } = useAuth();

  const requestWithdrawal = async (amount, bankAccountId) => {
    if (!user) throw new Error('Not authenticated');

    try {
      const { data, error: err } = await supabase.rpc('request_withdrawal', {
        p_amount: amount,
        p_bank_account_id: bankAccountId
      });

      if (err) throw err;

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: result.success,
          message: result.message,
          withdrawalId: result.withdrawal_id
        };
      }
    } catch (err) {
      console.error('Error requesting withdrawal:', err);
      throw err;
    }
  };

  return { requestWithdrawal };
};

export const useWithdrawalHistory = (limit = 20) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const { data, error: err } = await supabase.rpc('get_withdrawal_history', {
          p_limit: limit
        });

        if (err) throw err;
        setHistory(data || []);
      } catch (err) {
        console.error('Error fetching withdrawal history:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
    
    // Re-fetch every 30 seconds
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [user, limit]);

  return { history, loading, error };
};
