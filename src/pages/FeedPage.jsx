import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { usePosts } from '@/hooks/usePosts';
import PostCard from '@/components/PostCard';
import { Loader2, RefreshCw, Plus, Compass, Sparkles, Trophy } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';
import StoriesBar from '@/components/StoriesBar';

const FeedPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();
  const PAGE_SIZE = 20;

  // Cargar TODOS los posts (como Instagram), no solo los de seguidos
  const { posts, loading, error, toggleLike, refetch, appendPosts } = usePosts({
    limit: PAGE_SIZE
  });

  const fetchMorePosts = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = Math.floor(posts.length / PAGE_SIZE);
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:profiles(
            id,
            username,
            nombre,
            foto_perfil
          )
        `)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!data || data.length < PAGE_SIZE) setHasMore(false);
      if (data?.length > 0) appendPosts(data);
    } catch (error) {
      console.error('Error cargando más posts:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const lastPostElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const handleRefresh = async () => {
    try {
      await refetch();
      setHasMore(true);
    } catch (error) {
      console.error('Error refrescando posts:', error);
    }
  };

  const spotlightBlocks = [
    {
      icon: Compass,
      title: 'Spotlight de Zona',
      description: 'Comparte coordenadas aproximadas, clima y señuelo para ayudar a la comunidad.',
    },
    {
      icon: Trophy,
      title: 'Reto Semanal',
      description: 'Publica tu mejor captura de la semana y etiqueta el tamaño para entrar al ranking.',
    },
    {
      icon: Sparkles,
      title: 'Tip de Maestro',
      description: 'Incluye técnica, profundidad y hora para que tu post gane más guardados.',
    },
  ];

  return (
    <>
      <Helmet>
        <title>Car-Pes | Feed</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/10 to-slate-950 pb-20">
        <div className="max-w-xl mx-auto pt-2 md:pt-6 px-0 md:px-4">

          <div className="mx-3 md:mx-0 mb-4 rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.85),rgba(2,6,23,0.88))] p-4 md:p-5 shadow-[0_10px_30px_rgba(2,6,23,0.35)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-sky-300/80 font-semibold">Diario de Capturas</p>
                <h2 className="mt-2 text-2xl md:text-3xl font-bold text-white">Tu marea social de pesca</h2>
                <p className="mt-2 text-sm text-slate-300 max-w-md">Publica, aprende y compite. Cada captura que compartes ayuda a mejorar el mapa colectivo.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-sky-300/20 bg-sky-500/10 px-3 py-2 text-sky-200 text-xs">
                <Sparkles className="w-4 h-4" />
                Comunidad activa
              </div>
            </div>
          </div>

          {/* Stories Bar - full width on mobile */}
          <StoriesBar />
            
          {/* Top Actions - hidden on mobile, use bottom nav instead */}
          <div className="hidden md:flex items-center justify-between mb-8 px-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Tu Feed</h1>
              <p className="text-blue-400 text-sm">Las últimas capturas de tus amigos</p>
            </div>
            <div className="flex gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRefresh}
                    disabled={loading}
                    className="text-blue-300 hover:text-white hover:bg-white/10 rounded-xl border border-white/5"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                <Link to="/create-post">
                    <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-900/20">
                        <Plus className="w-4 h-4 mr-2" /> Nueva Captura
                    </Button>
                </Link>
            </div>
          </div>

          {loading && posts.length === 0 ? (
            <div className="space-y-6 px-3 md:px-0">
              {[1, 2, 3].map(i => (
                <div key={i} className="surface-card rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700/70 animate-pulse" />
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-slate-700/70 rounded animate-pulse" />
                      <div className="w-16 h-2 bg-slate-700/70 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="aspect-square bg-slate-800/90 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="w-32 h-4 bg-slate-700/70 rounded animate-pulse" />
                    <div className="w-full h-3 bg-slate-700/70 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/55 backdrop-blur-sm rounded-3xl border border-sky-300/20 px-6 mx-3 md:mx-0">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                <span className="text-5xl">🐟</span>
              </div>
              
              <h3 className="text-2xl font-bold text-white mb-3">¡Comparte tu primera captura!</h3>
              <p className="text-blue-300 mb-8 max-w-sm mx-auto">
                {error 
                  ? 'No se pudieron cargar los posts. Verifica tu conexión a internet.'
                  : 'Sé el primero en compartir una captura con la comunidad.'
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/create-post">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Crear publicación
                  </Button>
                </Link>
                <Link to="/explore">
                  <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl w-full sm:w-auto">
                    Explorar Comunidad
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, index) => {
                const handleDeletePost = (postId) => {
                  // El hook usePosts se encargará de actualizar el estado
                  refetch();
                };

                const showSpotlight = index > 0 && index % 5 === 0;
                const spotlight = spotlightBlocks[(index / 5) % spotlightBlocks.length];
                const SpotlightIcon = spotlight?.icon;
                
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post.id} className="space-y-6">
                      {showSpotlight && (
                        <div className="mx-3 md:mx-0 rounded-2xl border border-sky-400/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.45))] p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-300/25">
                              {SpotlightIcon ? <SpotlightIcon className="w-4 h-4 text-sky-200" /> : null}
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200/80">Bloque Editorial</p>
                              <h3 className="text-white font-semibold mt-1">{spotlight.title}</h3>
                              <p className="text-sm text-slate-300 mt-1">{spotlight.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <PostCard 
                        post={post} 
                        onDelete={handleDeletePost}
                        onToggleLike={toggleLike}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div key={post.id} className="space-y-6">
                      {showSpotlight && (
                        <div className="mx-3 md:mx-0 rounded-2xl border border-sky-400/20 bg-[linear-gradient(180deg,rgba(14,165,233,0.14),rgba(15,23,42,0.45))] p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-300/25">
                              {SpotlightIcon ? <SpotlightIcon className="w-4 h-4 text-sky-200" /> : null}
                            </div>
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-sky-200/80">Bloque Editorial</p>
                              <h3 className="text-white font-semibold mt-1">{spotlight.title}</h3>
                              <p className="text-sm text-slate-300 mt-1">{spotlight.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <PostCard 
                        post={post} 
                        onDelete={handleDeletePost}
                        onToggleLike={toggleLike}
                      />
                    </div>
                  );
                }
              })}
            </div>
          )}

          {loadingMore && (
            <div className="py-8 flex justify-center">
              <div className="flex items-center gap-3 text-cyan-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm font-medium">Cargando más capturas...</span>
              </div>
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-white/5">
                <span className="text-lg">🎣</span>
                <span className="text-blue-400 text-sm font-medium">¡Has visto todas las capturas!</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedPage;