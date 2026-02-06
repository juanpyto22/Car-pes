import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Calendar, Fish, MapPin, 
  Target, Trophy, Users, Clock, Star, Activity,
  PieChart, LineChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, 
  subMonths, format, eachDayOfInterval, subDays 
} from 'date-fns';
import { es } from 'date-fns/locale';

const AnalyticsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month'); // week, month, year
  const [analytics, setAnalytics] = useState({
    overview: {},
    catchStats: {},
    postStats: {},
    socialStats: {},
    trends: {},
    achievements: {},
    locations: []
  });

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user, timeframe]);

  const fetchAnalytics = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate, endDate;
      
      switch (timeframe) {
        case 'week':
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case 'month':
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = new Date(now.getFullYear(), 11, 31);
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      // Fetch user posts and stats
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*, likes(count), comments(count)')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (postsError) throw postsError;

      // Fetch fishing sessions/catches
      const { data: catches, error: catchesError } = await supabase
        .from('fishing_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (catchesError && catchesError.code !== 'PGRST116') throw catchesError;

      // Fetch social activity
      const { data: followers, error: followersError } = await supabase
        .from('follows')
        .select('created_at')
        .eq('following_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (followersError) throw followersError;

      const { data: following, error: followingError } = await supabase
        .from('follows')
        .select('created_at')
        .eq('follower_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (followingError) throw followingError;

      // Process analytics data
      const analyticsData = {
        overview: {
          totalPosts: posts?.length || 0,
          totalLikes: posts?.reduce((sum, post) => sum + (post.likes?.[0]?.count || 0), 0) || 0,
          totalComments: posts?.reduce((sum, post) => sum + (post.comments?.[0]?.count || 0), 0) || 0,
          newFollowers: followers?.length || 0,
          newFollowing: following?.length || 0,
          totalCatches: catches?.length || 0,
          avgCatchSize: catches?.length ? 
            catches.reduce((sum, c) => sum + (c.weight || 0), 0) / catches.length : 0
        },
        
        postStats: {
          dailyPosts: generateDailyData(posts || [], startDate, endDate),
          topPosts: (posts || [])
            .sort((a, b) => (b.likes?.[0]?.count || 0) - (a.likes?.[0]?.count || 0))
            .slice(0, 5),
          avgLikesPerPost: posts?.length ? 
            posts.reduce((sum, post) => sum + (post.likes?.[0]?.count || 0), 0) / posts.length : 0,
          avgCommentsPerPost: posts?.length ?
            posts.reduce((sum, post) => sum + (post.comments?.[0]?.count || 0), 0) / posts.length : 0
        },

        catchStats: {
          dailyCatches: generateDailyData(catches || [], startDate, endDate),
          speciesDistribution: getSpeciesDistribution(catches || []),
          locations: getLocationStats(catches || []),
          avgWeight: catches?.length ?
            catches.reduce((sum, c) => sum + (c.weight || 0), 0) / catches.length : 0,
          bestCatch: catches?.reduce((best, current) => 
            (current.weight || 0) > (best?.weight || 0) ? current : best, null)
        },

        socialStats: {
          followerGrowth: generateDailyData(followers || [], startDate, endDate),
          followingGrowth: generateDailyData(following || [], startDate, endDate),
          engagement: posts?.length ? 
            (posts.reduce((sum, post) => sum + (post.likes?.[0]?.count || 0) + (post.comments?.[0]?.count || 0), 0) / posts.length).toFixed(2) : 0
        }
      };

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar estadísticas"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateDailyData = (data, startDate, endDate) => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    return days.map(day => {
      const dayData = data.filter(item => {
        const itemDate = new Date(item.created_at || item.date);
        return itemDate.toDateString() === day.toDateString();
      });
      return {
        date: format(day, 'dd/MM'),
        value: dayData.length
      };
    });
  };

  const getSpeciesDistribution = (catches) => {
    const distribution = {};
    catches.forEach(c => {
      const species = c.species || 'Desconocido';
      distribution[species] = (distribution[species] || 0) + 1;
    });
    return Object.entries(distribution).map(([species, count]) => ({ species, count }));
  };

  const getLocationStats = (catches) => {
    const locations = {};
    catches.forEach(c => {
      const location = c.location || 'Ubicación desconocida';
      locations[location] = (locations[location] || 0) + 1;
    });
    return Object.entries(locations)
      .map(([location, visits]) => ({ location, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, trend, color = "cyan" }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-gradient-to-br ${
        color === 'green' ? 'from-green-900/30 to-emerald-900/30 border-green-500/30' :
        color === 'blue' ? 'from-blue-900/30 to-cyan-900/30 border-blue-500/30' :
        color === 'purple' ? 'from-purple-900/30 to-pink-900/30 border-purple-500/30' :
        color === 'orange' ? 'from-orange-900/30 to-yellow-900/30 border-orange-500/30' :
        'from-cyan-900/30 to-blue-900/30 border-cyan-500/30'
      } border rounded-2xl p-6 shadow-lg`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${
          color === 'green' ? 'bg-green-500/20' :
          color === 'blue' ? 'bg-blue-500/20' :
          color === 'purple' ? 'bg-purple-500/20' :
          color === 'orange' ? 'bg-orange-500/20' :
          'bg-cyan-500/20'
        }`}>
          <Icon className={`w-6 h-6 ${
            color === 'green' ? 'text-green-400' :
            color === 'blue' ? 'text-blue-400' :
            color === 'purple' ? 'text-purple-400' :
            color === 'orange' ? 'text-orange-400' :
            'text-cyan-400'
          }`} />
        </div>
        
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
            trend > 0 ? 'bg-green-500/20 text-green-400' : 
            trend < 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
          }`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-white">{value?.toLocaleString()}</h3>
        <p className="text-sm font-medium text-blue-200">{title}</p>
        {subtitle && <p className="text-xs text-blue-400">{subtitle}</p>}
      </div>
    </motion.div>
  );

  const SimpleChart = ({ data, title, color = "cyan" }) => (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="h-40 flex items-end justify-between gap-2">
        {data.slice(-7).map((item, index) => {
          const maxValue = Math.max(...data.map(d => d.value));
          const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          
          return (
            <div key={index} className="flex flex-col items-center gap-2 flex-1">
              <div 
                className={`w-full rounded-t-lg transition-all duration-500 delay-${index * 100} ${
                  color === 'green' ? 'bg-gradient-to-t from-green-600 to-green-400' :
                  color === 'blue' ? 'bg-gradient-to-t from-blue-600 to-blue-400' :
                  color === 'purple' ? 'bg-gradient-to-t from-purple-600 to-purple-400' :
                  'bg-gradient-to-t from-cyan-600 to-cyan-400'
                }`}
                style={{ height: `${height}%`, minHeight: '4px' }}
              />
              <div className="text-center">
                <div className="text-xs font-bold text-white">{item.value}</div>
                <div className="text-xs text-blue-400">{item.date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const TopItemsList = ({ items, title, valueKey, nameKey }) => (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {items.slice(0, 5).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0 ? 'bg-yellow-500 text-black' :
                index === 1 ? 'bg-slate-300 text-black' :
                index === 2 ? 'bg-orange-600 text-white' :
                'bg-slate-700 text-white'
              }`}>
                {index + 1}
              </div>
              <span className="text-white text-sm truncate">{item[nameKey]}</span>
            </div>
            <span className="text-cyan-400 font-bold">{item[valueKey]}</span>
          </div>
        ))}
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
        <title>Estadísticas - Car-Pes</title>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Estadísticas</h1>
              <p className="text-blue-400">Analiza tu progreso y actividad</p>
            </div>
            
            <div className="flex gap-2">
              {['week', 'month', 'year'].map((period) => (
                <Button
                  key={period}
                  variant={timeframe === period ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTimeframe(period)}
                  className={timeframe === period ? "bg-cyan-600" : ""}
                >
                  {period === 'week' ? 'Semana' : 
                   period === 'month' ? 'Mes' : 'Año'}
                </Button>
              ))}
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={Fish}
              title="Capturas Totales"
              value={analytics.overview.totalCatches}
              subtitle={`Promedio: ${analytics.catchStats.avgWeight?.toFixed(1) || 0}kg`}
              color="green"
            />
            
            <StatCard
              icon={BarChart3}
              title="Publicaciones"
              value={analytics.overview.totalPosts}
              subtitle={`${analytics.postStats.avgLikesPerPost?.toFixed(1) || 0} likes promedio`}
              color="blue"
            />
            
            <StatCard
              icon={Users}
              title="Nuevos Seguidores"
              value={analytics.overview.newFollowers}
              subtitle={`${analytics.socialStats.engagement || 0}% engagement`}
              color="purple"
            />
            
            <StatCard
              icon={Trophy}
              title="Mejor Captura"
              value={analytics.catchStats.bestCatch?.weight?.toFixed(1) || 0}
              subtitle={analytics.catchStats.bestCatch?.species || "Sin capturas"}
              color="orange"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="catches" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="catches">Capturas</TabsTrigger>
              <TabsTrigger value="posts">Publicaciones</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
              <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
            </TabsList>

            {/* Catches Tab */}
            <TabsContent value="catches" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={analytics.catchStats.dailyCatches}
                  title="Capturas Diarias"
                  color="green"
                />
                
                <TopItemsList
                  items={analytics.catchStats.speciesDistribution}
                  title="Especies Más Capturadas"
                  valueKey="count"
                  nameKey="species"
                />
              </div>

              {/* Best Catch Card */}
              {analytics.catchStats.bestCatch && (
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-2xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-yellow-500/20 rounded-2xl">
                      <Trophy className="w-8 h-8 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Mejor Captura del Período</h3>
                      <p className="text-yellow-200">
                        {analytics.catchStats.bestCatch.species} - {analytics.catchStats.bestCatch.weight}kg
                      </p>
                      <p className="text-yellow-300/70 text-sm">
                        {analytics.catchStats.bestCatch.location} • {format(new Date(analytics.catchStats.bestCatch.date), 'd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={analytics.postStats.dailyPosts}
                  title="Publicaciones Diarias"
                  color="blue"
                />
                
                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Métricas de Engagement</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Total de Likes</span>
                      <span className="text-cyan-400 font-bold">{analytics.overview.totalLikes}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Total de Comentarios</span>
                      <span className="text-cyan-400 font-bold">{analytics.overview.totalComments}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Likes por Post</span>
                      <span className="text-cyan-400 font-bold">{analytics.postStats.avgLikesPerPost?.toFixed(1) || 0}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-200">Comentarios por Post</span>
                      <span className="text-cyan-400 font-bold">{analytics.postStats.avgCommentsPerPost?.toFixed(1) || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Social Tab */}
            <TabsContent value="social" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SimpleChart
                  data={analytics.socialStats.followerGrowth}
                  title="Nuevos Seguidores"
                  color="purple"
                />
                
                <SimpleChart
                  data={analytics.socialStats.followingGrowth}
                  title="Nuevos Seguidos"
                  color="blue"
                />
              </div>
              
              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Activity className="w-8 h-8 text-purple-400" />
                  <h2 className="text-xl font-bold text-white">Actividad Social</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-400">{analytics.overview.newFollowers}</p>
                    <p className="text-purple-200 text-sm">Nuevos Seguidores</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-pink-400">{analytics.overview.newFollowing}</p>
                    <p className="text-purple-200 text-sm">Nuevos Seguidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-cyan-400">{analytics.socialStats.engagement}%</p>
                    <p className="text-purple-200 text-sm">Engagement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-400">{analytics.overview.totalLikes + analytics.overview.totalComments}</p>
                    <p className="text-purple-200 text-sm">Interacciones</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Locations Tab */}
            <TabsContent value="locations" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopItemsList
                  items={analytics.catchStats.locations}
                  title="Ubicaciones Más Visitadas"
                  valueKey="visits"
                  nameKey="location"
                />
                
                <div className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Exploración</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-cyan-400" />
                        <span className="text-blue-200">Spots Únicos Visitados</span>
                      </div>
                      <span className="text-cyan-400 font-bold">{analytics.catchStats.locations.length}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="w-5 h-5 text-green-400" />
                        <span className="text-blue-200">Spot Favorito</span>
                      </div>
                      <span className="text-green-400 font-bold text-sm">
                        {analytics.catchStats.locations[0]?.location || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map placeholder */}
              <div className="bg-slate-900/30 border border-white/10 rounded-2xl p-8 text-center">
                <MapPin className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Mapa de Ubicaciones</h3>
                <p className="text-blue-400">Visualización de tus spots de pesca más visitados</p>
                <p className="text-blue-500 text-sm mt-2">Funcionalidad disponible próximamente</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
};

export default AnalyticsPage;