import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { enforceFishingOnlyPolicy } from '@/utils/fishingOnlyPolicy';

export const usePosts = (options = {}) => {
  const { userId = null, userIds = null, limit = 10 } = options;
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const userIdsKey = useMemo(() => {
    if (!Array.isArray(userIds)) return null;
    return userIds.length > 0 ? userIds.join(',') : '';
  }, [userIds]);

  useEffect(() => {
    fetchPosts();
  }, [userId, userIdsKey, limit]);

  const fetchPosts = async () => {
    try {
      setLoading(true);

      if (Array.isArray(userIds) && userIds.length === 0) {
        setPosts([]);
        setError(null);
        setLoading(false);
        return;
      }

      // Intentar query con join a profiles
      let query = supabase
        .from('posts')
        .select(`
          *,
          user:profiles!posts_user_id_fkey(
            id,
            username,
            nombre,
            foto_perfil
          ),
          likes(count),
          comments(count)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (Array.isArray(userIds) && userIds.length > 0) {
        query = query.in('user_id', userIds);
      } else if (userId) {
        query = query.eq('user_id', userId);
      }

      let { data, error: queryError } = await query;
      
      // Si falla el join con FK explícita, intentar sin FK hint
      if (queryError) {
        console.warn('Posts query with FK hint failed, trying without:', queryError.message);
        let fallbackQuery = supabase
          .from('posts')
          .select(`
            *,
            user:profiles(
              id,
              username,
              nombre,
              foto_perfil
            ),
            likes(count),
            comments(count)
          `)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (Array.isArray(userIds) && userIds.length > 0) {
          fallbackQuery = fallbackQuery.in('user_id', userIds);
        } else if (userId) {
          fallbackQuery = fallbackQuery.eq('user_id', userId);
        }

        const fallbackResult = await fallbackQuery;
        
        // Si sigue fallando, cargar posts sin el join
        if (fallbackResult.error) {
          console.warn('Posts query with join failed, loading without profiles:', fallbackResult.error.message);
          let simpleQuery = supabase
            .from('posts')
            .select('*, likes(count), comments(count)')
            .order('created_at', { ascending: false })
            .limit(limit);

          if (Array.isArray(userIds) && userIds.length > 0) {
            simpleQuery = simpleQuery.in('user_id', userIds);
          } else if (userId) {
            simpleQuery = simpleQuery.eq('user_id', userId);
          }

          const simpleResult = await simpleQuery;
          if (simpleResult.error) throw simpleResult.error;
          data = simpleResult.data || [];
        } else {
          data = fallbackResult.data || [];
        }
      }
      
      let processedData = (data || []).map(post => ({
        ...post,
        likes_count: post.likes?.[0]?.count ?? post.likes_count ?? 0,
        comments_count: post.comments?.[0]?.count ?? post.comments_count ?? 0
      }));
      
      // Intentar obtener likes del usuario actual (no fallar si la tabla no existe)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id && processedData.length > 0) {
          const postIds = processedData.map(post => post.id);
          const { data: userLikes } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds);

          const likedPostIds = new Set(userLikes?.map(like => like.post_id) || []);
          
          processedData = processedData.map(post => ({
            ...post,
            has_liked: likedPostIds.has(post.id)
          }));
        }
      } catch (likesError) {
        console.warn('Could not fetch likes:', likesError.message);
      }
      
      setPosts(processedData);
      setError(null);
    } catch (error) {
      console.error('Error fetching posts:', error);
      setError(error.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleLike = async (postId) => {
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
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const policyCheck = await enforceFishingOnlyPolicy({
        userId: user.id,
        contentType: 'post',
        text: postData?.contenido || postData?.content || '',
        category: postData?.categoria || postData?.category || '',
        imageUrl: postData?.imagen_url || postData?.image_url || null
      });

      if (policyCheck.blocked) {
        return {
          success: false,
          code: 'FISHING_ONLY_POLICY',
          error: policyCheck.message
        };
      }

      // Intentar insertar; si falla por columna faltante (p.ej. image_urls), reintentar sin esa columna
      let insertResult = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          ...postData
        })
        .select('*');

      if (insertResult.error) {
        const msg = String(insertResult.error.message || insertResult.error.details || '');
        // Detectar error de columna inexistente (cache de esquema de supabase)
        if (msg.toLowerCase().includes('image_urls') || msg.toLowerCase().includes("could not find the 'image_urls'")) {
          // Remover la propiedad y reintentar con compatibilidad a una sola foto
          const safeData = { ...postData };
          delete safeData.image_urls;
          delete safeData.image_urls_json;

          insertResult = await supabase
            .from('posts')
            .insert({
              user_id: user.id,
              ...safeData
            })
            .select('*');
        }
      }

      if (insertResult.error) throw insertResult.error;
      const data = insertResult.data;

      if (data) {
        const newPost = { ...data[0], has_liked: false, likes_count: 0, comments_count: 0 };
        setPosts(prev => [newPost, ...prev]);
      }

      // If we retried without image_urls due to missing column, try to update the inserted row with image_urls now (non-blocking)
      try {
        if ((insertResult.data?.[0]) && postData?.image_urls) {
          const insertedId = insertResult.data[0].id;
          // Attempt update - if column still missing this will error silently
          await supabase.from('posts').update({ image_urls: postData.image_urls }).eq('id', insertedId);
        }
      } catch (updErr) {
        console.warn('Could not update image_urls after insert (schema may be missing):', updErr.message);
      }

      return { success: true, data: data?.[0] };
    } catch (error) {
      console.error('Error creating post:', error);
      return { success: false, error: error.message };
    }
  };

  const appendPosts = useCallback((newPosts = []) => {
    if (!Array.isArray(newPosts) || newPosts.length === 0) return;
    setPosts(prev => {
      const existingIds = new Set(prev.map(post => post.id));
      const merged = [...prev];
      newPosts.forEach(post => {
        if (!existingIds.has(post.id)) {
          merged.push(post);
        }
      });
      return merged;
    });
  }, []);

  return { posts, loading, error, refetch: fetchPosts, toggleLike, createPost, appendPosts, setPosts };
};