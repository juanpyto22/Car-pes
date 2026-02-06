import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Filter, TrendingUp, Fish } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import LocationAutocomplete from '@/components/LocationAutocomplete';

const ExplorePage = () => {
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFish, setSelectedFish] = useState('Todos');
  const [searchLocation, setSearchLocation] = useState('');

  const fishTypes = ['Todos', 'Trucha', 'Salmón', 'Bagre', 'Carpa', 'Perca', 'Robalo', 'Otro'];

  const fetchTrendingPosts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('posts')
        .select('*, user:profiles(*)')
        .order('likes_count', { ascending: false })
        .limit(30);

      if (selectedFish !== 'Todos') {
        query = query.eq('tipo_pez', selectedFish);
      }
      
      if (searchLocation && searchLocation.length > 2) {
        query = query.ilike('ubicacion', `%${searchLocation}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrendingPosts(data || []);
    } catch (error) {
      console.error('Error cargando explorar:', error);
      setTrendingPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedFish, searchLocation]);

  useEffect(() => {
    fetchTrendingPosts();
  }, [selectedFish, searchLocation]);

  return (
    <>
      <Helmet><title>Explorar - Car-Pes</title></Helmet>
      <div className="min-h-screen bg-slate-950 pb-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          
          <div className="mb-10 space-y-6">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TrendingUp className="text-cyan-400" /> Explorar
            </h1>

            <div className="flex flex-col md:flex-row gap-4 bg-slate-900/50 p-4 rounded-3xl border border-white/5 backdrop-blur-sm">
              <div className="flex-1">
                <LocationAutocomplete
                  value={searchLocation}
                  onChange={setSearchLocation}
                  placeholder="Filtrar por ubicación..."
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide no-scrollbar">
                 {fishTypes.map(type => (
                   <button
                      key={type}
                      onClick={() => setSelectedFish(type)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                          selectedFish === type 
                          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/20' 
                          : 'bg-slate-950 text-blue-300 border border-blue-900 hover:bg-slate-800 hover:text-white'
                      }`}
                   >
                      {type === 'Todos' ? 'Todas las capturas' : type}
                   </button>
                 ))}
              </div>
            </div>
          </div>

          {loading ? (
             <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] bg-slate-900/50 rounded-xl animate-pulse border border-white/5" />
                ))}
             </div>
          ) : trendingPosts.length === 0 ? (
              <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
                  <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Filter className="w-8 h-8 text-blue-500/50" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No se encontraron resultados</h3>
                  <p className="text-blue-300">Intenta ajustar tus filtros para ver más capturas.</p>
              </div>
          ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {trendingPosts.map((post) => (
                      <Link key={post.id} to={`/post/${post.id}`}>
                          <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              whileHover={{ y: -4 }}
                              className="bg-slate-900 rounded-xl overflow-hidden group shadow-lg border border-white/5 relative"
                          >
                              <div className="aspect-[4/5] relative">
                                  {post.video_url ? (
                                      <video src={post.video_url} className="w-full h-full object-cover" />
                                  ) : (
                                      <img src={post.foto_url} alt="" className="w-full h-full object-cover" />
                                  )}
                                  
                                  {/* Overlay Info */}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                      <div className="flex items-center gap-2 mb-3">
                                          <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20">
                                              <img src={post.user?.foto_perfil} className="w-full h-full object-cover" />
                                          </div>
                                          <span className="text-white text-xs font-bold truncate">{post.user?.username}</span>
                                      </div>
                                      <div className="flex justify-between text-white text-xs font-bold bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                                          <span>❤️ {post.likes_count}</span>
                                          <span>💬 {post.comments_count}</span>
                                      </div>
                                  </div>

                                  {/* Species Badge */}
                                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                      <Fish className="w-3 h-3 text-cyan-400" />
                                      {post.tipo_pez}
                                  </div>
                              </div>
                          </motion.div>
                      </Link>
                  ))}
              </div>
          )}

        </div>
      </div>
    </>
  );
};

export default ExplorePage;