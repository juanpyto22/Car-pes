import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

export const SharedPostPreview = ({ postId }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('id, content, fish_species, image_url, fish_weight, likes_count, comments_count, user:profiles(username)')
          .eq('id', postId)
          .single();

        if (fetchError) throw fetchError;
        setPost(data);
      } catch (err) {
        console.error('Error fetching post:', err);
        setError('No se pudo cargar el post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="w-full max-w-xs bg-slate-700/40 rounded-lg p-3 animate-pulse">
        <div className="aspect-square bg-slate-600 rounded mb-2" />
        <div className="h-3 bg-slate-600 rounded w-3/4 mb-2" />
        <div className="h-2 bg-slate-600 rounded w-1/2" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-full max-w-xs bg-slate-800/50 rounded-lg p-2 text-xs text-slate-400 border border-slate-700">
        {error || 'Post no disponible'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-xs cursor-pointer group"
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10">
        {/* Imagen del post */}
        {post.image_url && (
          <div className="relative w-full aspect-square overflow-hidden bg-slate-700">
            <img
              src={post.image_url}
              alt="Post"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
          </div>
        )}

        {/* Contenido */}
        <div className="p-3 space-y-2">
          {/* Título con tipo de pez */}
          {post.fish_species && (
            <div className="flex items-center gap-1">
              <span className="text-xs px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-full font-medium">
                🎣 {post.fish_species}
              </span>
            </div>
          )}

          {/* Descripción */}
          {post.content && (
            <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
              {post.content}
            </p>
          )}

          {/* Detalles - Peso */}
          <div className="flex gap-2 text-[10px] text-slate-400">
            {post.fish_weight && (
              <span className="px-2 py-1 bg-slate-700/40 rounded">
                ⚖️ {post.fish_weight}
              </span>
            )}
          </div>

          {/* Usuario */}
          {post.user?.username && (
            <p className="text-[10px] text-cyan-400 font-medium">
              Por: {post.user.username}
            </p>
          )}

          {/* Interacciones */}
          <div className="flex gap-3 pt-1 border-t border-slate-700/50 text-[10px] text-slate-400">
            <button className="flex items-center gap-1 hover:text-rose-400 transition-colors">
              <Heart className="w-3 h-3" />
              <span>{post.likes_count || 0}</span>
            </button>
            <button className="flex items-center gap-1 hover:text-cyan-400 transition-colors">
              <MessageCircle className="w-3 h-3" />
              <span>{post.comments_count || 0}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
