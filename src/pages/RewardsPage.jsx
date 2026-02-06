import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Trophy, Coins, Lock, CheckCircle, TrendingUp, History } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { useToast } from '../components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { useBattlePass, useBattlePassRewards, useClaimReward, useWallet, useWalletTransactions } from '../hooks/useBattlePass';

export default function RewardsPage() {
  const { toast } = useToast();
  const { battlePass, loading: bpLoading } = useBattlePass();
  const { rewards, loading: rewardsLoading } = useBattlePassRewards();
  const { claimReward } = useClaimReward();
  const { wallet, loading: walletLoading } = useWallet();
  const { transactions } = useWalletTransactions(10);

  const [claimedRewards, setClaimedRewards] = useState(new Set());
  const [activeTab, setActiveTab] = useState('battlepass');

  const isLoading = bpLoading || rewardsLoading || walletLoading;

  const handleClaimReward = async (rewards) => {
    const result = await claimReward(reward.id);
    
    if (result.success) {
      setClaimedRewards(new Set([...claimedRewards, reward.id]));
      toast({
        title: '¡Recompensa reclamada!',
        description: `+${result.coinsEarned} monedas`,
      });
    } else {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Recompensas - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-4">
              <Gift className="w-8 h-8 text-cyan-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Battle Pass
              </h1>
              <Gift className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-blue-300">
              {battlePass?.season_name || 'Temporada Actual'}
            </p>
            {battlePass?.days_remaining > 0 && (
              <p className="text-white/60 text-sm mt-2">
                {battlePass.days_remaining} días restantes
              </p>
            )}
          </motion.div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="battlepass">Battle Pass</TabsTrigger>
              <TabsTrigger value="wallet">Billetera</TabsTrigger>
              <TabsTrigger value="history">Historial</TabsTrigger>
            </TabsList>

            {/* Battle Pass Tab */}
            <TabsContent value="battlepass" className="space-y-6">
              {/* Progress Card */}
              {battlePass && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-2xl p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/60 text-sm mb-2">NIVEL ACTUAL</p>
                      <h2 className="text-5xl font-bold text-white">
                        {battlePass.current_level}
                      </h2>
                      <p className="text-purple-300 text-sm mt-1">
                        / {battlePass.max_level}
                      </p>
                    </div>
                    <Trophy className="w-16 h-16 text-yellow-400" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-white/60">Progreso</span>
                      <span className="text-cyan-400 font-semibold">
                        {battlePass.progress_percent}%
                      </span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${battlePass.progress_percent}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full"
                      />
                    </div>

                    <div className="flex justify-between text-xs text-white/50">
                      <span>{battlePass.current_xp} XP</span>
                      <span>{battlePass.xp_for_next_level} XP para nivel {battlePass.current_level + 1}</span>
                    </div>
                  </div>

                  {battlePass.completed && (
                    <div className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <p className="text-green-400 font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        ¡Battle Pass Completado!
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Rewards Grid */}
              <div>
                <h3 className="text-2xl font-bold text-white mb-6">Recompensas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {rewards.map((reward, idx) => {
                      const isUnlocked = battlePass && reward.level <= battlePass.current_level;
                      const isClaimed = reward.claimed;
                      const tierColors = {
                        'Bronze': 'from-amber-500 to-yellow-600',
                        'Silver': 'from-gray-300 to-gray-500',
                        'Gold': 'from-yellow-400 to-yellow-600',
                        'Platinum': 'from-cyan-300 to-blue-400',
                        'Diamond': 'from-pink-400 to-purple-600'
                      };

                      return (
                        <motion.div
                          key={reward.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`relative rounded-xl border-2 p-4 transition-all ${
                            isClaimed
                              ? 'bg-green-900/30 border-green-500/50'
                              : isUnlocked
                              ? `bg-gradient-to-br ${tierColors[reward.tier]} opacity-30 border-white/20 hover:opacity-50 cursor-pointer`
                              : 'bg-slate-800/50 border-slate-700 opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {/* Level Badge */}
                          <div className="absolute -top-3 left-4 bg-slate-900 px-3 py-1 rounded-full border border-white/20">
                            <span className="text-white font-bold text-sm">Nivel {reward.level}</span>
                          </div>

                          {/* Content */}
                          <div className="mt-6">
                            <div className="flex items-center gap-2 mb-3">
                              {reward.reward_type === 'coins' && <Coins className="w-5 h-5 text-yellow-400" />}
                              {reward.reward_type === 'badge' && <Trophy className="w-5 h-5 text-blue-400" />}
                              {reward.reward_type === 'avatar_frame' && <Gift className="w-5 h-5 text-pink-400" />}
                              {reward.reward_type === 'title' && <TrendingUp className="w-5 h-5 text-purple-400" />}
                              
                              <span className="text-xs font-semibold text-white/70 uppercase">
                                {reward.tier}
                              </span>
                            </div>

                            <h4 className="text-white font-bold mb-1">{reward.reward_name}</h4>
                            <p className="text-white/60 text-xs mb-4">{reward.reward_description}</p>

                            {/* Status Button */}
                            {isClaimed ? (
                              <button className="w-full py-2 px-3 bg-green-500/20 border border-green-500 rounded-lg text-green-400 font-semibold flex items-center justify-center gap-2 cursor-default">
                                <CheckCircle className="w-4 h-4" />
                                Reclamado
                              </button>
                            ) : isUnlocked ? (
                              <button
                                onClick={() => handleClaimReward(reward)}
                                className="w-full py-2 px-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-semibold transition"
                              >
                                Reclamar
                              </button>
                            ) : (
                              <button disabled className="w-full py-2 px-3 bg-slate-700 rounded-lg text-slate-400 font-semibold flex items-center justify-center gap-2 cursor-not-allowed">
                                <Lock className="w-4 h-4" />
                                Bloqueado
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            </TabsContent>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              {wallet && (
                <>
                  {/* Balance Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Current Balance */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-500/50 rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-sm mb-2">SALDO ACTUAL</p>
                          <h3 className="text-3xl font-bold text-white">
                            €{wallet.balance?.toFixed(2) || '0.00'}
                          </h3>
                        </div>
                        <Coins className="w-12 h-12 text-yellow-400" />
                      </div>
                    </motion.div>

                    {/* Total Earned */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/50 rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-sm mb-2">TOTAL GANADO</p>
                          <h3 className="text-3xl font-bold text-white">
                            €{wallet.total_earned?.toFixed(2) || '0.00'}
                          </h3>
                        </div>
                        <TrendingUp className="w-12 h-12 text-green-400" />
                      </div>
                    </motion.div>

                    {/* Total Spent */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-gradient-to-br from-red-900/50 to-pink-900/50 border border-red-500/50 rounded-2xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-sm mb-2">TOTAL GASTADO</p>
                          <h3 className="text-3xl font-bold text-white">
                            €{wallet.total_spent?.toFixed(2) || '0.00'}
                          </h3>
                        </div>
                        <Gift className="w-12 h-12 text-red-400" />
                      </div>
                    </motion.div>
                  </div>

                  {/* Info */}
                  <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                    <h4 className="text-white font-bold mb-4">ℹ️ Sobre tu Billetera</h4>
                    <ul className="space-y-3 text-white/70 text-sm">
                      <li>✅ Gana monedas desbloqueando recompensas del Battle Pass</li>
                      <li>✅ Las monedas se pueden canjear por extras en la tienda</li>
                      <li>✅ Tu saldo se sincroniza en tiempo real</li>
                      <li>✅ Todas las transacciones quedan registradas</li>
                    </ul>
                  </div>
                </>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Transacciones
              </h3>

              {transactions.length > 0 ? (
                <div className="space-y-2">
                  {transactions.map((tx, idx) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="bg-slate-800/50 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-white font-semibold capitalize">{tx.transaction_type}</p>
                        <p className="text-white/60 text-sm">{tx.description}</p>
                        <p className="text-white/40 text-xs mt-1">
                          {new Date(tx.created_at).toLocaleDateString()} a las {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={`text-2xl font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-white/10 rounded-lg p-8 text-center">
                  <History className="w-12 h-12 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">No hay transacciones aún. ¡Empieza a ganar monedas!</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
