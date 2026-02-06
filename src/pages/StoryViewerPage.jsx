import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart, Send, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';

const StoryViewer = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isPaused, setPaused] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const progressRef = useRef();
  const videoRef = useRef();
  const STORY_DURATION = 5000; // 5 segundos
  
  const currentStory = stories[currentIndex];

  useEffect(() => {
    fetchUserStories();
  }, [userId]);

  useEffect(() => {
    if (stories.length > 0 && !isPaused) {
      startProgress();
    }
    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
    };
  }, [currentIndex, stories, isPaused]);

  const fetchUserStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!user_id(id, username, foto_perfil)
        `)
        .eq('user_id', userId)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (!data || data.length === 0) {
        navigate('/feed');
        return;
      }

      setStories(data);
      
      // Marcar como vista la primera story
      if (data[0] && user?.id) {
        markAsViewed(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (storyId) => {
    if (!user?.id) return;

    try {
      const story = stories.find(s => s.id === storyId);
      const viewedBy = story?.viewed_by || [];
      
      if (!viewedBy.includes(user.id)) {
        await supabase
          .from('stories')
          .update({ 
            viewed_by: [...viewedBy, user.id],
            views_count: (story.views_count || 0) + 1
          })
          .eq('id', storyId);
      }
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const startProgress = () => {
    setProgress(0);
    const startTime = Date.now();
    
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / STORY_DURATION) * 100;
      
      if (newProgress >= 100) {
        nextStory();
      } else {
        setProgress(newProgress);
      }
    }, 50);
  };

  const nextStory = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
    
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      markAsViewed(stories[currentIndex + 1].id);
    } else {
      navigate('/feed');
    }
  };

  const previousStory = () => {
    if (progressRef.current) {
      clearInterval(progressRef.current);
    }
    
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const togglePause = () => {
    setPaused(!isPaused);
    if (videoRef.current) {
      if (isPaused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !currentStory) return;

    try {
      // Enviar como mensaje directo
      await supabase.from('messages').insert({
        sender_id: user.id,
        receiver_id: currentStory.user_id,
        contenido: `📖 Respondió a tu historia: ${replyText}`,
        story_id: currentStory.id
      });

      toast({ title: "Respuesta enviada" });
      setReplyText('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ 
        variant: "destructive",
        title: "Error al enviar respuesta" 
      });
    }
  };

  const likeStory = async () => {
    if (!currentStory || !user?.id) return;
    
    try {
      const { data: existingLike } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', currentStory.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingLike) {
        // Unlike
        await supabase
          .from('story_likes')
          .delete()
          .eq('id', existingLike.id);
      } else {
        // Like
        await supabase
          .from('story_likes')
          .insert({
            story_id: currentStory.id,
            user_id: user.id
          });

        // Enviar notificación si no es propia
        if (currentStory.user_id !== user.id) {
          await supabase.from('notifications').insert({
            user_id: currentStory.user_id,
            type: 'story_like',
            related_user_id: user.id,
            story_id: currentStory.id,
            read: false
          });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (loading || !currentStory) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-out"
              style={{
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-12 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-white/50">
            <AvatarImage src={currentStory.user.foto_perfil} />
            <AvatarFallback>{currentStory.user.username?.[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-medium">{currentStory.user.username}</p>
            <p className="text-white/70 text-sm">
              {formatDistanceToNow(new Date(currentStory.created_at), { 
                addSuffix: true, 
                locale: es 
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={togglePause}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/20"
            onClick={() => navigate('/feed')}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Story Content */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onClick={togglePause}
      >
        {currentStory.media_type === 'text' || (!currentStory.media_url && currentStory.background_gradient) ? (
          <div 
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: currentStory.background_gradient || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <p 
              className="text-center max-w-lg"
              style={{
                fontSize: `${currentStory.text_size || 24}px`,
                color: currentStory.text_color || '#ffffff',
                fontWeight: currentStory.text_bold ? 'bold' : 'normal'
              }}
            >
              {currentStory.text_content}
            </p>
          </div>
        ) : currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className="w-full h-full object-contain"
            autoPlay
            muted
            onEnded={nextStory}
            onLoadedData={startProgress}
          />
        ) : currentStory.media_url ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="w-full h-full object-contain"
            onLoad={startProgress}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-800">
            <p className="text-white/50">Sin contenido</p>
          </div>
        )}
        
        {/* Text overlay if exists on media stories */}
        {currentStory.text_content && currentStory.media_url && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className="bg-black/30 backdrop-blur-sm rounded-2xl p-6 max-w-sm text-center"
              style={{
                fontSize: `${currentStory.text_size || 16}px`,
                color: currentStory.text_color || '#ffffff',
                fontWeight: currentStory.text_bold ? 'bold' : 'normal'
              }}
            >
              {currentStory.text_content}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="absolute inset-0 flex">
        <button 
          className="flex-1"
          onClick={previousStory}
          disabled={currentIndex === 0}
        />
        <button 
          className="flex-1"
          onClick={nextStory}
        />
      </div>

      {/* Bottom Actions */}
      {currentStory.user_id !== user?.id && (
        <div className="absolute bottom-4 left-4 right-4">
          <AnimatePresence>
            {showReplyInput ? (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-full p-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Responder..."
                  className="flex-1 bg-transparent text-white placeholder-white/70 outline-none px-3"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                />
                <Button size="sm" onClick={sendReply} className="rounded-full">
                  <Send className="w-4 h-4" />
                </Button>
              </motion.div>
            ) : (
              <div className="flex items-center justify-between">
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full px-6"
                  onClick={() => setShowReplyInput(true)}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Responder
                </Button>
                
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 rounded-full"
                  onClick={likeStory}
                >
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;