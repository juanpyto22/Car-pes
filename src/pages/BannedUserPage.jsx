import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, LogOut, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

export default function BannedUserPage({ banType, reason, expiresAt, remainingHours }) {
  const { user, signOut } = useAuth();

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
