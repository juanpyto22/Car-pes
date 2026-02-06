import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook: Obtener todas las infracciones
 */
export const useAdminInfractions = () => {
  const [infractions, setInfractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInfractions = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .rpc('admin_get_all_infractions');

      if (err) throw err;
      setInfractions(data || []);
    } catch (err) {
      console.error('Error fetching infractions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfractions();
  }, []);

  const deleteInfraction = async (infractionId) => {
    try {
      const { data, error: err } = await supabase
        .rpc('admin_delete_infraction', { infraction_id: infractionId });

      if (err) throw err;

      if (data && data[0]?.success) {
        setInfractions(prev => 
          prev.filter(inf => inf.id !== infractionId)
        );
        return { success: true };
      }
    } catch (err) {
      console.error('Error deleting infraction:', err);
      return { success: false, error: err.message };
    }
  };

  return { infractions, loading, error, fetchInfractions, deleteInfraction };
};

/**
 * Hook: Obtener todos los bans activos
 */
export const useAdminActiveBans = () => {
  const [bans, setBans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBans = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .rpc('admin_get_all_active_bans');

      if (err) throw err;
      setBans(data || []);
    } catch (err) {
      console.error('Error fetching bans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBans();
  }, []);

  const liftBan = async (banId) => {
    try {
      const { data, error: err } = await supabase
        .rpc('admin_lift_user_ban', { ban_id: banId });

      if (err) throw err;

      if (data && data[0]?.success) {
        setBans(prev => 
          prev.filter(ban => ban.id !== banId)
        );
        return { success: true, message: 'Ban levantado' };
      }
    } catch (err) {
      console.error('Error lifting ban:', err);
      return { success: false, error: err.message };
    }
  };

  return { bans, loading, error, fetchBans, liftBan };
};

/**
 * Hook: Infracciones de usuario específico
 */
export const useAdminUserInfractions = (userId) => {
  const [infractions, setInfractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchInfractions = async () => {
      try {
        const { data, error } = await supabase
          .rpc('admin_get_user_infractions', { user_id: userId });

        if (error) throw error;
        setInfractions(data || []);
      } catch (error) {
        console.error('Error fetching user infractions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInfractions();
  }, [userId]);

  return { infractions, loading };
};

/**
 * Hook: Banear usuario manualmente
 */
export const useAdminBanUser = () => {
  const [loading, setLoading] = useState(false);

  const banUser = async (userId, banType, reason) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('admin_ban_user', {
          p_user_id: userId,
          p_ban_type: banType,
          p_reason: reason
        });

      if (error) throw error;

      if (data && data[0]?.success) {
        return { success: true, banId: data[0].ban_id };
      }
    } catch (error) {
      console.error('Error banning user:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { banUser, loading };
};

/**
 * Hook: Obtener estadísticas del sistema
 */
export const useAdminStatistics = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase
          .rpc('admin_get_statistics');

        if (error) throw error;

        if (data && data.length > 0) {
          setStats(data[0]);
        }
      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Actualizar cada 30s

    return () => clearInterval(interval);
  }, []);

  return { stats, loading };
};

/**
 * Hook: Verificar si usuario actual es admin
 * Usa la función RPC de Supabase para mayor seguridad
 */
export const useIsAdmin = (userId) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        // Usar la función RPC is_current_user_admin() que verifica el usuario autenticado
        const { data, error } = await supabase
          .rpc('is_current_user_admin');

        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
};
