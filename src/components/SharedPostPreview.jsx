import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

export const SharedPostPreview = ({ postId }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log('🔍 SharedPostPreview: Buscando postId:', postId);
        
        // Select solo los campos de la tabla posts, sin joins
        const { data, error: fetchError } = await supabase
          .from('posts')
          .select('id, content, fish_species, image_url, fish_weight, likes_count, comments_count')
          .eq('id', postId)
          .single();

        console.log('📊 Query result:', { data, error: fetchError });

        if (fetchError) {
          console.error('❌ Error fetching post:', fetchError);
          throw fetchError;
        }

        if (!data) throw new Error('Post no encontrado');
        console.log('✅ Post cargado:', data);
        setPost(data);
      } catch (err) {
        console.error('❌ Error final:', err.message);
        setError('No se pudo cargar el post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    } else {
      console.log('⚠️ SharedPostPreview: postId es null o vacío');
      setLoading(false);
    }
  }, [postId]);

  if (loading) {
    return (
      <div className="w-48 bg-slate-700/40 rounded-lg overflow-hidden animate-pulse">
        <div className="aspect-video bg-slate-600" />
        <div className="p-2 space-y-2">
          <div className="h-3 bg-slate-600 rounded w-3/4" />
          <div className="h-2 bg-slate-600 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-48 bg-slate-800/50 rounded-lg p-2 text-xs text-slate-400 border border-slate-700">
        {error || 'Post no disponible'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="w-48 cursor-pointer group"
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10">
        {/* Imagen del post */}
        <div className="relative w-full aspect-video overflow-hidden bg-slate-700">
          {post.image_url ? (
            <>
              <img
                src={post.image_url}
                alt="Post"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-12 h-12 text-white fill-white drop-shadow-lg" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500">
              📸
            </div>
          )}
        </div>

        {/* Contenido compacto */}
        <div className="p-2 space-y-1">
          {/* Tipo de pez */}
          {post.fish_species && (
            <div className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded inline-block font-medium">
              🎣 {post.fish_species}
            </div>
          )}

          {/* Descripción corta */}
          {post.content && (
            <p className="text-xs text-slate-200 line-clamp-2 leading-tight">
              {post.content}
            </p>
          )}

          {/* Peso */}
          {post.fish_weight && (
            <p className="text-[10px] text-slate-400">
              ⚖️ {post.fish_weight}
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-2 text-[10px] text-slate-400 pt-1">
            <span>❤️ {post.likes_count || 0}</span>
            <span>💬 {post.comments_count || 0}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
