import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

export default function BannedUserPage({ banType, reason, expiresAt, remainingHours }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showAppealForm, setShowAppealForm] = useState(false);
  const [appealText, setAppealText] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealSent, setAppealSent] = useState(false);
  const [appealError, setAppealError] = useState('');
  const [redirectingAfterApproval, setRedirectingAfterApproval] = useState(false);

  const handleLogout = async () => {
    await signOut();
  };

  // Formatear tiempo restante
  const getTimeRemaining = () => {
    if (!remainingHours) return 'permanente';
    
    if (remainingHours > 24) {
      const days = Math.ceil(remainingHours / 24);
      return `${days} día${days > 1 ? 's' : ''}`;
    }
    return `${remainingHours} hora${remainingHours > 1 ? 's' : ''}`;
  };

  // Traducir tipo de ban
  const getBanTypeLabel = () => {
    switch (banType) {
      case 'temporary_24h':
        return '24 horas';
      case 'temporary_7d':
        return '7 días';
      case 'permanent':
        return 'Permanente';
      default:
        return 'Indefinido';
    }
  };

  const submitAppeal = async () => {
    if (!user?.id || appealSubmitting || appealSent) return;

    const trimmedText = appealText.trim();
    if (trimmedText.length < 20) {
      setAppealError('La apelacion debe tener al menos 20 caracteres.');
      return;
    }

    setAppealSubmitting(true);
    setAppealError('');

    try {
      const { data, error } = await supabase.rpc('submit_ban_appeal', {
        p_appeal_text: trimmedText,
        p_ban_type: banType || null,
        p_ban_reason: reason || null
      });

      if (error) {
        const fallback = await supabase.from('ban_appeals').insert({
          user_id: user.id,
          ban_type: banType || 'unknown',
          ban_reason: reason || null,
          appeal_text: trimmedText,
          status: 'pending'
        });

        if (fallback.error) throw fallback.error;
      }

      if (data === null || data) {
        setAppealSent(true);
        setShowAppealForm(false);
        setAppealText('');
      }
    } catch (err) {
      setAppealError(err.message || 'No se pudo enviar la apelacion.');
    } finally {
      setAppealSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user?.id || redirectingAfterApproval) return;

    const checkAppealResolution = async () => {
      try {
        const { data: banData, error: banErr } = await supabase
          .rpc('get_current_user_ban_status');

        if (banErr) return;

        const isStillBanned = Array.isArray(banData) ? !!banData[0]?.is_banned : false;
        if (isStillBanned) return;

        const { data: approvedAppeal } = await supabase
          .from('ban_appeals')
          .select('admin_response, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const adminMsg = approvedAppeal?.admin_response?.trim() || 'Tu apelacion fue aprobada. Ya puedes volver a iniciar sesión.';
        setRedirectingAfterApproval(true);
        await signOut();
        navigate(`/login?appeal=approved&msg=${encodeURIComponent(adminMsg)}`, { replace: true });
      } catch (err) {
        console.error('Error checking approved appeal resolution:', err);
      }
    };

    checkAppealResolution();
    const interval = setInterval(checkAppealResolution, 15000);
    return () => clearInterval(interval);
  }, [user?.id, redirectingAfterApproval, signOut, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-red-950 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur border-2 border-red-500/50 rounded-xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <AlertTriangle className="w-16 h-16 text-red-500" />
            </motion.div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-center text-white mb-2">
            Cuenta Suspendida
          </h1>
          <p className="text-center text-red-300 mb-6">
            Tu acceso ha sido restringido por violación de las normas de comunidad
          </p>

          {/* Info Cards */}
          <div className="space-y-4 mb-6">
            {/* Ban Type */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-sm text-white/60 mb-1">Tipo de Suspensión</p>
              <p className="text-xl font-semibold text-red-400 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                {getBanTypeLabel()}
              </p>
            </div>

            {/* Time Remaining */}
            {banType !== 'permanent' && (
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
                <p className="text-sm text-white/60 mb-1">Tiempo Restante</p>
                <p className="text-xl font-semibold text-orange-400">
                  {getTimeRemaining()}
                </p>
              </div>
            )}

            {/* Reason */}
            {reason && (
              <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-white/60 mb-2">Motivo</p>
                <p className="text-white mb-0">{reason}</p>
              </div>
            )}
          </div>

          {/* Message */}
          <div className="bg-slate-800/50 border border-white/10 rounded-lg p-4 mb-6">
            <p className="text-white/80 text-sm leading-relaxed">
              {banType === 'permanent'
                ? 'Tu cuenta ha sido suspendida permanentemente. Si crees que esto es un error, contacta con el equipo de soporte.'
                : `Tu cuenta será desbloqueada automáticamente después de ${getTimeRemaining()}.`}
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-3">
            {redirectingAfterApproval && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-300 text-sm font-medium">Apelacion aprobada. Redirigiendo a inicio de sesión...</p>
              </div>
            )}

            {!appealSent && (
              <Button
                onClick={() => {
                  setShowAppealForm((prev) => !prev);
                  setAppealError('');
                }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition"
              >
                {showAppealForm ? 'Cancelar reclamacion' : 'Reclamar'}
              </Button>
            )}

            {appealSent && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                <p className="text-emerald-300 text-sm font-medium">Reclamacion enviada correctamente.</p>
                <p className="text-emerald-200/80 text-xs mt-1">Nuestro equipo revisara tu caso.</p>
              </div>
            )}

            {showAppealForm && !appealSent && (
              <div className="bg-slate-800/60 border border-white/10 rounded-lg p-4 space-y-3">
                <label className="text-white/80 text-sm block" htmlFor="appealText">
                  Explica por que deberiamos levantar la sancion
                </label>
                <textarea
                  id="appealText"
                  value={appealText}
                  onChange={(e) => setAppealText(e.target.value)}
                  placeholder="Describe el contexto de tu publicacion y por que crees que fue un error."
                  className="w-full min-h-[110px] rounded-lg bg-slate-950/60 border border-white/10 text-white p-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50"
                  maxLength={1500}
                />
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>Minimo 20 caracteres</span>
                  <span>{appealText.length}/1500</span>
                </div>
                {appealError && (
                  <p className="text-red-300 text-xs">{appealError}</p>
                )}
                <Button
                  onClick={submitAppeal}
                  disabled={appealSubmitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {appealSubmitting ? 'Enviando...' : 'Enviar reclamacion'}
                </Button>
              </div>
            )}

            <Button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Salir de la Cuenta
            </Button>

            <p className="text-center text-white/50 text-xs">
              ID: {user?.id}
            </p>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-white/40 text-sm">
          <p>Si tienes preguntas sobre esta restricción,</p>
          <p>contacta con soporte@carpes.com</p>
        </div>
      </motion.div>
    </div>
  );
}
