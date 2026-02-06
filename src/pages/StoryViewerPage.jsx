import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';

const StoryViewerPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [userProfile, setUserProfile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const progressRef = useRef();
  const inputRef = useRef();
  const STORY_DURATION = 5000;

  useEffect(() => {
    if (userId) {
      fetchUserStories();
      fetchUserProfile();
    }
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0) {
      startProgress();
      fetchStoriesLikes();
    }
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, stories]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const fetchUserStories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast({
          title: "Sin historias",
          description: "Este usuario no tiene historias disponibles"
        });
        navigate('/feed');
        return;
      }

      setStories(data);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar historias"
      });
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoriesLikes = async () => {
    if (!currentUser?.id) return;
    
    try {
      const storyId = stories[currentIndex]?.id;
      if (!storyId) return;

      // Obtener likes del usuario para esta historia
      const { data: userLike } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      setLiked(prev => ({
        ...prev,
        [storyId]: !!userLike
      }));

      // Obtener conteo total de likes
      const { count } = await supabase
        .from('story_likes')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      setLikeCounts(prev => ({
        ...prev,
        [storyId]: count || 0
      }));
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const fetchComments = async () => {
    if (!stories[currentIndex]) return;

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('story_comments')
        .select(`
          *,
          user:user_id(id, username, foto_perfil)
        `)
        .eq('story_id', stories[currentIndex].id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar comentarios"
      });
    } finally {
      setLoadingComments(false);
    }
  };

  const startProgress = () => {
    if (progressRef.current) clearInterval(progressRef.current);
    
    setProgress(0);
    const startTime = Date.now();
    
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        handleNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      navigate('/feed');
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      navigate('/feed');
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast({
        variant: "destructive",
        title: "Inicia sesión para dar like"
      });
      return;
    }

    const storyId = stories[currentIndex].id;
    const isCurrentlyLiked = liked[storyId];

    try {
      if (isCurrentlyLiked) {
        // Unlike
        await supabase
          .from('story_likes')
          .delete()
          .eq('story_id', storyId)
          .eq('user_id', currentUser.id);

        setLiked(prev => ({ ...prev, [storyId]: false }));
        setLikeCounts(prev => ({ ...prev, [storyId]: (prev[storyId] || 1) - 1 }));
      } else {
        // Like
        await supabase
          .from('story_likes')
          .insert({
            story_id: storyId,
            user_id: currentUser.id
          });

        setLiked(prev => ({ ...prev, [storyId]: true }));
        setLikeCounts(prev => ({ ...prev, [storyId]: (prev[storyId] || 0) + 1 }));

        // Notificación
        if (userId !== currentUser.id) {
          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'story_like',
            related_user_id: currentUser.id,
            story_id: storyId,
            read: false
          });
        }
      }
    } catch (error) {
      console.error('Error liking story:', error);
      toast({
        variant: "destructive",
        title: "Error al dar like"
      });
    }
  };

  const handleCommentClick = () => {
    if (!showCommentsModal) {
      fetchComments();
    }
    setShowCommentsModal(!showCommentsModal);
  };

  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim()) return;

    try {
      const { error } = await supabase
        .from('story_comments')
        .insert({
          story_id: stories[currentIndex].id,
          user_id: currentUser.id,
          content: commentText.trim()
        });

      if (error) throw error;

      toast({ title: "Comentario enviado" });
      setCommentText('');
      fetchComments();

      // Notificación
      if (userId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'story_comment',
          related_user_id: currentUser.id,
          story_id: stories[currentIndex].id,
          read: false
        });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        variant: "destructive",
        title: "Error al enviar comentario"
      });
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (stories.length === 0) {
    return null;
  }

  const currentStory = stories[currentIndex];
  const progressPercent = ((currentIndex + 1) / stories.length) * 100;

  return (
    <>
      <Helmet>
        <title>Historia - {userProfile?.username}</title>
      </Helmet>

      <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
        {/* Header con barras de progreso */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 space-y-3">
          {/* Progress bars */}
          <div className="flex gap-1">
            {stories.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width: index < currentIndex ? '100%' : 
                           index === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* User info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-cyan-400">
                <AvatarImage src={userProfile?.foto_perfil} />
                <AvatarFallback>
                  {userProfile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-white">
                <p className="font-bold text-sm">{userProfile?.nombre || userProfile?.username}</p>
                <p className="text-xs text-gray-300">
                  {new Date(currentStory.created_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => navigate('/feed')}
              className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Story content */}
        <div className="flex-1 flex items-center justify-center relative overflow-hidden">
          {currentStory.image_url ? (
            <img
              src={currentStory.image_url}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
              <p className="text-white text-2xl text-center px-8 max-w-lg">
                {currentStory.content}
              </p>
            </div>
          )}

          {/* Left navigation */}
          {currentIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-white/20 transition-colors text-white z-20"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}

          {/* Right navigation */}
          {currentIndex < stories.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-white/20 transition-colors text-white z-20"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleLike}
            className={`p-3 rounded-full transition-all ${
              liked[stories[currentIndex].id]
                ? 'bg-red-500/30 text-red-400' 
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Heart
              className="w-6 h-6"
              fill={liked[stories[currentIndex].id] ? 'currentColor' : 'none'}
            />
          </motion.button>

          <div className="text-white text-sm font-medium">
            {likeCounts[stories[currentIndex].id] > 0 && `${likeCounts[stories[currentIndex].id]} ${likeCounts[stories[currentIndex].id] === 1 ? 'me gusta' : 'me gustan'}`}
          </div>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCommentClick}
            className="ml-auto p-3 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white"
          >
            <MessageCircle className="w-6 h-6" />
          </motion.button>
        </div>

        {/* Comments Modal */}
        <AnimatePresence>
          {showCommentsModal && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-slate-900 to-slate-900/80 backdrop-blur-sm border-t border-white/10 rounded-t-3xl"
            >
              <div className="max-h-[70vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-white font-bold">Comentarios</h3>
                  <button
                    onClick={() => setShowCommentsModal(false)}
                    className="text-white/70 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingComments ? (
                    <div className="flex justify-center py-4">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-white/50 text-sm text-center py-8">Sin comentarios aún</p>
                  ) : (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={comment.user?.foto_perfil} />
                          <AvatarFallback>
                            {comment.user?.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="bg-white/10 rounded-lg p-2">
                            <p className="text-white font-bold text-sm">{comment.user?.username}</p>
                            <p className="text-white/90 text-sm">{comment.content}</p>
                          </div>
                          <p className="text-white/50 text-xs mt-1">
                            {new Date(comment.created_at).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                {currentUser && (
                  <div className="p-4 border-t border-white/10 flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="Escribe un comentario..."
                      className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-white placeholder-white/50 outline-none focus:border-cyan-500 focus:bg-white/20 transition-colors text-sm"
                    />
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      size="sm"
                      className="bg-cyan-600 hover:bg-cyan-500 rounded-full"
                    >
                      Enviar
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default StoryViewerPage;