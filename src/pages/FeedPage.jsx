import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PostCard from '@/components/PostCard';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';

const FeedPage = () => {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followedIds, setFollowedIds] = useState([]);
  const observer = useRef();
  const PAGE_SIZE = 10;

  // Cargar IDs de usuarios seguidos
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchFollowedIds = async () => {
      try {
        const { data, error } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);

        if (error) throw error;
        const ids = data ? data.map(f => f.following_id) : [];
        ids.push(user.id);
        setFollowedIds(ids);
      } catch (error) {
        console.error('Error fetching followed users:', error);
        setFollowedIds([user.id]);
      }
    };

    fetchFollowedIds();
  }, [user?.id]);

  // Cargar posts cuando cambien los IDs
  useEffect(() => {
    if (followedIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchPosts = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('posts')
          .select('*, user:users(*), likes(count), comments(count)')
          .in('user_id', followedIds)
          .order('created_at', { ascending: false })
          .range(0, PAGE_SIZE - 1);

        if (error) throw error;

        if (data.length < PAGE_SIZE) setHasMore(false);
        setPosts(data || []);
      } catch (error) {
        console.error('Error cargando posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [followedIds.join(',')]); // Usar join para evitar referencia nueva del array

  const fetchMorePosts = async () => {
    if (loadingMore || !hasMore || followedIds.length === 0) return;

    try {
      setLoadingMore(true);
      const nextPage = Math.floor(posts.length / PAGE_SIZE);
      const from = nextPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users(*), likes(count), comments(count)')
        .in('user_id', followedIds)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data.length < PAGE_SIZE) setHasMore(false);
      setPosts(prev => [...prev, ...data]);
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
    if (followedIds.length === 0) return;
    
    try {
      setLoading(true);
      setHasMore(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users(*), likes(count), comments(count)')
        .in('user_id', followedIds)
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) throw error;

      if (data.length < PAGE_SIZE) setHasMore(false);
      setPosts(data || []);
    } catch (error) {
      console.error('Error refrescando posts:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Feed - Car-Pes</title>
      </Helmet>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/5 to-slate-950 pb-20">
        <div className="max-w-xl mx-auto pt-6 px-4">
            
          {/* Top Actions */}
          <div className="flex items-center justify-between mb-8">
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
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-900/50 rounded-2xl overflow-hidden border border-white/5">
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                    <div className="space-y-2">
                      <div className="w-24 h-3 bg-slate-800 rounded animate-pulse" />
                      <div className="w-16 h-2 bg-slate-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="aspect-square bg-slate-800 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="w-32 h-4 bg-slate-800 rounded animate-pulse" />
                    <div className="w-full h-3 bg-slate-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/50 backdrop-blur-sm rounded-3xl border border-white/10 px-6">
              <div className="w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-500/20">
                 <span className="text-5xl">🐟</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">¡Está muy tranquilo aquí!</h3>
              <p className="text-blue-300 mb-8 max-w-sm mx-auto">
                Sigue a otros pescadores o comparte tu primera captura para ver actividad en tu feed.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/explore">
                  <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 w-full sm:w-auto">
                    Explorar Comunidad
                  </Button>
                </Link>
                <Link to="/create-post">
                  <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl w-full sm:w-auto">
                    Crear mi primer post
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, index) => {
                const handleDeletePost = (postId) => {
                  setPosts(prev => prev.filter(p => p.id !== postId));
                };
                
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post.id}>
                      <PostCard post={post} onDelete={handleDeletePost} />
                    </div>
                  );
                } else {
                  return <PostCard key={post.id} post={post} onDelete={handleDeletePost} />;
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