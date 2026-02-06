import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, Loader2, User, Fish, Filter, MapPin } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';

const SearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState('all'); // all, users, posts
  const [results, setResults] = useState({ users: [], posts: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ users: [], posts: [] });
      return;
    }

    setLoading(true);
    try {
      const [usersRes, postsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil, bio, followers_count')
          .or(`username.ilike.%${searchQuery}%,nombre.ilike.%${searchQuery}%`)
          .limit(20),
        supabase
          .from('posts')
          .select('id, tipo_pez, foto_url, descripcion, ubicacion, likes_count, user:profiles(id, username, foto_perfil)')
          .or(`tipo_pez.ilike.%${searchQuery}%,descripcion.ilike.%${searchQuery}%,ubicacion.ilike.%${searchQuery}%`)
          .order('likes_count', { ascending: false })
          .limit(20)
      ]);

      setResults({
        users: usersRes.data || [],
        posts: postsRes.data || []
      });
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setResults({ users: [], posts: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    performSearch(query);
  };

  const totalResults = results.users.length + results.posts.length;

  return (
    <>
      <Helmet>
        <title>{query ? `"${query}" - Búsqueda` : 'Buscar'} - Car-Pes</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-4">Buscar</h1>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar usuarios, peces, ubicaciones..."
                className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border border-blue-800/30 rounded-2xl text-white placeholder-blue-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:bg-slate-900 transition-all text-lg"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); setResults({ users: [], posts: [] }); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-white bg-white/5 rounded-full p-1 hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-slate-900/50 p-2 rounded-xl border border-white/5">
            {[
              { id: 'all', label: 'Todos', count: totalResults },
              { id: 'users', label: 'Usuarios', count: results.users.length },
              { id: 'posts', label: 'Publicaciones', count: results.posts.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-white shadow-lg'
                    : 'text-blue-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          ) : totalResults === 0 && query ? (
            <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
              <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-blue-500/50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Sin resultados</h3>
              <p className="text-blue-300">No encontramos nada para "{query}"</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Users Section */}
              {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-cyan-400" /> Usuarios
                    </h2>
                  )}
                  <div className="grid gap-3">
                    {results.users.map(user => (
                      <Link key={user.id} to={`/profile/${user.id}`}>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-white/5 hover:bg-slate-900 hover:border-cyan-500/30 transition-all"
                        >
                          <Avatar className="w-14 h-14 border-2 border-cyan-500/30">
                            <AvatarImage src={user.foto_perfil} />
                            <AvatarFallback className="bg-blue-900 text-cyan-200 text-lg font-bold">
                              {user.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white truncate">{user.username}</h3>
                            <p className="text-sm text-blue-300 truncate">{user.nombre}</p>
                            {user.bio && <p className="text-xs text-blue-400 truncate mt-1">{user.bio}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-blue-400">{user.followers_count || 0} seguidores</p>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Posts Section */}
              {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
                <section>
                  {activeTab === 'all' && (
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Fish className="w-5 h-5 text-cyan-400" /> Publicaciones
                    </h2>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {results.posts.map(post => (
                      <Link key={post.id} to={`/post/${post.id}`}>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ y: -4 }}
                          className="bg-slate-900 rounded-xl overflow-hidden group shadow-lg border border-white/5 relative"
                        >
                          <div className="aspect-square relative">
                            <img 
                              src={post.foto_url} 
                              alt={post.tipo_pez} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="w-5 h-5 border border-white/20">
                                  <AvatarImage src={post.user?.foto_perfil} />
                                  <AvatarFallback className="text-[8px]">{post.user?.username?.[0]}</AvatarFallback>
                                </Avatar>
                                <span className="text-white text-xs font-bold truncate">{post.user?.username}</span>
                              </div>
                              <div className="flex justify-between text-white text-xs">
                                <span>❤️ {post.likes_count}</span>
                                {post.ubicacion && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" /> {post.ubicacion}
                                  </span>
                                )}
                              </div>
                            </div>
                            {post.tipo_pez && (
                              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                                <Fish className="w-3 h-3 text-cyan-400" />
                                {post.tipo_pez}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchPage;
