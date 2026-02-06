import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, Award, Crown, Zap, Fish, Camera, Users, Lock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserStats, useLeaderboard, useChallenges } from '@/hooks/useAchievements';
import { useAchievementsLibrary, useUserUnlockedAchievements, getAchievementGradient } from '@/hooks/useAchievementsLibrary';

const AchievementsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const { stats: userStats, loading: statsLoading } = useUserStats(user?.id);
  const { achievements: achievementsLibrary, loading: libraryLoading } = useAchievementsLibrary();
  const { unlockedIds, loading: unlockedLoading } = useUserUnlockedAchievements(user?.id);
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard();
  const { challenges, loading: challengesLoading } = useChallenges();

  const [selectedBadge, setSelectedBadge] = useState(null);

  const calculateLevel = (xp) => {
    return Math.floor(1 + Math.sqrt(xp / 100));
  };

  const getXPForNextLevel = (currentLevel) => {
    return Math.pow(currentLevel, 2) * 100;
  };

  const getProgressToNextLevel = () => {
    const currentLevel = userStats?.current_level || 1;
    const currentXP = userStats?.total_xp || 0;
    const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
    const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const xpProgress = currentXP - xpForCurrentLevel;
    
    return Math.max(0, Math.min(100, (xpProgress / xpNeeded) * 100));
  };

  const AchievementBadge = ({ achievement, unlocked, onClick }) => {
    if (!achievement) return null;

    const gradient = getAchievementGradient(achievement.tier);

    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onClick && onClick(achievement)}
        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
          unlocked 
            ? `bg-gradient-to-br ${gradient} border-white/20 shadow-lg`
            : 'bg-slate-800/50 border-slate-700 grayscale opacity-60'
        }`}
      >
        {/* Badge Icon / Emoji */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl ${
          unlocked ? 'bg-white/20' : 'bg-slate-700'
        }`}>
          {achievement.icon || getTierEmoji(achievement.tier)}
        </div>

        {/* Badge Info */}
        <div className="text-center">
          <h3 className={`font-bold text-sm mb-1 ${unlocked ? 'text-white' : 'text-slate-400'}`}>
            {achievement.name}
          </h3>
          <p className={`text-xs leading-tight ${unlocked ? 'text-white/80' : 'text-slate-500'}`}>
            {achievement.description}
          </p>
          
          <div className={`mt-2 text-xs font-medium ${unlocked ? 'text-white/80' : 'text-slate-400'}`}>
            +{achievement.xp_reward} XP
          </div>
        </div>

        {unlocked && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle className="w-3 h-3 text-white fill-current" />
          </div>
        )}

        {!unlocked && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
            <Lock className="w-3 h-3 text-slate-400" />
          </div>
        )}
      </motion.div>
    );
  };

  const getTierEmoji = (tier) => {
    const emojis = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '👑',
      diamond: '💎'
    };
    return emojis[tier] || '🏆';
  };

  const LeaderboardItem = ({ user, rank, stats }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.1 }}
      className={`flex items-center gap-4 p-4 rounded-xl ${
        rank <= 3 
          ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30' 
          : 'bg-slate-800/50 border border-white/5'
      }`}
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
        rank === 1 ? 'bg-yellow-500 text-black' :
        rank === 2 ? 'bg-gray-300 text-black' :
        rank === 3 ? 'bg-orange-600 text-white' :
        'bg-slate-700 text-white'
      }`}>
        {rank <= 3 ? <Crown className="w-4 h-4" /> : rank}
      </div>

      {/* User Info */}
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.foto_perfil} />
        <AvatarFallback>{user.username?.[0]}</AvatarFallback>
      </Avatar>

      <div className="flex-1">
        <p className="text-white font-medium">{user.username}</p>
        <p className="text-blue-400 text-sm">Nivel {stats.level}</p>
      </div>

      {/* XP */}
      <div className="text-right">
        <p className="text-cyan-400 font-bold">{stats.xp.toLocaleString()} XP</p>
        <p className="text-slate-400 text-xs">{stats.total_catches} capturas</p>
      </div>
    </motion.div>
  );

  const ChallengeCard = ({ challenge }) => (
    <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">{challenge.title}</h3>
        <div className="px-3 py-1 bg-purple-500 rounded-full">
          <span className="text-white text-sm font-medium">{challenge.reward_xp} XP</span>
        </div>
      </div>
      
      <p className="text-purple-200 mb-4">{challenge.description}</p>
      
      <div className="flex items-center justify-between text-sm">
        <span className="text-purple-300">
          Termina: {new Date(challenge.end_date).toLocaleDateString()}
        </span>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-500">
          Participar
        </Button>
      </div>
    </div>
  );
  
  const isLoading = statsLoading || libraryLoading || unlockedLoading;

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
        <title>Logros - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Header with User Level */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-cyan-500">
                <AvatarImage src={profile?.foto_perfil} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-2xl">
                  {profile?.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full">
                <span className="text-white font-bold text-sm">Nivel {userStats?.current_level || 1}</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {(userStats?.total_xp || 0).toLocaleString()} XP
            </h1>
            <div className="w-64 mx-auto bg-slate-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressToNextLevel()}%` }}
              />
            </div>
            <p className="text-blue-300">
              {(getXPForNextLevel(userStats?.current_level || 1) - (userStats?.total_xp || 0)).toLocaleString()} XP para el siguiente nivel
            </p>
          </motion.div>

          {/* Tabs */}
          <Tabs defaultValue="achievements" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="achievements">Logros</TabsTrigger>
              <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
              <TabsTrigger value="challenges">Desafíos</TabsTrigger>
            </TabsList>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Tus Logros ({achievementsLibrary.length})</h2>
                
                {libraryLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
                  </div>
                ) : achievementsLibrary.length === 0 ? (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/10">
                    <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No hay logros disponibles</h3>
                    <p className="text-blue-400">¡Intenta más tarde!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {achievementsLibrary.map((achievement) => {
                      const unlocked = unlockedIds.includes(achievement.achievement_id);
                      
                      return (
                        <AchievementBadge
                          key={achievement.achievement_id}
                          achievement={achievement}
                          unlocked={unlocked}
                          onClick={setSelectedBadge}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Estadísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{userStats?.total_catches || 0}</p>
                    <p className="text-blue-300 text-sm">Capturas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{userStats?.total_posts || 0}</p>
                    <p className="text-blue-300 text-sm">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{userStats?.spots_visited || 0}</p>
                    <p className="text-blue-300 text-sm">Spots</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-400">{userStats?.current_streak || 0}</p>
                    <p className="text-blue-300 text-sm">Racha</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Ranking Global</h2>
                {leaderboard.map((entry, index) => (
                  <LeaderboardItem
                    key={entry.user.id}
                    user={entry.user}
                    rank={index + 1}
                    stats={entry}
                  />
                ))}
              </div>
            </TabsContent>

            {/* Challenges Tab */}
            <TabsContent value="challenges" className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Desafíos Activos</h2>
                {challenges.length > 0 ? (
                  <div className="grid gap-4">
                    {challenges.map(challenge => (
                      <ChallengeCard key={challenge.id} challenge={challenge} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-white/10">
                    <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No hay desafíos activos</h3>
                    <p className="text-blue-400">¡Mantente atento para nuevos retos!</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedBadge(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAchievementGradient(selectedBadge.tier)} flex items-center justify-center mx-auto mb-4 text-4xl`}>
                  {getTierEmoji(selectedBadge.tier)}
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{selectedBadge.name}</h3>
                <p className="text-blue-300 mb-4">{selectedBadge.description}</p>
                
                <div className="mb-4 space-y-2 text-sm">
                  <p className="text-cyan-400 font-bold">+{selectedBadge.xp_reward} XP</p>
                  <p className="text-slate-400 capitalize">Tipo: {selectedBadge.condition_type}</p>
                  {selectedBadge.condition_value && (
                    <p className="text-slate-400">Meta: {selectedBadge.condition_value}</p>
                  )}
                  <p className="text-purple-400 font-medium capitalize">{selectedBadge.tier}</p>
                </div>

                <Button 
                  onClick={() => setSelectedBadge(null)}
                  className="mt-6 w-full"
                >
                  Cerrar
                </Button>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </>
  );
};

export default AchievementsPage;