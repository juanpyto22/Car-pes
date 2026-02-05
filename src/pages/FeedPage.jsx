import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import PostCard from '@/components/PostCard';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';

const FeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [followedIds, setFollowedIds] = useState([]);
  const observer = useRef();
  const PAGE_SIZE = 10;

  const fetchFollowedIds = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      if (error) throw error;
      const ids = data.map(f => f.following_id);
      ids.push(user.id);
      setFollowedIds(ids);
    } catch (error) {
      console.error('Error fetching followed users:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchFollowedIds();
  }, [user]);

  const fetchPosts = useCallback(async (pageNumber, isRefresh = false) => {
    if (followedIds.length === 0) {
      setLoading(false);
      return;
    }

    try {
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('posts')
        .select('*, user:users(*), likes(count), comments(count)')
        .in('user_id', followedIds)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data.length < PAGE_SIZE) setHasMore(false);

      setPosts(prev => isRefresh ? data : [...prev, ...data]);
    } catch (error) {
      console.error('Error cargando posts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [followedIds]);

  useEffect(() => {
    if (followedIds.length > 0) {
      setLoading(true);
      fetchPosts(0, true);
    } else if (user) {
        setLoading(false); // Stop loading if authenticated but no follows/posts yet
    }
  }, [followedIds]);

  const lastPostElementRef = useCallback(node => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setLoadingMore(true);
        // Calculate next page based on current length
        const nextPage = Math.floor(posts.length / PAGE_SIZE);
        fetchPosts(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, fetchPosts, posts.length]);

  const handleRefresh = () => {
    setLoading(true);
    setHasMore(true);
    fetchPosts(0, true);
  };

  return (
    <>
      <Helmet>
        <title>Feed - FishHub</title>
      </Helmet>
      <div className="min-h-screen bg-slate-950 pb-20">
        <div className="max-w-xl mx-auto pt-6 px-4">
            
          {/* Top Actions */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white">Tu Feed</h1>
            <div className="flex gap-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRefresh}
                    className="text-blue-300 hover:text-white hover:bg-white/10 rounded-full"
                >
                    <RefreshCw className="w-5 h-5" />
                </Button>
                <Link to="/create-post">
                    <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-full">
                        <Plus className="w-4 h-4 mr-1" /> Crear
                    </Button>
                </Link>
            </div>
          </div>

          {loading && posts.length === 0 ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-900/50 rounded-2xl h-[500px] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-24 bg-slate-900/30 rounded-3xl border border-white/5 px-6">
              <div className="w-20 h-20 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                 <span className="text-4xl">🐟</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">¡Está muy tranquilo aquí!</h3>
              <p className="text-blue-300 mb-8 max-w-sm mx-auto">Sigue a otros pescadores o comparte tu primera captura para ver actividad.</p>
              <Link to="/explore">
                <Button size="lg" className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl shadow-lg shadow-cyan-900/20">
                  Explorar Comunidad
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {posts.map((post, index) => {
                if (posts.length === index + 1) {
                  return (
                    <div ref={lastPostElementRef} key={post.id}>
                      <PostCard post={post} />
                    </div>
                  );
                } else {
                  return <PostCard key={post.id} post={post} />;
                }
              })}
            </div>
          )}

          {loadingMore && (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
          )}
          
          {!hasMore && posts.length > 0 && (
            <div className="py-12 text-center text-blue-500 text-sm font-medium">
              ¡Has visto todas las capturas! 🎣
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default FeedPage;