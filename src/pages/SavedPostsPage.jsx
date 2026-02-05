import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Fish, Trash2, Heart } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const SavedPostsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedPosts, setSavedPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSavedPosts();
    }
  }, [user]);

  const fetchSavedPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          created_at,
          post:posts(
            id,
            foto_url,
            video_url,
            tipo_pez,
            descripcion,
            likes_count,
            comments_count,
            created_at,
            user:users(id, username, foto_perfil)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Filtrar posts que existen (por si se eliminaron)
      const validPosts = (data || []).filter(item => item.post !== null);
      setSavedPosts(validPosts);
    } catch (error) {
      console.error('Error cargando posts guardados:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los posts guardados"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSaved = async (savedId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', savedId);

      if (error) throw error;
      
      setSavedPosts(prev => prev.filter(item => item.id !== savedId));
      toast({
        title: "Eliminado",
        description: "Post eliminado de guardados"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar"
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Posts Guardados - Car-Pes</title>
      </Helmet>
      
      <div className="min-h-screen bg-slate-950 pb-20 pt-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Posts Guardados</h1>
              <p className="text-blue-400 text-sm">{savedPosts.length} posts en tu colección</p>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-slate-900/50 rounded-xl animate-pulse border border-white/5" />
              ))}
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-white/5 border-dashed">
              <div className="w-20 h-20 bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bookmark className="w-10 h-10 text-yellow-500/50" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No tienes posts guardados</h3>
              <p className="text-blue-300 mb-6 max-w-sm mx-auto">
                Guarda tus capturas favoritas tocando el icono de marcador en cualquier publicación.
              </p>
              <Link to="/explore">
                <Button className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl">
                  Explorar Posts
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {savedPosts.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <Link to={`/post/${item.post.id}`}>
                      <div className="bg-slate-900 rounded-xl overflow-hidden group shadow-lg border border-white/5 relative">
                        <div className="aspect-square relative">
                          {item.post.video_url ? (
                            <video 
                              src={item.post.video_url} 
                              className="w-full h-full object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={item.post.foto_url} 
                              alt={item.post.tipo_pez} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                          )}
                          
                          {/* Overlay Info */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="w-6 h-6 border border-white/20">
                                <AvatarImage src={item.post.user?.foto_perfil} />
                                <AvatarFallback className="text-[10px]">{item.post.user?.username?.[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-white text-xs font-bold truncate">{item.post.user?.username}</span>
                            </div>
                            <div className="flex justify-between items-center text-white text-xs">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3 h-3" /> {item.post.likes_count}
                              </span>
                              <span className="flex items-center gap-1">
                                💬 {item.post.comments_count}
                              </span>
                            </div>
                          </div>

                          {/* Species Badge */}
                          {item.post.tipo_pez && (
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                              <Fish className="w-3 h-3 text-cyan-400" />
                              {item.post.tipo_pez}
                            </div>
                          )}

                          {/* Remove Button */}
                          <button
                            onClick={(e) => handleRemoveSaved(item.id, e)}
                            className="absolute top-2 right-2 p-2 bg-red-500/80 backdrop-blur rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Eliminar de guardados"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {/* Saved indicator */}
                          <div className="absolute bottom-2 right-2 p-1.5 bg-yellow-500/90 backdrop-blur rounded-full">
                            <Bookmark className="w-3 h-3 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SavedPostsPage;
