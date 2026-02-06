import { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useDemo } from '@/contexts/DemoContext';

export const usePosts = (userId = null, limit = 10) => {
  const { isDemoMode, mockPosts } = useDemo();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isDemoMode) {
      // Usar datos demo
      setPosts(userId ? mockPosts.filter(p => p.user_id === userId) : mockPosts);
      setLoading(false);
      setError(null);
    } else {
      fetchPosts();
    }
  }, [userId, limit, isDemoMode]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles!user_id(
            id,
            username,
            nombre,
            foto_perfil
          ),
          has_liked:likes!left(user_id)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Procesar has_liked
      const { data: { user } } = await supabase.auth.getUser();
      const processedData = (data || []).map(post => ({
        ...post,
        has_liked: post.has_liked?.some(like => like.user_id === user?.id) || false
      }));
      
      setPosts(processedData);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(error.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId) => {
    if (isDemoMode) {
      // Simular toggle de like en modo demo
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, has_liked: !post.has_liked, likes_count: post.likes_count + (post.has_liked ? -1 : 1) }
          : post
      ));
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.has_liked) {
        // Quitar like
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Añadir like
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: user.id });
      }

      // Actualizar estado local
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, has_liked: !p.has_liked, likes_count: p.likes_count + (p.has_liked ? -1 : 1) }
          : p
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const createPost = async (postData) => {
    if (isDemoMode) {
      // Simular creación de post en modo demo
      const newPost = {
        id: Date.now().toString(),
        user_id: 'demo-user-123',
        ...postData,
        likes_count: 0,
        comments_count: 0,
        has_liked: false,
        created_at: new Date().toISOString(),
        profiles: {
          id: 'demo-user-123',
          username: 'pescador_demo',
          nombre: 'Usuario Demo',
          foto_perfil: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
        }
      };
      setPosts(prev => [newPost, ...prev]);
      return { success: true, data: newPost };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          ...postData
        })
        .select(`
          *,
          profiles!user_id(
            id,
            username,
            nombre,
            foto_perfil
          )
        `);

      if (error) throw error;

      if (data) {
        const newPost = { ...data[0], has_liked: false };
        setPosts(prev => [newPost, ...prev]);
      }

      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  };

  return { posts, loading, error, refetch: fetchPosts, toggleLike, createPost };
};