import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Zap, Gift, Trophy, DollarSign, Lock, CheckCircle } from 'lucide-react';
import { useLevelStatus } from '../hooks/useLevelRewards';
import { supabase } from '../lib/customSupabaseClient';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RewardsPage() {
  const levelStatus = useLevelStatus();
  const [levelRewards, setLevelRewards] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchRewards = async () => {
      try {
        const { data, error } = await supabase
          .from('level_rewards')
          .select('*')
          .order('level', { ascending: true });
        
        if (error) throw error;
        setLevelRewards(data || []);
      } catch (err) {
        console.error('Error fetching rewards:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, []);

  if (loading || levelStatus.loading) {
    return <LoadingSpinner />;
  }

  const getRewardIcon = (tier) => {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '👑',
      diamond: '💎'
    };
    return icons[tier?.toLowerCase()] || '🎁';
  };

  const isRewardUnlocked = (rewardLevel) => levelStatus.currentLevel >= rewardLevel;
  const coinsInEuros = (levelStatus.coinsAvailable / 10000).toFixed(2);

  // Calculate progress to next level
  const xpProgress = (levelStatus.xpProgress / (levelStatus.xpForNextLevel || 100)) * 100;

  return (
    <>
      <Helmet>
        <title>Recompensas - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-yellow-400" />
              Recompensas
            </h1>
            <p className="text-white/70 text-lg">Llegra a nuevos niveles y desbloquea recompensas exclusivas</p>
          </motion.div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {/* Current Level */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/50 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Nivel Actual</p>
                  <p className="text-3xl font-bold text-white mt-2">{levelStatus.currentLevel}</p>
                </div>
                <Trophy className="w-12 h-12 text-blue-400" />
              </div>
            </motion.div>

            {/* Total XP */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/50 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">XP Total</p>
                  <p className="text-3xl font-bold text-white mt-2">{levelStatus.totalXp.toLocaleString()}</p>
                </div>
                <Zap className="w-12 h-12 text-purple-400" />
              </div>
            </motion.div>

            {/* Available Balance */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/50 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">Saldo Disponible</p>
                  <p className="text-3xl font-bold text-white mt-2">€{coinsInEuros}</p>
                </div>
                <DollarSign className="w-12 h-12 text-green-400" />
              </div>
            </motion.div>

            {/* XP for Next Level */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/50 rounded-lg p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm font-medium">XP para Siguiente Nivel</p>
                  <p className="text-3xl font-bold text-white mt-2">{levelStatus.xpForNextLevel}</p>
                </div>
                <Gift className="w-12 h-12 text-orange-400" />
              </div>
            </motion.div>
          </div>

          {/* Progress Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-12"
          >
            <div className="bg-slate-800/50 border border-white/10 rounded-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold">Progreso al Siguiente Nivel</h3>
                <p className="text-white/70 text-sm">{levelStatus.xpProgress} / {levelStatus.xpForNextLevel} XP</p>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(xpProgress, 100)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                />
              </div>
            </div>
          </motion.div>

          {/* Rewards Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Recompensas Disponibles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {levelRewards.map((reward, idx) => {
                const unlocked = isRewardUnlocked(reward.level);
                return (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`relative overflow-hidden rounded-lg p-5 border transition-all ${
                      unlocked
                        ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border-emerald-500/50 hover:border-emerald-400'
                        : 'bg-slate-800/30 border-slate-700/50 opacity-60'
                    }`}
                  >
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-10 -mt-10" />
                    
                    {/* Content */}
                    <div className="relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">NIVEL</p>
                          <p className="text-3xl font-bold text-white">{reward.level}</p>
                        </div>
                        <div className="text-3xl">{getRewardIcon(reward.reward_tier)}</div>
                      </div>

                      <div className="mb-3">
                        <p className="text-2xl font-bold text-white">€{reward.euro_value?.toFixed(2)}</p>
                        <p className="text-white/60 text-xs">{reward.coins_earned?.toLocaleString()} monedas</p>
                      </div>

                      <div className="mb-3">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          reward.reward_tier === 'diamond' ? 'bg-purple-500/20 text-purple-300' :
                          reward.reward_tier === 'platinum' ? 'bg-gray-500/20 text-gray-300' :
                          reward.reward_tier === 'gold' ? 'bg-yellow-500/20 text-yellow-300' :
                          reward.reward_tier === 'silver' ? 'bg-slate-400/20 text-slate-200' :
                          'bg-amber-700/20 text-amber-300'
                        }`}>
                          {reward.reward_tier?.charAt(0).toUpperCase() + reward.reward_tier?.slice(1)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {unlocked ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <p className="text-green-400 text-sm font-medium">✓ Desbloqueado</p>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-white/40" />
                            <p className="text-white/60 text-sm">Nivel {reward.level} requerido</p>
                          </>
                        )}
                      </div>

                      {reward.reward_description && (
                        <p className="text-white/50 text-xs mt-3 italic">{reward.reward_description}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-slate-800/50 border border-white/10 rounded-lg p-8"
          >
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Cómo Ganar XP
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-white font-semibold mb-3">Acciones que te dan XP:</h4>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>📝 Crear un post: +100 XP</li>
                  <li>👥 Nuevo seguidor: +150 XP</li>
                  <li>❤️ Recibir un like: +50 XP</li>
                  <li>💬 Comentario en tu post: +25 XP</li>
                  <li>🎯 Compartir post: +75 XP</li>
                </ul>
              </div>

              <div>
                <h4 className="text-white font-semibold mb-3">Sistema de Recompensas:</h4>
                <ul className="space-y-2 text-white/70 text-sm">
                  <li>💰 1€ = 10,000 monedas</li>
                  <li>📈 100 XP = 1 Nivel</li>
                  <li>🎊 Máximo nivel: 200 (€10.00)</li>
                  <li>💳 Mínimo para retirar: €10.00</li>
                  <li>🏦 Retira a PayPal o IBAN</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-200 text-sm">
                <strong>💡 Tip:</strong> Haz que tu perfil sea interesante, publica contenido de calidad y crea conexiones. Más seguidores y engagement = Más XP = Más dinero. ¡Es tu red social gamificada!
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
