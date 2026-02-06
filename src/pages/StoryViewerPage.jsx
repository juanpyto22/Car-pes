import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';

const StoryViewerPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [stories, setStories] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef();
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
      setLiked(false);
    } else {
      navigate('/feed');
    }
  };

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLiked(false);
    } else {
      navigate('/feed');
    }
  };

  const handleLike = async () => {
    if (!currentUser) return;
    setLiked(!liked);

    if (!liked) {
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'story_like',
          related_user_id: currentUser.id,
          story_id: stories[currentIndex].id,
          read: false
        });
      } catch (error) {
        console.error('Error liking story:', error);
      }
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

          {/* Like button */}
          <button
            onClick={handleLike}
            className="absolute bottom-6 right-6 p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white z-20"
          >
            <Heart
              className="w-6 h-6"
              fill={liked ? 'currentColor' : 'none'}
              color={liked ? '#ff4444' : 'white'}
            />
          </button>
        </div>
      </div>
    </>
  );
};

export default StoryViewerPage;