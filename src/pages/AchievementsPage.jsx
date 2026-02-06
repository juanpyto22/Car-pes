import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, Target, Award, Crown, Zap, Fish, Camera, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AchievementsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [achievements, setAchievements] = useState([]);
  const [userStats, setUserStats] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState(null);

  // Achievement definitions
  const achievementTypes = {
    first_catch: {
      icon: Fish,
      name: 'Primera Captura',
      description: 'Compartiste tu primera captura',
      color: 'from-green-500 to-emerald-600',
      xp: 100
    },
    social_butterfly: {
      icon: Users,
      name: 'Mariposa Social',
      description: 'Sigue a 10 pescadores',
      color: 'from-pink-500 to-rose-600',
      xp: 150
    },
    photographer: {
      icon: Camera,
      name: 'Fotógrafo',
      description: 'Sube 25 fotos de capturas',
      color: 'from-purple-500 to-violet-600',
      xp: 200
    },
    big_catch: {
      icon: Trophy,
      name: 'Gran Captura',
      description: 'Captura un pez de más de 5kg',
      color: 'from-yellow-500 to-orange-600',
      xp: 300
    },
    explorer: {
      icon: Target,
      name: 'Explorador',
      description: 'Visita 5 spots diferentes',
      color: 'from-blue-500 to-cyan-600',
      xp: 250
    },
    influencer: {
      icon: Crown,
      name: 'Influencer',
      description: 'Consigue 100 seguidores',
      color: 'from-amber-500 to-yellow-600',
      xp: 500
    },
    streak_master: {
      icon: Zap,
      name: 'Racha Master',
      description: 'Pesca 7 días seguidos',
      color: 'from-red-500 to-pink-600',
      xp: 400
    },
    legend: {
      icon: Medal,
      name: 'Leyenda',
      description: 'Alcanza nivel 50',
      color: 'from-indigo-500 to-purple-600',
      xp: 1000
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchLeaderboard();
    fetchChallenges();
  }, [user]);

  const fetchUserData = async () => {
    if (!user?.id) return;

    try {
      // Fetch user achievements
      const { data: userAchievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id);

      if (achievementsError) throw achievementsError;

      // Fetch user statistics
      const { data: statsData, error: statsError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      // If no stats exist, create them
      if (!statsData) {
        const newStats = {
          user_id: user.id,
          level: 1,
          xp: 0,
          total_catches: 0,
          total_posts: 0,
          spots_visited: 0,
          days_active: 0,
          current_streak: 0,
          longest_streak: 0
        };

        const { data: createdStats } = await supabase
          .from('user_stats')
          .insert(newStats)
          .select()
          .single();

        setUserStats(createdStats || newStats);
      } else {
        setUserStats(statsData);
      }

      setAchievements(userAchievements || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select(`
          *,
          user:profiles(id, username, foto_perfil)
        `)
        .order('xp', { ascending: false })
        .limit(10);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('*')
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching challenges:', error);
    }
  };

  const calculateLevel = (xp) => {
    return Math.floor(1 + Math.sqrt(xp / 100));
  };

  const getXPForNextLevel = (currentLevel) => {
    return Math.pow(currentLevel, 2) * 100;
  };

  const getProgressToNextLevel = () => {
    const currentLevel = userStats.level || 1;
    const currentXP = userStats.xp || 0;
    const xpForCurrentLevel = Math.pow(currentLevel - 1, 2) * 100;
    const xpForNextLevel = Math.pow(currentLevel, 2) * 100;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const xpProgress = currentXP - xpForCurrentLevel;
    
    return Math.max(0, Math.min(100, (xpProgress / xpNeeded) * 100));
  };

  const AchievementBadge = ({ type, unlocked, progress = 0, onClick }) => {
    const achievement = achievementTypes[type];
    if (!achievement) return null;

    const IconComponent = achievement.icon;

    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onClick && onClick(achievement)}
        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${
          unlocked 
            ? `bg-gradient-to-br ${achievement.color} border-white/20 shadow-lg`
            : 'bg-slate-800/50 border-slate-700 grayscale opacity-60'
        }`}
      >
        {/* Badge Icon */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
          unlocked ? 'bg-white/20' : 'bg-slate-700'
        }`}>
          <IconComponent className={`w-6 h-6 ${unlocked ? 'text-white' : 'text-slate-400'}`} />
        </div>

        {/* Badge Info */}
        <div className="text-center">
          <h3 className={`font-bold text-sm mb-1 ${unlocked ? 'text-white' : 'text-slate-400'}`}>
            {achievement.name}
          </h3>
          <p className={`text-xs leading-tight ${unlocked ? 'text-white/80' : 'text-slate-500'}`}>
            {achievement.description}
          </p>
          
          {!unlocked && progress > 0 && (
            <div className="mt-2">
              <div className="w-full bg-slate-700 rounded-full h-1">
                <div 
                  className="bg-cyan-500 h-1 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-slate-400">{progress.toFixed(0)}%</span>
            </div>
          )}
        </div>

        {unlocked && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <Star className="w-3 h-3 text-white fill-current" />
          </div>
        )}
      </motion.div>
    );
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

  if (loading) {
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
                <span className="text-white font-bold text-sm">Nivel {userStats.level || 1}</span>
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {(userStats.xp || 0).toLocaleString()} XP
            </h1>
            <div className="w-64 mx-auto bg-slate-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getProgressToNextLevel()}%` }}
              />
            </div>
            <p className="text-blue-300">
              {(getXPForNextLevel(userStats.level || 1) - (userStats.xp || 0)).toLocaleString()} XP para el siguiente nivel
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
                <h2 className="text-2xl font-bold text-white mb-6">Tus Logros</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.keys(achievementTypes).map(type => {
                    const unlocked = achievements.some(a => a.achievement_type === type);
                    
                    return (
                      <AchievementBadge
                        key={type}
                        type={type}
                        unlocked={unlocked}
                        onClick={setSelectedBadge}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Estadísticas</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{userStats.total_catches || 0}</p>
                    <p className="text-blue-300 text-sm">Capturas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-400">{userStats.total_posts || 0}</p>
                    <p className="text-blue-300 text-sm">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{userStats.spots_visited || 0}</p>
                    <p className="text-blue-300 text-sm">Spots</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-400">{userStats.current_streak || 0}</p>
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
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${selectedBadge.color} flex items-center justify-center mx-auto mb-4`}>
                  <selectedBadge.icon className="w-10 h-10 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">{selectedBadge.name}</h3>
                <p className="text-blue-300 mb-4">{selectedBadge.description}</p>
                <p className="text-cyan-400 font-bold">+{selectedBadge.xp} XP</p>

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