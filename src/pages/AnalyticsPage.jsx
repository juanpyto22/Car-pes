import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Heart, MessageCircle, Eye, Users, Fish, Calendar, Award, ArrowUp, ArrowDown, Minus, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { format, subDays, startOfDay, differenceInDays, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';

const AnalyticsPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalLikes: 0,
    totalComments: 0,
    totalFollowers: 0,
    totalFollowing: 0,
    postsThisWeek: 0,
    likesThisWeek: 0,
    followersThisWeek: 0,
    recentPosts: [],
    topPosts: [],
    dailyActivity: [],
    weeklyComparison: { posts: 0, likes: 0, followers: 0 },
  });
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    if (user) fetchAnalytics();
  }, [user, period]);

  const getPeriodDays = () => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      default: return 7;
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = getPeriodDays();
      const periodStart = subDays(new Date(), days).toISOString();
      const prevPeriodStart = subDays(new Date(), days * 2).toISOString();

      // Fetch posts
      const [postsRes, likesRes, commentsRes, followersRes, followingRes] = await Promise.allSettled([
        supabase.from('posts').select('id, created_at, imagen_url, contenido').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('likes').select('id, created_at, post_id').eq('post_id', null), // placeholder - we'll count per-post below
        supabase.from('comments').select('id, created_at, post_id').eq('post_id', null), // placeholder
        supabase.from('follows').select('id, created_at').eq('followed_id', user.id),
        supabase.from('follows').select('id, created_at').eq('follower_id', user.id),
      ]);

      const allPosts = postsRes.status === 'fulfilled' && postsRes.value.data ? postsRes.value.data : [];
      const followers = followersRes.status === 'fulfilled' && followersRes.value.data ? followersRes.value.data : [];
      const following = followingRes.status === 'fulfilled' && followingRes.value.data ? followingRes.value.data : [];

      // Get likes and comments for user's posts
      const postIds = allPosts.map(p => p.id);
      let allLikes = [];
      let allComments = [];

      if (postIds.length > 0) {
        const [likesData, commentsData] = await Promise.allSettled([
          supabase.from('likes').select('id, created_at, post_id').in('post_id', postIds),
          supabase.from('comments').select('id, created_at, post_id').in('post_id', postIds),
        ]);
        if (likesData.status === 'fulfilled' && likesData.value.data) allLikes = likesData.value.data;
        if (commentsData.status === 'fulfilled' && commentsData.value.data) allComments = commentsData.value.data;
      }

      // Period calculations
      const postsInPeriod = allPosts.filter(p => new Date(p.created_at) >= new Date(periodStart));
      const postsInPrevPeriod = allPosts.filter(p => new Date(p.created_at) >= new Date(prevPeriodStart) && new Date(p.created_at) < new Date(periodStart));
      const likesInPeriod = allLikes.filter(l => new Date(l.created_at) >= new Date(periodStart));
      const likesInPrevPeriod = allLikes.filter(l => new Date(l.created_at) >= new Date(prevPeriodStart) && new Date(l.created_at) < new Date(periodStart));
      const followersInPeriod = followers.filter(f => new Date(f.created_at) >= new Date(periodStart));
      const followersInPrevPeriod = followers.filter(f => new Date(f.created_at) >= new Date(prevPeriodStart) && new Date(f.created_at) < new Date(periodStart));

      // Top posts (most liked)
      const postLikeCounts = {};
      const postCommentCounts = {};
      allLikes.forEach(l => { postLikeCounts[l.post_id] = (postLikeCounts[l.post_id] || 0) + 1; });
      allComments.forEach(c => { postCommentCounts[c.post_id] = (postCommentCounts[c.post_id] || 0) + 1; });

      const topPosts = allPosts
        .map(p => ({ ...p, likeCount: postLikeCounts[p.id] || 0, commentCount: postCommentCounts[p.id] || 0 }))
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 5);

      // Daily activity chart data
      const dayRange = eachDayOfInterval({
        start: subDays(new Date(), days - 1),
        end: new Date(),
      });

      const dailyActivity = dayRange.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayPosts = allPosts.filter(p => format(new Date(p.created_at), 'yyyy-MM-dd') === dayStr).length;
        const dayLikes = allLikes.filter(l => format(new Date(l.created_at), 'yyyy-MM-dd') === dayStr).length;
        return { date: day, posts: dayPosts, likes: dayLikes, label: format(day, 'd MMM', { locale: es }) };
      });

      setStats({
        totalPosts: allPosts.length,
        totalLikes: allLikes.length,
        totalComments: allComments.length,
        totalFollowers: followers.length,
        totalFollowing: following.length,
        postsThisWeek: postsInPeriod.length,
        likesThisWeek: likesInPeriod.length,
        followersThisWeek: followersInPeriod.length,
        recentPosts: allPosts.slice(0, 5),
        topPosts,
        dailyActivity,
        weeklyComparison: {
          posts: postsInPrevPeriod.length > 0 ? ((postsInPeriod.length - postsInPrevPeriod.length) / postsInPrevPeriod.length * 100) : postsInPeriod.length > 0 ? 100 : 0,
          likes: likesInPrevPeriod.length > 0 ? ((likesInPeriod.length - likesInPrevPeriod.length) / likesInPrevPeriod.length * 100) : likesInPeriod.length > 0 ? 100 : 0,
          followers: followersInPrevPeriod.length > 0 ? ((followersInPeriod.length - followersInPrevPeriod.length) / followersInPrevPeriod.length * 100) : followersInPeriod.length > 0 ? 100 : 0,
        },
      });
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  const avgLikesPerPost = stats.totalPosts > 0 ? (stats.totalLikes / stats.totalPosts).toFixed(1) : '0';
  const maxDailyLikes = Math.max(...stats.dailyActivity.map(d => d.likes), 1);
  const maxDailyPosts = Math.max(...stats.dailyActivity.map(d => d.posts), 1);

  return (
    <>
      <Helmet><title>Estadísticas - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-24">
        <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Estadísticas</h1>
              <p className="text-blue-400 text-sm">Tu actividad y rendimiento en Car-Pes</p>
            </div>
            <div className="flex bg-slate-900/50 border border-white/10 rounded-xl p-1">
              {[{ id: '7d', label: '7D' }, { id: '30d', label: '30D' }, { id: '90d', label: '90D' }].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    period === p.id ? 'bg-cyan-600 text-white' : 'text-blue-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
            <StatCard
              icon={BarChart3} label="Publicaciones"
              value={stats.totalPosts}
              periodValue={stats.postsThisWeek}
              change={stats.weeklyComparison.posts}
              color="cyan" delay={0}
            />
            <StatCard
              icon={Heart} label="Likes recibidos"
              value={stats.totalLikes}
              periodValue={stats.likesThisWeek}
              change={stats.weeklyComparison.likes}
              color="red" delay={0.05}
            />
            <StatCard
              icon={Users} label="Seguidores"
              value={stats.totalFollowers}
              periodValue={stats.followersThisWeek}
              change={stats.weeklyComparison.followers}
              color="blue" delay={0.1}
            />
            <StatCard
              icon={MessageCircle} label="Comentarios"
              value={stats.totalComments}
              periodValue={null}
              change={null}
              color="purple" delay={0.15}
            />
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-cyan-400">{avgLikesPerPost}</p>
              <p className="text-xs text-blue-400 mt-1">Media likes/post</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-blue-400">{stats.totalFollowing}</p>
              <p className="text-xs text-blue-400 mt-1">Siguiendo</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-center"
            >
              <p className="text-2xl font-bold text-purple-400">
                {stats.totalFollowers > 0 ? (stats.totalLikes / stats.totalFollowers).toFixed(1) : '0'}
              </p>
              <p className="text-xs text-blue-400 mt-1">Engagement rate</p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Activity Chart */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500" /> Actividad
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500" /> Posts</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" /> Likes</span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-40 flex items-end gap-1">
                {stats.dailyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                      {day.label}: {day.posts}p, {day.likes}❤️
                    </div>
                    {/* Likes bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.likes / maxDailyLikes) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.02 }}
                      className="w-full bg-red-400/30 rounded-t-sm min-h-[2px]"
                    />
                    {/* Posts bar */}
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(day.posts / maxDailyPosts) * 100}%` }}
                      transition={{ delay: 0.4 + i * 0.02 }}
                      className="w-full bg-cyan-500/50 rounded-t-sm min-h-[2px]"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-[10px] text-blue-600">{stats.dailyActivity[0]?.label}</span>
                <span className="text-[10px] text-blue-600">{stats.dailyActivity[stats.dailyActivity.length - 1]?.label}</span>
              </div>
            </motion.div>

            {/* Top Posts */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
              className="bg-slate-900/50 border border-white/10 rounded-2xl p-5"
            >
              <h3 className="font-bold text-white flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-yellow-400" /> Mejores Publicaciones
              </h3>
              {stats.topPosts.length > 0 ? (
                <div className="space-y-3">
                  {stats.topPosts.map((post, i) => (
                    <div key={post.id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-slate-400/20 text-slate-300' :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-700/50 text-blue-500'
                      }`}>
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate">
                          {post.contenido?.substring(0, 40) || 'Foto'}
                          {post.contenido?.length > 40 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-red-400 flex items-center gap-0.5">
                            <Heart className="w-3 h-3" /> {post.likeCount}
                          </span>
                          <span className="text-blue-400 flex items-center gap-0.5">
                            <MessageCircle className="w-3 h-3" /> {post.commentCount}
                          </span>
                        </div>
                      </div>
                      {post.imagen_url && (
                        <img src={post.imagen_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-blue-500 text-sm py-8">Aún no tienes publicaciones</p>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Stat Card ─────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, periodValue, change, color, delay = 0 }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    red: 'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    blue: 'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
  };

  const iconColors = {
    cyan: 'text-cyan-500',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-2xl p-4`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${iconColors[color]}`} />
        {change !== null && change !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${
            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-blue-500'
          }`}>
            {change > 0 ? <ArrowUp className="w-3 h-3" /> : change < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
      <p className="text-xs text-blue-400 mt-0.5">{label}</p>
      {periodValue !== null && periodValue !== undefined && (
        <p className="text-[10px] text-blue-500 mt-1">+{periodValue} este periodo</p>
      )}
    </motion.div>
  );
};

export default AnalyticsPage;
