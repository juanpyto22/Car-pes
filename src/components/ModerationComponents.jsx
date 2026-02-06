import React, { useEffect, useState } from 'react';
import { AlertTriangle, Clock, Ban, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente: BanWarningModal
 * Muestra advertencias cuando un usuario está baneado o tiene infracciones
 */
export const BanWarningModal = ({ 
  isOpen, 
  banInfo, 
  infractionCount,
  onClose 
}) => {
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    if (!isOpen || !banInfo || banInfo.ban_type === 'permanent') return;

    const calculateTimeRemaining = () => {
      const expires = new Date(banInfo.ban_expires_at);
      const now = new Date();
      const diff = expires - now;

      if (diff < 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) setTimeRemaining(`${days}d ${hours}h`);
      else if (hours > 0) setTimeRemaining(`${hours}h ${minutes}m`);
      else setTimeRemaining(`${minutes}m`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [isOpen, banInfo]);

  if (!isOpen || !banInfo) return null;

  const isPermanent = banInfo.ban_type === 'permanent';
  const is7Days = banInfo.ban_type === 'temporary_7d';
  const is24Hours = banInfo.ban_type === 'temporary_24h';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="bg-slate-900 border-2 border-red-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Encabezado */}
          <div className="flex items-center gap-3 mb-4">
            {isPermanent ? (
              <Ban className="w-8 h-8 text-red-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-orange-500 flex-shrink-0" />
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {isPermanent ? 'Baneo Permanente' : 'Cuenta Restringida'}
              </h2>
              <p className="text-sm text-red-400">
                {isPermanent 
                  ? 'No se puede publicar' 
                  : `${is7Days ? 'Baneado por 7 días' : 'Baneado por 24 horas'}`}
              </p>
            </div>
          </div>

          {/* Contenido */}
          <div className={`space-y-4 p-4 rounded-lg ${
            isPermanent 
              ? 'bg-red-900/20 border border-red-500/30' 
              : is7Days
              ? 'bg-orange-900/20 border border-orange-500/30'
              : 'bg-yellow-900/20 border border-yellow-500/30'
          }`}>
            {/* Razón */}
            <div>
              <p className="text-xs text-slate-400 mb-1">RAZÓN</p>
              <p className="text-white font-medium">{banInfo.reason}</p>
            </div>

            {/* Infracciones */}
            <div>
              <p className="text-xs text-slate-400 mb-1">INFRACCIONES</p>
              <p className="text-white font-medium">
                {infractionCount}/{isPermanent ? '∞' : infractionCount === 2 ? '3 (máximo)' : '3'}
              </p>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded ${
                      i <= infractionCount 
                        ? 'bg-red-500' 
                        : 'bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Tiempo restante */}
            {!isPermanent && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <p className="text-sm text-white">
                  <span className="font-bold">{timeRemaining}</span> restantes
                </p>
              </div>
            )}

            {/* Advertencia para siguiente ban */}
            {is24Hours && (
              <div className="bg-red-900/40 border border-red-500/50 rounded p-3">
                <p className="text-sm text-red-300">
                  ⚠️ Esta es tu <strong>1ª infracción</strong>. Una 2ª resultará en baneo de <strong>7 días</strong>.
                </p>
              </div>
            )}

            {is7Days && (
              <div className="bg-red-900/40 border border-red-500/50 rounded p-3">
                <p className="text-sm text-red-300">
                  🚨 Esta es tu <strong>2ª infracción</strong>. Una 3ª resultará en <strong>baneo permanente</strong>.
                </p>
              </div>
            )}

            {isPermanent && (
              <div className="bg-red-900/40 border border-red-500/50 rounded p-3">
                <p className="text-sm text-red-300">
                  🔴 Has alcanzado el límite de infracciones. <strong>No puedes publicar</strong> en esta plataforma.
                </p>
              </div>
            )}
          </div>

          {/* Información adicional */}
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
            <p className="text-xs text-blue-300">
              <Shield className="w-3 h-3 inline mr-2" />
              <strong>Política de Comunidad:</strong> Solo se permiten fotos de peces capturados. Imágenes de otra naturaleza violan nuestra política.
            </p>
          </div>

          {/* Botón */}
          <button
            onClick={onClose}
            className="w-full mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-white transition"
          >
            Entendido
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Componente: ImageAnalysisWarning
 * Muestra advertencia cuando la imagen no contiene un pez
 */
export const ImageAnalysisWarning = ({
  isOpen,
  onClose,
  onRetry,
  onIgnore
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-slate-900 border-2 border-yellow-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Encabezado */}
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-xl font-bold text-white">
                  Imagen No Válida
                </h2>
                <p className="text-sm text-yellow-400">
                  No se detectó un pez en la imagen
                </p>
              </div>
            </div>

            {/* Contenido */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-white mb-3">
                Nuestra IA no detectó un pez en la imagen que compartiste.
              </p>
              <p className="text-sm text-yellow-200 mb-3">
                Ten en cuenta que:
              </p>
              <ul className="text-sm text-yellow-100 space-y-2 ml-4">
                <li>✓ Debe haber un <strong>pez claramente visible</strong></li>
                <li>✓ Puede haber <strong>personas</strong> con el pez (pescador)</li>
                <li>✗ No se permite <strong>solo personas</strong> sin pez</li>
                <li>✗ No se permiten <strong>fotos genéricas</strong></li>
              </ul>
            </div>

            {/* Advertencia */}
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-300">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Si ignoras esta advertencia, recibirás una <strong>infracción</strong> y serás <strong>baneado automáticamente</strong>.
              </p>
            </div>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={onRetry}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white font-medium transition"
              >
                Cambiar Foto
              </button>
              <button
                onClick={onIgnore}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition"
              >
                Continuar Igual
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Componente: ViolationNotice
 * Banner para mostrar infracciones del usuario
 */
export const ViolationNotice = ({ 
  infractionCount,
  totalInfractions,
  onDismiss 
}) => {
  if (totalInfractions === 0) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4 mb-4"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-orange-300 mb-1">Advertencia de Infracciones</h3>
          <p className="text-sm text-orange-200 mb-2">
            Tienes <strong>{totalInfractions}</strong> infracción{totalInfractions > 1 ? 'es' : ''}.
          </p>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full ${
                  i <= infractionCount 
                    ? 'bg-orange-500' 
                    : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-orange-300 mt-2">
            {infractionCount === 1 && '1ª infracción → próxima: ban 24h'}
            {infractionCount === 2 && '2ª infracción → próxima: ban 7d'}
            {infractionCount >= 3 && 'Máximo de infracciones alcanzado'}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-orange-400 hover:text-orange-300 flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
};
