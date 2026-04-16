import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const SINGLE_ADMIN_ID = 'f0e53339-180c-4491-926c-ecdbe1480849';

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
 * Hook: Buscar usuarios por nombre/email
 */
export const useSearchUsers = (query) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query || query.length < 1) {
      setUsers([]);
      return;
    }

    const searchUsers = async () => {
      try {
        setLoading(true);
        const searchPattern = `%${query.toLowerCase()}%`;
        
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, username, email')
          .or(`username.ilike.${searchPattern},email.ilike.${searchPattern}`);

        console.log('useSearchUsers - query:', query, 'results:', data, 'error:', err);

        if (err) throw err;
        setUsers(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
        setError(err.message);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    searchUsers();
  }, [query]);

  return { users, loading, error };
};

/**
 * Hook: Obtener solicitudes Pro para revision administrativa
 */
export const useAdminProRequests = (status = 'pending') => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('pro_verification_requests')
        .select(`
          id,
          user_id,
          business_name,
          business_type,
          legal_name,
          tax_id,
          contact_phone,
          website,
          business_address,
          docs_url,
          validation_notes,
          status,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at,
          user:profiles!user_id(
            id,
            username,
            nombre,
            email,
            foto_perfil
          )
        `)
        .order('created_at', { ascending: true });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: err } = await query;

      let normalizedData = data;
      if (err) {
        // Fallback without relation join in case FK naming differs in this DB.
        let fallbackQuery = supabase
          .from('pro_verification_requests')
          .select('*')
          .order('created_at', { ascending: true });

        if (status && status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status);
        }

        const { data: fallbackData, error: fallbackErr } = await fallbackQuery;
        if (fallbackErr) throw fallbackErr;

        const userIds = [...new Set((fallbackData || []).map((item) => item.user_id).filter(Boolean))];
        let profileMap = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, nombre, email, foto_perfil')
            .in('id', userIds);

          profileMap = (profiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }

        normalizedData = (fallbackData || []).map((item) => ({
          ...item,
          user: profileMap[item.user_id] || null,
        }));
      }

      setRequests(normalizedData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching pro requests:', err);
      setRequests([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [status]);

  return { requests, loading, error, refetch: fetchRequests };
};

/**
 * Hook: Revisar solicitud Pro (aprobar/rechazar) con motivo y notificacion
 */
export const useAdminReviewProRequest = () => {
  const [loading, setLoading] = useState(false);

  const sendReviewNotification = async ({ userId, adminId, status, reason }) => {
    const type = status === 'approved' ? 'pro_verification_approved' : 'pro_verification_rejected';
    const content = reason?.trim() || (status === 'approved'
      ? 'Tu solicitud de perfil Pro ha sido aprobada.'
      : 'Tu solicitud de perfil Pro ha sido rechazada.');

    const payloadVariants = [
      { user_id: userId, type, related_user_id: adminId, content, read: false },
      { user_id: userId, type, from_user_id: adminId, content, read: false },
      { user_id: userId, type, related_user_id: adminId, read: false },
      { user_id: userId, type, from_user_id: adminId, read: false },
      { user_id: userId, type, read: false },
    ];

    for (const payload of payloadVariants) {
      const { error } = await supabase.from('notifications').insert(payload);
      if (!error) return true;
    }

    return false;
  };

  const reviewRequest = async ({ requestId, status, reason }) => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminUser = authData?.user;

      const payload = {
        status,
        validation_notes: reason?.trim() || null,
        reviewed_by: adminUser?.id || null,
        reviewed_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('pro_verification_requests')
        .update(payload)
        .eq('id', requestId)
        .select('id, user_id, status')
        .single();

      if (error) throw error;

      if (data?.user_id) {
        const sent = await sendReviewNotification({
          userId: data.user_id,
          adminId: adminUser?.id || null,
          status,
          reason,
        });

        if (!sent) {
          console.warn('Pro review notification could not be inserted');
        }
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error reviewing pro request:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { reviewRequest, loading };
};

/**
 * Hook: Obtener apelaciones de baneo para revision administrativa
 */
export const useAdminBanAppeals = (status = 'pending') => {
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('ban_appeals')
        .select(`
          id,
          user_id,
          ban_type,
          ban_reason,
          appeal_text,
          status,
          admin_response,
          created_at,
          updated_at,
          user:profiles!user_id(
            id,
            username,
            nombre,
            email,
            foto_perfil
          )
        `)
        .order('created_at', { ascending: true });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error: err } = await query;

      let normalizedData = data;
      if (err) {
        let fallbackQuery = supabase
          .from('ban_appeals')
          .select('*')
          .order('created_at', { ascending: true });

        if (status && status !== 'all') {
          fallbackQuery = fallbackQuery.eq('status', status);
        }

        const { data: fallbackData, error: fallbackErr } = await fallbackQuery;
        if (fallbackErr) throw fallbackErr;

        const userIds = [...new Set((fallbackData || []).map((item) => item.user_id).filter(Boolean))];
        let profileMap = {};

        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, nombre, email, foto_perfil')
            .in('id', userIds);

          profileMap = (profiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {});
        }

        normalizedData = (fallbackData || []).map((item) => ({
          ...item,
          user: profileMap[item.user_id] || null,
        }));
      }

      setAppeals(normalizedData || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching ban appeals:', err);
      setAppeals([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppeals();
  }, [status]);

  return { appeals, loading, error, refetch: fetchAppeals };
};

/**
 * Hook: Revisar apelacion de baneo (aprobar/rechazar) y notificar
 */
export const useAdminReviewBanAppeal = () => {
  const [loading, setLoading] = useState(false);

  const sendAppealResultNotification = async ({ userId, adminId, status, reason }) => {
    const type = status === 'approved' ? 'ban_appeal_approved' : 'ban_appeal_rejected';
    const content = reason?.trim() || (status === 'approved'
      ? 'Tu apelacion ha sido aprobada.'
      : 'Tu apelacion ha sido rechazada.');

    const payloadVariants = [
      { user_id: userId, type, related_user_id: adminId, content, read: false },
      { user_id: userId, type, from_user_id: adminId, content, read: false },
      { user_id: userId, type, related_user_id: adminId, read: false },
      { user_id: userId, type, from_user_id: adminId, read: false },
      { user_id: userId, type, read: false },
    ];

    for (const payload of payloadVariants) {
      const { error } = await supabase.from('notifications').insert(payload);
      if (!error) return true;
    }

    return false;
  };

  const reviewAppeal = async ({ appealId, status, adminResponse }) => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const adminUser = authData?.user;

      const { data, error } = await supabase
        .from('ban_appeals')
        .update({
          status,
          admin_response: adminResponse?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', appealId)
        .select('id, user_id, status')
        .single();

      if (error) throw error;

      // If appeal is approved, lift active bans for this user.
      if (status === 'approved' && data?.user_id) {
        const { error: unbanErr } = await supabase
          .from('user_bans')
          .update({
            is_active: false,
            ban_expires_at: new Date().toISOString(),
          })
          .eq('user_id', data.user_id)
          .eq('is_active', true);

        if (unbanErr) {
          // Fallback in case user_bans columns differ in some environments.
          await supabase
            .from('user_bans')
            .update({ ban_expires_at: new Date().toISOString() })
            .eq('user_id', data.user_id)
            .is('ban_expires_at', null);
        }
      }

      if (data?.user_id) {
        const sent = await sendAppealResultNotification({
          userId: data.user_id,
          adminId: adminUser?.id || null,
          status,
          reason: adminResponse,
        });

        if (!sent) {
          console.warn('Appeal review notification could not be inserted');
        }
      }

      return { success: true, data };
    } catch (err) {
      console.error('Error reviewing ban appeal:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { reviewAppeal, loading };
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
        const { data: authData } = await supabase.auth.getUser();
        const currentUser = authData?.user;

        // Hard lock: this account is always admin in frontend too.
        if (currentUser?.id === SINGLE_ADMIN_ID) {
          setIsAdmin(true);
          return;
        }

        // Usar la función RPC is_current_user_admin() que verifica el usuario autenticado
        const { data, error } = await supabase
          .rpc('is_current_user_admin');

        console.log('is_current_user_admin result:', { data, error });

        if (error) {
          console.error('Error checking admin status by RPC, trying role fallback:', error);

          if (!currentUser?.id) {
            setIsAdmin(false);
            return;
          }

          const { data: profileRow, error: profileErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .maybeSingle();

          if (profileErr) {
            console.error('Fallback role admin check failed:', profileErr);
            setIsAdmin(false);
          } else {
            setIsAdmin(profileRow?.role === 'admin');
          }
        } else {
          console.log('is_current_user_admin returned:', data);
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Exception checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, []);

  return { isAdmin, loading };
};
