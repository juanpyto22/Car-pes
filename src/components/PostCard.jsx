import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, MoreVertical, MapPin, Ruler, Weight, Fish } from 'lucide-react';
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

const PostCard = ({ post }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
  }, [user, post.id]);

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) setLiked(true);
  };

  const handleLike = async () => {
    if (!user) {
        toast({ title: "Inicia sesión para dar like", variant: "destructive" });
        return;
    }

    const previousLiked = liked;
    
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);

    try {
      if (liked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', post.id).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id: post.id, user_id: user.id }]);
        if (error) throw error;

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
    } catch (error) {
      setLiked(previousLiked);
      setLikesCount(prev => previousLiked ? prev + 1 : prev - 1);
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
      window.location.reload(); 
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar" });
    } finally {
      setIsDeleting(false);
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

      {/* Media */}
      <div className="relative aspect-square sm:aspect-video bg-black flex items-center justify-center overflow-hidden group">
        {post.video_url ? (
           <video src={post.video_url} controls className="w-full h-full object-contain" poster={post.foto_url} />
        ) : (
          <img src={post.foto_url} alt={post.descripcion} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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

          <button className="text-white hover:text-cyan-400 transition-colors ml-auto">
            <Share2 className="w-6 h-6" />
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