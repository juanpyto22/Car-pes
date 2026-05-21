import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Play, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

export const SharedPostPreview = ({ postId }) => {
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        console.log('🔍 SharedPostPreview: Buscando postId:', postId);
        
        // Query 1: Intenta con nombres de columnas nuevas
        const { data: newData, error: newError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (newError) {
          console.log('⚠️ Query con nuevos nombres falló, intentando con nombres antiguos...');
          
          // Query 2: Fallback a nombres antiguos - select todo y mapea manualmente
          const { data: oldData, error: oldError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();
          
          if (oldError) throw oldError;
          
          // Mapea los nombres antiguos a nuevos
          const mappedData = {
            id: oldData.id,
            content: oldData.descripcion || oldData.content,
            fish_species: oldData.tipo_pez || oldData.fish_species,
            image_url: oldData.foto_url || oldData.image_url,
            fish_weight: oldData.peso || oldData.fish_weight,
            likes_count: oldData.likes_count || 0,
            comments_count: oldData.comments_count || 0
          };
          
          console.log('✅ Post cargado con mapeo:', mappedData);
          setPost(mappedData);
        } else {
          console.log('✅ Post cargado con nuevos nombres:', newData);
          setPost(newData);
        }
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
      <div className="w-80 bg-slate-700/40 rounded-lg overflow-hidden animate-pulse">
        <div className="aspect-video bg-slate-600" />
        <div className="p-3 space-y-2">
          <div className="h-4 bg-slate-600 rounded w-3/4" />
          <div className="h-3 bg-slate-600 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="w-80 bg-slate-800/50 rounded-lg p-3 text-sm text-slate-400 border border-slate-700">
        {error || 'Post no disponible'}
      </div>
    );
  }

  const handleClick = () => {
    navigate(`/post/${postId}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className="w-80 cursor-pointer group"
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/20 hover:shadow-2xl">
        {/* Imagen del post - Grande */}
        <div className="relative w-full aspect-video overflow-hidden bg-slate-700">
          {post.image_url ? (
            <>
              <img
                src={post.image_url}
                alt="Post"
                className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                  <ExternalLink className="w-6 h-6 text-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-4xl">
              📸
            </div>
          )}
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-2">
          {/* Tipo de pez */}
          {post.fish_species && (
            <div className="text-xs px-2 py-1 bg-cyan-500/30 text-cyan-200 rounded-full inline-block font-bold">
              🎣 {post.fish_species}
            </div>
          )}

          {/* Descripción */}
          {post.content && (
            <p className="text-sm text-slate-100 line-clamp-3 leading-snug font-medium">
              {post.content}
            </p>
          )}

          {/* Peso */}
          {post.fish_weight && (
            <p className="text-xs text-slate-300 font-semibold">
              ⚖️ Peso: {post.fish_weight}
            </p>
          )}

          {/* Stats */}
          <div className="flex gap-4 text-xs text-slate-400 pt-2 border-t border-slate-700">
            <span className="flex items-center gap-1">❤️ {post.likes_count || 0}</span>
            <span className="flex items-center gap-1">💬 {post.comments_count || 0}</span>
            <span className="ml-auto text-cyan-300 font-semibold">Ver más →</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
