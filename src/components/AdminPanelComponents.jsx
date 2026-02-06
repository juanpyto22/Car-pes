import React from 'react';
import { Users, AlertTriangle, Ban, TrendingUp, Trash2, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Componente: Tarjeta de Estadísticas
 */
export const StatCard = ({ icon: Icon, label, value, color = 'cyan' }) => {
  const colorClasses = {
    cyan: 'bg-cyan-900/20 border-cyan-500/30 text-cyan-300',
    red: 'bg-red-900/20 border-red-500/30 text-red-300',
    orange: 'bg-orange-900/20 border-orange-500/30 text-orange-300',
    purple: 'bg-purple-900/20 border-purple-500/30 text-purple-300'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-6 ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-4">
        <Icon className="w-8 h-8 flex-shrink-0" />
        <div>
          <p className="text-sm text-white/60 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Componente: Fila de Infracción
 */
export const InfractionRow = ({ infraction, onDelete }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-slate-800/30 border border-white/5 rounded-lg hover:bg-slate-800/50 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <p className="font-semibold text-white truncate">@{infraction.username}</p>
          <span className="text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
            {infraction.violation_type}
          </span>
        </div>
        <p className="text-sm text-white/60 mb-1">{infraction.email}</p>
        <p className="text-xs text-white/50">
          {infraction.violation_details}
        </p>
        {infraction.detected_objects?.length > 0 && (
          <p className="text-xs text-cyan-300 mt-1">
            Detectados: {infraction.detected_objects.join(', ')}
          </p>
        )}
        <p className="text-xs text-white/40 mt-1">
          {new Date(infraction.created_at).toLocaleString()}
        </p>
      </div>

      <button
        onClick={() => onDelete(infraction.id)}
        className="p-2 text-white/60 hover:text-red-400 hover:bg-red-900/20 rounded transition flex-shrink-0"
        title="Eliminar infracción"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

/**
 * Componente: Fila de Ban
 */
export const BanRow = ({ ban, onLift }) => {
  const getBanColor = (banType) => {
    if (banType === 'permanent') return 'from-red-900/20 to-red-900/5 border-red-500/30';
    if (banType === 'temporary_7d') return 'from-orange-900/20 to-orange-900/5 border-orange-500/30';
    return 'from-yellow-900/20 to-yellow-900/5 border-yellow-500/30';
  };

  const getBanLabel = (banType) => {
    if (banType === 'permanent') return '🔴 Permanente';
    if (banType === 'temporary_7d') return '🟠 7 Días';
    return '🟡 24 Horas';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`bg-gradient-to-r ${getBanColor(ban.ban_type)} border p-4 rounded-lg`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <Ban className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="font-semibold text-white">@{ban.username}</p>
            <span className="text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">
              {getBanLabel(ban.ban_type)}
            </span>
          </div>

          <p className="text-sm text-white/60 mb-2">{ban.email}</p>
          <p className="text-sm text-white/80 mb-2">
            <strong>Razón:</strong> {ban.reason}
          </p>

          <div className="grid grid-cols-3 gap-4 text-xs text-white/60">
            <div>
              <p className="text-white/40">Infracciones</p>
              <p className="text-white font-semibold">{ban.infraction_count}</p>
            </div>
            <div>
              <p className="text-white/40">Ban Iniciado</p>
              <p className="text-white text-xs">
                {new Date(ban.ban_started_at).toLocaleDateString()}
              </p>
            </div>
            {ban.ban_type !== 'permanent' && (
              <div>
                <p className="text-white/40">Tiempo Restante</p>
                <p className="text-white font-semibold text-yellow-300">
                  {ban.time_remaining_text}
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => onLift(ban.id)}
          className="p-2 text-white/60 hover:text-green-400 hover:bg-green-900/20 rounded transition flex-shrink-0"
          title="Levantar ban"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Componente: Filtro de Tabla
 */
export const AdminTableFilters = ({ search, setSearch, filterType, setFilterType }) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 p-4 bg-slate-800/30 rounded-lg border border-white/10 mb-4">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Buscar usuario, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-slate-700 border border-white/10 rounded text-white placeholder-white/40 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className="px-4 py-2 bg-slate-700 border border-white/10 rounded text-white focus:outline-none focus:border-cyan-500"
      >
        <option value="all">Todos</option>
        <option value="24h">24 Horas</option>
        <option value="7d">7 Días</option>
        <option value="permanent">Permanentes</option>
      </select>
    </div>
  );
};

/**
 * Componente: Modal de Ban Manual
 */
export const ManualBanModal = ({ isOpen, onClose, userId, username, onBan, loading }) => {
  const [banType, setBanType] = React.useState('temporary_24h');
  const [reason, setReason] = React.useState('');

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    await onBan(userId, banType, reason);
    setReason('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-slate-900 border border-red-500/50 rounded-2xl max-w-md w-full p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">
          Banear a @{username}
        </h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-blue-300 mb-2">Tipo de Ban</label>
            <select
              value={banType}
              onChange={(e) => setBanType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded text-white"
            >
              <option value="temporary_24h">24 Horas 🟡</option>
              <option value="temporary_7d">7 Días 🟠</option>
              <option value="permanent">Permanente 🔴</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-blue-300 mb-2">Razón</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo del ban..."
              rows="3"
              className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded text-white placeholder-white/40"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded text-white font-medium transition"
          >
            {loading ? 'Baneando...' : 'Banear'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

/**
 * Componente: Tarjeta vacía
 */
export const EmptyState = ({ icon: Icon, title, description }) => {
  return (
    <div className="text-center py-12 px-4">
      <Icon className="w-12 h-12 text-white/20 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-white/60">{description}</p>
    </div>
  );
};
