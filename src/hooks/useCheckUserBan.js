import { useEffect, useState } from 'react';
import { supabase } from '../lib/customSupabaseClient';

/**
 * Hook: Verificar si el usuario actual está baneado
 * Retorna: { isBanned, banType, reason, expiresAt, remainingHours, loading }
 */
export const useCheckUserBan = () => {
  const [isBanned, setIsBanned] = useState(false);
  const [banType, setBanType] = useState(null);
  const [reason, setReason] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [remainingHours, setRemainingHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkBan = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .rpc('get_current_user_ban_status');

        if (err) {
          console.error('Error checking ban status:', err);
          setError(err.message);
          setIsBanned(false);
          return;
        }

        if (data && data.length > 0) {
          const banStatus = data[0];
          console.log('Ban status check:', banStatus);
          
          setIsBanned(banStatus.is_banned || false);
          setBanType(banStatus.ban_type);
          setReason(banStatus.ban_reason);
          setExpiresAt(banStatus.ban_expires_at);
          setRemainingHours(banStatus.remaining_hours);
        }
      } catch (err) {
        console.error('Unexpected error checking ban:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Verificar al cargar
    checkBan();

    // Verificar cada 1 minuto (por si expira mientras están en la app)
    const interval = setInterval(checkBan, 60000);

    return () => clearInterval(interval);
  }, []);

  return { isBanned, banType, reason, expiresAt, remainingHours, loading, error };
};
