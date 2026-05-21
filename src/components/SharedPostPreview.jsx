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
        
        // Traer TODOS los datos del post
        const { data: postData, error: postError } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .single();

        if (postError) throw postError;
        
        console.log('📊 Post data:', postData);
        
        // Obtener usuario si existe user_id
        let userData = null;
        if (postData?.user_id) {
          const { data: userResult } = await supabase
            .from('profiles')
            .select('username, foto_perfil')
            .eq('id', postData.user_id)
            .single();
          userData = userResult;
          console.log('👤 User data:', userData);
        }
        
        // Mapear los datos al formato estándar
        const mappedData = {
          id: postData.id,
          // Probar todos los nombres posibles de columnas de contenido
          content: postData.content || postData.descripcion || postData.description || '',
          // Probar todos los nombres posibles de foto
          image_url: postData.image_url || postData.foto_url || postData.photo_url || null,
          // Probar todos los nombres posibles de tipo de pez
          fish_species: postData.fish_species || postData.tipo_pez || postData.type_fish || null,
          // Probar todos los nombres posibles de peso
          fish_weight: postData.fish_weight || postData.peso || postData.weight || null,
          likes_count: postData.likes_count || 0,
          comments_count: postData.comments_count || 0,
          user: {
            username: userData?.username || 'Usuario',
            foto_perfil: userData?.foto_perfil
          }
        };
        
        console.log('✅ Post final:', mappedData);
        setPost(mappedData);
      } catch (err) {
        console.error('❌ Error:', err.message);
        setError('No se pudo cargar el post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    } else {
      console.log('⚠️ postId es null');
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
              
              {/* Nombre de usuario en esquina superior izquierda */}
              {post.user?.username && (
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  {post.user?.foto_perfil && (
                    <img 
                      src={post.user.foto_perfil} 
                      alt={post.user.username}
                      className="w-7 h-7 rounded-full border border-white/50 object-cover"
                    />
                  )}
                  <span className="text-xs font-bold text-white drop-shadow-lg bg-black/30 px-2 py-1 rounded-full">
                    {post.user.username}
                  </span>
                </div>
              )}
              
              {/* Ícono de abrir en el centro */}
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
