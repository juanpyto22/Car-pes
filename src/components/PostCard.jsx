import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreVertical, MapPin, Ruler, Weight, Fish, Bookmark, BookmarkCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

const PostCard = ({ post, onDelete }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef(0);

  useEffect(() => {
    if (user?.id) {
      checkIfLiked();
      checkSaved();
    }
  }, [user?.id, post.id]);

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setLiked(!!data);
  };

  const checkSaved = async () => {
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setSaved(!!data);
  };

  const handleLike = async () => {
    if (!user) {
        toast({ title: "Inicia sesión para dar like", variant: "destructive" });
        return;
    }

    const previousLiked = liked;
    const newLikesCount = liked ? likesCount - 1 : likesCount + 1;
    
    // Actualización optimista
    setLiked(!liked);
    setLikesCount(newLikesCount);

    try {
      if (previousLiked) {
        // Quitar like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        // Dar like
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: post.id, user_id: user.id }]);
        if (error) throw error;

        // Crear notificación si no es el propio post
        if (post.user_id !== user.id) {
          await supabase.from('notifications').insert([{
            user_id: post.user_id,
            type: 'like',
            related_user_id: user.id,
            post_id: post.id,
            read: false
          }]);
        }
      }

      // Actualizar contador en la tabla posts
      await supabase
        .from('posts')
        .update({ likes_count: newLikesCount })
        .eq('id', post.id);

    } catch (error) {
      console.error('Error al dar like:', error);
      // Revertir si hay error
      setLiked(previousLiked);
      setLikesCount(likesCount);
      toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar el like" });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta publicación?')) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id);
      if (error) throw error;
      toast({ title: "Éxito", description: "Publicación eliminada" });
      // Llamar callback en lugar de reload
      if (onDelete) onDelete(post.id);
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar" });
    } finally {
      setIsDeleting(false);
    }
  };

  // Doble tap para like
  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!liked) {
        handleLike();
        setShowHeart(true);
        setTimeout(() => setShowHeart(false), 1000);
      }
    }
    lastTap.current = now;
  };

  // Compartir con Web Share API
  const handleShare = async () => {
    const shareData = {
      title: `Captura de ${post.user?.username}`,
      text: post.descripcion || `Mira esta captura de ${post.tipo_pez || 'pesca'}`,
      url: `${window.location.origin}/post/${post.id}`
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copiar al clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: "Enlace copiado", description: "El enlace se copió al portapapeles" });
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        await navigator.clipboard.writeText(shareData.url);
        toast({ title: "Enlace copiado", description: "El enlace se copió al portapapeles" });
      }
    }
  };

  // Guardar post
  const handleSave = async () => {
    if (!user) {
      toast({ title: "Inicia sesión para guardar", variant: "destructive" });
      return;
    }

    const prevSaved = saved;
    setSaved(!saved);

    try {
      if (saved) {
        await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', user.id);
      } else {
        await supabase.from('saved_posts').insert([{ post_id: post.id, user_id: user.id }]);
        toast({ title: "Guardado", description: "Post añadido a tu colección" });
      }
    } catch (error) {
      setSaved(prevSaved);
      toast({ variant: "destructive", title: "Error", description: "No se pudo guardar" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-all shadow-xl"
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.user_id}`}>
            <Avatar className="w-10 h-10 border-2 border-cyan-500/50 hover:border-cyan-400 transition-colors">
              <AvatarImage src={post.user?.foto_perfil} className="object-cover" />
              <AvatarFallback className="bg-blue-900 text-cyan-200">
                {post.user?.nombre?.[0]}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link to={`/profile/${post.user_id}`} className="font-bold text-white hover:text-cyan-400 transition-colors text-sm">
              {post.user?.username}
            </Link>
            <p className="text-xs text-blue-300">
               {post.ubicacion && <span className="mr-1">📍 {post.ubicacion} • </span>}
               {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}
            </p>
          </div>
        </div>
        
        {user?.id === post.user_id && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-blue-400 hover:text-white hover:bg-white/10 rounded-full">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-900 border-blue-800 text-blue-100">
              <DropdownMenuItem 
                className="text-red-400 focus:text-red-300 focus:bg-red-900/20 cursor-pointer"
                onClick={handleDelete}
              >
                Eliminar Publicación
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Media - con doble tap para like */}
      <div 
        className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-hidden group cursor-pointer"
        onClick={handleDoubleTap}
      >
        {post.video_url ? (
           <video src={post.video_url} controls className="w-full h-full object-contain" poster={post.foto_url} />
        ) : (
          <img src={post.foto_url} alt={post.descripcion} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        )}
        
        {/* Animación de corazón al hacer doble tap */}
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-24 h-24 text-white fill-white drop-shadow-2xl" />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Actions */}
        <div className="flex items-center gap-6 mb-4">
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleLike}
            className={`flex items-center gap-2 group ${liked ? 'text-red-500' : 'text-white hover:text-red-400'} transition-colors`}
          >
            <Heart className={`w-7 h-7 ${liked ? 'fill-current' : ''}`} />
          </motion.button>
          
          <Link to={`/post/${post.id}`}>
            <button className="flex items-center gap-2 text-white hover:text-cyan-400 transition-colors">
              <MessageCircle className="w-7 h-7" />
            </button>
          </Link>

          <button onClick={handleShare} className="text-white hover:text-cyan-400 transition-colors">
            <Share2 className="w-6 h-6" />
          </button>
          
          <button onClick={handleSave} className={`ml-auto transition-colors ${saved ? 'text-yellow-500' : 'text-white hover:text-yellow-400'}`}>
            {saved ? <BookmarkCheck className="w-6 h-6 fill-current" /> : <Bookmark className="w-6 h-6" />}
          </button>
        </div>

        <div className="text-white font-bold mb-3 text-sm">
             {likesCount} Me gusta
        </div>

        {/* Catch Details Badge Grid */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tipo_pez && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              <Fish className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-blue-100">{post.tipo_pez}</span>
            </div>
          )}
          {post.peso && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              <Weight className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-blue-100">{post.peso} kg</span>
            </div>
          )}
          {post.tamano && (
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
              <Ruler className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-medium text-blue-100">{post.tamano} cm</span>
            </div>
          )}
        </div>

        {/* Caption */}
        {post.descripcion && (
          <div className="text-sm text-blue-100 leading-relaxed mb-2">
            <Link to={`/profile/${post.user_id}`} className="font-bold text-white hover:text-cyan-400 transition-colors mr-2">
              {post.user?.username}
            </Link>
            {post.descripcion}
          </div>
        )}
        
        {commentsCount > 0 && (
            <Link to={`/post/${post.id}`} className="text-xs text-blue-400 hover:text-cyan-300 transition-colors block mt-3 font-medium">
                Ver los {commentsCount} comentarios
            </Link>
        )}
      </div>
    </motion.div>
  );
};

export default PostCard;