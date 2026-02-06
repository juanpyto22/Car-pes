import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Hook: Verificar si un usuario está baneado
 */
export const useCheckUserBan = (userId) => {
  const [banInfo, setBanInfo] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkBan = async () => {
      try {
        const { data, error } = await supabase
          .rpc('check_user_ban', { user_id: userId });

        if (error) throw error;

        if (data && data.length > 0) {
          const [result] = data;
          setIsBanned(result.is_banned);
          if (result.is_banned) {
            setBanInfo(result.ban_info);
          }
        }
      } catch (error) {
        console.error('Error checking ban:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBan();

    // Verificar cada minuto si el ban ha expirado
    const interval = setInterval(checkBan, 60000);

    return () => clearInterval(interval);
  }, [userId]);

  return { isBanned, banInfo, loading };
};

/**
 * Hook: Crear infracción y manejar baneos automáticos
 */
export const useCreateInfraction = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createInfraction = async (
    userId,
    violationType,
    violationDetails,
    imageUrl,
    detectedObjects = [],
    confidence = 0
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('create_user_infraction', {
          p_user_id: userId,
          p_violation_type: violationType,
          p_violation_details: violationDetails,
          p_image_url: imageUrl,
          p_detected_objects: detectedObjects,
          p_confidence: confidence
        });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const result = data[0];
        return {
          success: true,
          infractionId: result.infraction_id,
          infractionCount: result.infraction_count,
          newBan: result.new_ban,
          banType: result.ban_type
        };
      }
    } catch (err) {
      console.error('Error creating infraction:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message
      };
    } finally {
      setLoading(false);
    }
  };

  return { createInfraction, loading, error };
};

/**
 * Hook: Obtener resumen de violaciones del usuario
 */
export const useUserViolationSummary = (userId) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        const { data, error } = await supabase
          .rpc('get_user_violation_summary', { user_id: userId });

        if (error) throw error;

        if (data && data.length > 0) {
          setSummary(data[0]);
        }
      } catch (error) {
        console.error('Error fetching violation summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [userId]);

  return { summary, loading };
};

/**
 * Hook: Limpiar bans expirados (ejecutar periódicamente)
 */
export const useCleanupExpiredBans = () => {
  const [loading, setLoading] = useState(false);

  const cleanup = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_bans');

      if (error) throw error;
      
      return { cleaned: data, success: true };
    } catch (error) {
      console.error('Error cleaning up expired bans:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { cleanup, loading };
};

/**
 * Función utilitaria: Obtener mensaje de ban para usuario
 */
export const getBanMessage = (banInfo) => {
  if (!banInfo) return '';

  const banType = banInfo.ban_type;
  const reason = banInfo.reason;
  const expiresAt = banInfo.ban_expires_at ? new Date(banInfo.ban_expires_at) : null;
  const infractions = banInfo.infraction_count;

  let message = '';

  if (banType === 'permanent') {
    message = `🔴 BANEO PERMANENTE\n\nHas sido baneado permanentemente por violar la política de la communidad (${infractions} infracciones).\n\nRazón: ${reason}`;
  } else if (banType === 'temporary_7d') {
    const horasRestantes = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60)) : 0;
    message = `🟠 BANEO TEMPORAL (7 DÍAS)\n\nBaneado por 7 días (${horasRestantes} horas restantes).\n\nRazón: ${reason}\n\nEsta es tu 2ª infracción. Una 3ª infracción resultará en baneo permanente.`;
  } else if (banType === 'temporary_24h') {
    const minRestantes = expiresAt ? Math.ceil((expiresAt - new Date()) / (1000 * 60)) : 0;
    message = `🟡 BANEO TEMPORAL (24 HORAS)\n\nBaneado por 24 horas (${minRestantes} minutos restantes).\n\nRazón: ${reason}\n\nEsta es tu 1ª infracción. Dos infracciones más resultarán en baneo de 7 días.`;
  }

  return message;
};

/**
 * Función utilitaria: Formatear tiempo de ban restante
 */
export const formatBanTimeRemaining = (expiresAt) => {
  if (!expiresAt) return 'Permanente';

  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;

  if (diff < 0) return 'Expirado';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
