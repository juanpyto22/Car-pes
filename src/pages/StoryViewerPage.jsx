import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle, Send, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';

const STORY_DURATION = 8000;

const StoryViewerPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // All story groups (each group = one user's stories)
  const [storyGroups, setStoryGroups] = useState([]);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState({});
  const [likeCounts, setLikeCounts] = useState({});
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [isHolding, setIsHolding] = useState(false);
  const [direction, setDirection] = useState(0); // -1 left, 1 right for animations

  // Refs
  const progressTimerRef = useRef(null);
  const progressStartTimeRef = useRef(null);
  const progressElapsedRef = useRef(0);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const holdTimerRef = useRef(null);
  const containerRef = useRef(null);

  // Current group and story helpers
  const currentGroup = storyGroups[currentGroupIndex];
  const currentStories = currentGroup?.stories || [];
  const currentStory = currentStories[currentStoryIndex];
  const currentProfile = currentGroup?.user;
  const prevGroup = storyGroups[currentGroupIndex - 1];
  const nextGroup = storyGroups[currentGroupIndex + 1];

  // Fetch all story groups
  useEffect(() => {
    fetchAllStoryGroups();
    return () => clearProgressTimer();
  }, [userId, currentUser]);

  // Start progress when story changes
  useEffect(() => {
    if (currentStory && !loading) {
      progressElapsedRef.current = 0;
      startProgress();
      fetchStoryLikes();
      markAsViewed();
    }
    return () => clearProgressTimer();
  }, [currentGroupIndex, currentStoryIndex, loading, storyGroups]);

  // Pause/resume
  useEffect(() => {
    if (isPaused || showComments || isHolding) {
      pauseProgress();
    } else if (currentStory && !loading) {
      resumeProgress();
    }
  }, [isPaused, showComments, isHolding]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showComments && e.key !== 'Escape') return;
      switch (e.key) {
        case 'ArrowLeft': handlePrevious(); break;
        case 'ArrowRight': handleNext(); break;
        case 'Escape':
          if (showComments) setShowComments(false);
          else navigate('/feed');
          break;
        case ' ':
          e.preventDefault();
          setIsPaused(p => !p);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGroupIndex, currentStoryIndex, storyGroups, showComments]);

  const clearProgressTimer = () => {
    if (progressTimerRef.current) {
      cancelAnimationFrame(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgress = () => {
    clearProgressTimer();
    progressElapsedRef.current = 0;
    progressStartTimeRef.current = Date.now();
    setProgress(0);
    tickProgress();
  };

  const pauseProgress = () => {
    clearProgressTimer();
    if (progressStartTimeRef.current) {
      progressElapsedRef.current += Date.now() - progressStartTimeRef.current;
      progressStartTimeRef.current = null;
    }
  };

  const resumeProgress = () => {
    clearProgressTimer();
    progressStartTimeRef.current = Date.now();
    tickProgress();
  };

  const tickProgress = () => {
    progressTimerRef.current = requestAnimationFrame(() => {
      if (!progressStartTimeRef.current) return;
      const totalElapsed = progressElapsedRef.current + (Date.now() - progressStartTimeRef.current);
      const pct = (totalElapsed / STORY_DURATION) * 100;
      if (pct >= 100) {
        setProgress(100);
        handleNext();
      } else {
        setProgress(pct);
        tickProgress();
      }
    });
  };

  const fetchAllStoryGroups = async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      setLoading(true);

      // Get following IDs
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUser.id);

      const followingIds = followsData?.map(f => f.following_id) || [];
      const userIds = [...new Set([...followingIds, currentUser.id])];
      
      // Always include the target userId
      if (userId && !userIds.includes(userId)) {
        userIds.push(userId);
      }

      // Fetch all active stories
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .in('user_id', userIds)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      if (error || !storiesData || storiesData.length === 0) {
        toast({ title: "Sin historias", description: "No hay historias disponibles" });
        navigate('/feed');
        return;
      }

      // Fetch profiles
      const storyUserIds = [...new Set(storiesData.map(s => s.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', storyUserIds);

      const profilesMap = {};
      (profilesData || []).forEach(p => { profilesMap[p.id] = p; });

      // Group by user
      const grouped = {};
      storiesData.forEach(story => {
        const uid = story.user_id;
        if (!grouped[uid]) {
          grouped[uid] = {
            user: profilesMap[uid] || { id: uid, username: 'usuario' },
            stories: []
          };
        }
        grouped[uid].stories.push(story);
      });

      // Put own stories first, then target userId, then others
      const groups = Object.values(grouped);
      groups.sort((a, b) => {
        if (a.user.id === userId) return -1;
        if (b.user.id === userId) return 1;
        if (a.user.id === currentUser.id) return -1;
        if (b.user.id === currentUser.id) return 1;
        return 0;
      });

      setStoryGroups(groups);

      // Find starting group index for the target userId
      const startIdx = groups.findIndex(g => g.user.id === userId);
      setCurrentGroupIndex(startIdx >= 0 ? startIdx : 0);
      setCurrentStoryIndex(0);
    } catch (error) {
      console.error('Error fetching story groups:', error);
      navigate('/feed');
    } finally {
      setLoading(false);
    }
  };

  const fetchStoryLikes = async () => {
    if (!currentUser?.id || !currentStory) return;
    const storyId = currentStory.id;
    try {
      const { data: userLike } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      setLiked(prev => ({ ...prev, [storyId]: !!userLike }));

      const { count } = await supabase
        .from('story_likes')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      setLikeCounts(prev => ({ ...prev, [storyId]: count || 0 }));
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const markAsViewed = async () => {
    if (!currentUser?.id || !currentStory) return;
    try {
      const storyId = currentStory.id;
      const { data: story } = await supabase
        .from('stories')
        .select('viewed_by, views_count')
        .eq('id', storyId)
        .single();

      if (!story) return;
      const viewedBy = story.viewed_by || [];
      if (viewedBy.includes(currentUser.id)) return;

      await supabase
        .from('stories')
        .update({
          viewed_by: [...viewedBy, currentUser.id],
          views_count: (story.views_count || 0) + 1
        })
        .eq('id', storyId);
    } catch (error) {
      console.error('Error marking viewed:', error);
    }
  };

  const fetchComments = async () => {
    if (!currentStory) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('story_comments')
        .select(`*, user:user_id(id, username, foto_perfil)`)
        .eq('story_id', currentStory.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Navigate to PREVIOUS story or previous user group
  const handlePrevious = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentGroupIndex > 0) {
      setDirection(-1);
      const prevGroupIdx = currentGroupIndex - 1;
      const prevGroupStories = storyGroups[prevGroupIdx]?.stories || [];
      setCurrentGroupIndex(prevGroupIdx);
      setCurrentStoryIndex(Math.max(0, prevGroupStories.length - 1));
    }
  }, [currentStoryIndex, currentGroupIndex, storyGroups]);

  // Navigate to NEXT story or next user group
  const handleNext = useCallback(() => {
    if (currentStoryIndex < currentStories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentGroupIndex < storyGroups.length - 1) {
      setDirection(1);
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      navigate('/feed');
    }
  }, [currentStoryIndex, currentStories.length, currentGroupIndex, storyGroups.length, navigate]);

  // Jump to previous user group (arrow button)
  const goToPrevGroup = useCallback(() => {
    if (currentGroupIndex > 0) {
      setDirection(-1);
      setCurrentGroupIndex(prev => prev - 1);
      setCurrentStoryIndex(0);
    }
  }, [currentGroupIndex]);

  // Jump to next user group (arrow button)
  const goToNextGroup = useCallback(() => {
    if (currentGroupIndex < storyGroups.length - 1) {
      setDirection(1);
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      navigate('/feed');
    }
  }, [currentGroupIndex, storyGroups.length, navigate]);

  const handleLike = async () => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Inicia sesión para dar like" });
      return;
    }
    const storyId = currentStory.id;
    const ownerId = currentGroup.user.id;
    const isLiked = liked[storyId];

    setLiked(prev => ({ ...prev, [storyId]: !isLiked }));
    setLikeCounts(prev => ({ ...prev, [storyId]: (prev[storyId] || 0) + (isLiked ? -1 : 1) }));

    try {
      if (isLiked) {
        await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', currentUser.id);
      } else {
        await supabase.from('story_likes').insert({ story_id: storyId, user_id: currentUser.id });
        if (ownerId !== currentUser.id) {
          await supabase.from('notifications').insert({
            user_id: ownerId, type: 'story_like', related_user_id: currentUser.id, story_id: storyId, read: false
          });
        }
      }
    } catch (error) {
      setLiked(prev => ({ ...prev, [storyId]: isLiked }));
      setLikeCounts(prev => ({ ...prev, [storyId]: (prev[storyId] || 0) + (isLiked ? 1 : -1) }));
      toast({ variant: "destructive", title: "Error al dar like" });
    }
  };

  const handleCommentToggle = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!currentUser || !commentText.trim()) return;
    const text = commentText.trim();
    const ownerId = currentGroup.user.id;
    setCommentText('');

    try {
      const { error } = await supabase.from('story_comments').insert({
        story_id: currentStory.id,
        user_id: currentUser.id,
        content: text
      });
      if (error) throw error;
      fetchComments();

      if (ownerId !== currentUser.id) {
        await supabase.from('notifications').insert({
          user_id: ownerId, type: 'story_comment', related_user_id: currentUser.id,
          story_id: currentStory.id, read: false
        });
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error al enviar comentario" });
    }
  };

  // Touch: tap left = prev, tap right = next, hold = pause
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
    holdTimerRef.current = setTimeout(() => setIsHolding(true), 200);
  };

  const handleTouchEnd = (e) => {
    clearTimeout(holdTimerRef.current);
    if (isHolding) { setIsHolding(false); return; }
    if (touchStartX === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;

    // Swipe down = close
    if (diffY > 100 && Math.abs(diffX) < 50) { navigate('/feed'); return; }

    // Tap: left 30% = prev, right 70% = next
    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      const screenWidth = window.innerWidth;
      if (touchStartX < screenWidth * 0.3) handlePrevious();
      else handleNext();
    }

    // Swipe left/right = switch user group
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 80) {
      if (diffX < 0) goToNextGroup();
      else goToPrevGroup();
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleTouchMove = (e) => {
    if (holdTimerRef.current) {
      const diffX = Math.abs(e.touches[0].clientX - (touchStartX || 0));
      const diffY = Math.abs(e.touches[0].clientY - (touchStartY || 0));
      if (diffX > 10 || diffY > 10) clearTimeout(holdTimerRef.current);
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentStory) return null;

  const storyId = currentStory?.id;
  const isVideo = currentStory?.image_url?.match(/\.(mp4|webm|mov)$/i);

  // Helper: render text-only story content (supports JSON from CameraPage + plain text)
  const renderTextContent = (content) => {
    let text = content || '';
    let bg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    let color = '#ffffff';
    let size = 24;
    let bold = false;

    // Try parsing JSON content from CameraPage
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.text) {
        text = parsed.text;
        bg = parsed.bg || bg;
        color = parsed.color || color;
        size = parsed.size || size;
        bold = parsed.bold || false;
      }
    } catch {
      // Not JSON — plain text story from old CreateStoryPage
    }

    return (
      <div className="w-full h-full flex items-center justify-center p-8" style={{ background: bg }}>
        <p className="text-center leading-relaxed drop-shadow-lg max-w-sm break-words"
          style={{ color, fontSize: `${Math.min(size * 1.2, 48)}px`, fontWeight: bold ? 'bold' : '600' }}>
          {text}
        </p>
      </div>
    );
  };

  // Helper: render a story preview card (side panels)
  const renderSidePreview = (group, side) => {
    if (!group) return <div className="w-full h-full" />;
    const previewStory = group.stories[0];
    const previewProfile = group.user;
    return (
      <div
        onClick={() => { side === 'left' ? goToPrevGroup() : goToNextGroup(); }}
        className="w-full h-full rounded-2xl overflow-hidden cursor-pointer relative bg-slate-900 opacity-50 hover:opacity-70 transition-opacity"
      >
        {previewStory?.image_url ? (
          <img src={previewStory.image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
            <p className="text-white text-sm text-center font-medium line-clamp-3">{previewStory?.content}</p>
          </div>
        )}
        {/* Overlay with username */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7 ring-2 ring-white/40">
              <AvatarImage src={previewProfile?.foto_perfil} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
                {previewProfile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-xs font-medium truncate">{previewProfile?.username}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Historia - {currentProfile?.username || 'Car-Pes'}</title>
      </Helmet>

      <div
        ref={containerRef}
        className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center select-none"
      >
        {/* ===== Desktop layout with side previews ===== */}
        <div className="hidden md:flex items-center justify-center w-full h-full gap-3 px-4 max-w-[1100px] mx-auto">

          {/* Left arrow button */}
          {currentGroupIndex > 0 ? (
            <button
              onClick={goToPrevGroup}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
              aria-label="Historia anterior"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          ) : (
            <div className="w-12 flex-shrink-0" />
          )}

          {/* Left preview */}
          <div className="flex-shrink-0 w-[120px] h-[85vh] max-h-[750px] hidden lg:block">
            {renderSidePreview(prevGroup, 'left')}
          </div>

          {/* ==== MAIN STORY CARD ==== */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${currentGroupIndex}-${currentStoryIndex}`}
              initial={{ opacity: 0, scale: 0.95, x: direction * 60 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: direction * -60 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="relative w-full max-w-[420px] h-[92vh] max-h-[800px] rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/50"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
            >
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-30 px-2 pt-3">
                <div className="flex gap-1">
                  {currentStories.map((_, index) => (
                    <div key={index} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{
                          width: index < currentStoryIndex ? '100%' :
                                 index === currentStoryIndex ? `${progress}%` : '0%',
                          transition: index === currentStoryIndex ? 'none' : 'width 0.2s'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* User info header */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 ring-2 ring-white/50">
                      <AvatarImage src={currentProfile?.foto_perfil} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                        {currentProfile?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-semibold text-sm leading-tight">
                        {currentProfile?.username}
                      </p>
                      <p className="text-white/60 text-xs">
                        {getTimeAgo(currentStory.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {(isPaused || isHolding) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-1.5 rounded-full bg-white/20">
                        <Pause className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    {isVideo && (
                      <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-2 rounded-full bg-black/30 text-white">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={() => navigate('/feed')} className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Story content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {currentStory.image_url ? (
                  isVideo ? (
                    <video ref={videoRef} key={currentStory.image_url} src={currentStory.image_url}
                      className="w-full h-full object-cover" autoPlay loop muted={isMuted} playsInline />
                  ) : (
                    <img key={currentStory.image_url} src={currentStory.image_url} alt="Story" className="w-full h-full object-cover" />
                  )
                ) : (
                  renderTextContent(currentStory.content)
                )}
                {currentStory.image_url && currentStory.content && (
                  <div className="absolute inset-x-0 bottom-32 flex justify-center px-6 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4 max-w-sm">
                      <p className="text-white text-center text-lg font-medium">{currentStory.content}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Invisible tap zones (mobile) - left 30% prev, right 70% next */}
              <div className="absolute inset-0 z-10 flex md:hidden">
                <div className="w-[30%] h-full" onClick={handlePrevious} />
                <div className="w-[70%] h-full" onClick={handleNext} />
              </div>

              {/* Bottom section */}
              <div className="absolute bottom-0 left-0 right-0 z-20">
                <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-4 px-4">
                  <div className="flex items-center gap-4 mb-3">
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex items-center gap-2">
                      <Heart className={`w-7 h-7 transition-colors ${liked[storyId] ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                      {likeCounts[storyId] > 0 && <span className="text-white text-sm font-medium">{likeCounts[storyId]}</span>}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleCommentToggle} className="flex items-center gap-2">
                      <MessageCircle className="w-7 h-7 text-white" />
                      {comments.length > 0 && <span className="text-white text-sm font-medium">{comments.length}</span>}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => setIsPaused(!isPaused)} className="ml-auto p-2 rounded-full bg-white/10">
                      {isPaused ? <Play className="w-5 h-5 text-white" fill="white" /> : <Pause className="w-5 h-5 text-white" />}
                    </motion.button>
                  </div>

                  {currentUser && !showComments && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text" value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => { if (!commentText.trim()) setIsPaused(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleAddComment(); }}
                        placeholder="Enviar mensaje..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/50 outline-none focus:border-white/40 focus:bg-white/15 transition-colors"
                      />
                      {commentText.trim() && (
                        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }} onClick={handleAddComment} className="p-2.5 bg-cyan-500 rounded-full text-white">
                          <Send className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments drawer */}
              <AnimatePresence>
                {showComments && (
                  <motion.div
                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute inset-x-0 bottom-0 z-40 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10"
                    style={{ maxHeight: '75vh' }}
                  >
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 bg-white/30 rounded-full" />
                    </div>
                    <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                      <h3 className="text-white font-bold text-base">Comentarios</h3>
                      <button onClick={() => setShowComments(false)} className="p-1 text-white/60 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ maxHeight: 'calc(75vh - 140px)' }}>
                      {loadingComments ? (
                        <div className="flex justify-center py-8">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : comments.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                          <p className="text-white/40 text-sm">Aún no hay comentarios</p>
                          <p className="text-white/30 text-xs mt-1">Sé el primero en comentar</p>
                        </div>
                      ) : (
                        comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarImage src={comment.user?.foto_perfil} />
                              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
                                {comment.user?.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-white font-semibold text-sm">{comment.user?.username}</span>
                                <span className="text-white/40 text-xs">{getTimeAgo(comment.created_at)}</span>
                              </div>
                              <p className="text-white/90 text-sm mt-0.5 break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {currentUser && (
                      <div className="px-4 py-3 border-t border-white/10 flex gap-2">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={currentUser?.user_metadata?.avatar_url} />
                          <AvatarFallback className="bg-blue-600 text-white text-xs">{currentUser?.email?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <input ref={inputRef} type="text" value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                          placeholder="Añade un comentario..."
                          className="flex-1 bg-white/10 border border-white/15 rounded-full px-4 py-2 text-white text-sm placeholder-white/40 outline-none focus:border-white/30 transition-colors"
                        />
                        <button onClick={handleAddComment} disabled={!commentText.trim()}
                          className={`text-sm font-bold transition-colors ${commentText.trim() ? 'text-cyan-400' : 'text-white/20'}`}>
                          Enviar
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hold indicator */}
              <AnimatePresence>
                {isHolding && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Pause className="w-16 h-16 text-white/50" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Story counter */}
              <div className="absolute top-16 right-4 z-30">
                <span className="text-white/50 text-xs font-medium bg-black/30 px-2 py-1 rounded-full">
                  {currentStoryIndex + 1}/{currentStories.length}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right preview */}
          <div className="flex-shrink-0 w-[120px] h-[85vh] max-h-[750px] hidden lg:block">
            {renderSidePreview(nextGroup, 'right')}
          </div>

          {/* Right arrow button */}
          {currentGroupIndex < storyGroups.length - 1 ? (
            <button
              onClick={goToNextGroup}
              className="flex-shrink-0 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all hover:scale-110 active:scale-95"
              aria-label="Siguiente historia"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          ) : (
            <div className="w-12 flex-shrink-0" />
          )}
        </div>

        {/* ===== Mobile layout (fullscreen single card) ===== */}
        <div className="md:hidden w-full h-full relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`mobile-${currentGroupIndex}-${currentStoryIndex}`}
              initial={{ opacity: 0, x: direction * 80 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -80 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
            >
              {/* Progress bars */}
              <div className="absolute top-0 left-0 right-0 z-30 px-2 pt-3 safe-top">
                <div className="flex gap-1">
                  {currentStories.map((_, index) => (
                    <div key={index} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{
                          width: index < currentStoryIndex ? '100%' :
                                 index === currentStoryIndex ? `${progress}%` : '0%',
                          transition: index === currentStoryIndex ? 'none' : 'width 0.2s'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* User info */}
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 ring-2 ring-white/50">
                      <AvatarImage src={currentProfile?.foto_perfil} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm">
                        {currentProfile?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-white font-semibold text-sm">{currentProfile?.username}</p>
                      <p className="text-white/60 text-xs">{getTimeAgo(currentStory.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(isPaused || isHolding) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="p-1.5 rounded-full bg-white/20">
                        <Pause className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                    {isVideo && (
                      <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-2 rounded-full bg-black/30 text-white">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={() => navigate('/feed')} className="p-2 rounded-full bg-black/30 text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Story content */}
              <div className="absolute inset-0 flex items-center justify-center">
                {currentStory.image_url ? (
                  isVideo ? (
                    <video ref={videoRef} key={currentStory.image_url} src={currentStory.image_url}
                      className="w-full h-full object-cover" autoPlay loop muted={isMuted} playsInline />
                  ) : (
                    <img key={currentStory.image_url} src={currentStory.image_url} alt="Story" className="w-full h-full object-cover" />
                  )
                ) : (
                  renderTextContent(currentStory.content)
                )}
                {currentStory.image_url && currentStory.content && (
                  <div className="absolute inset-x-0 bottom-32 flex justify-center px-6 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-4 max-w-sm">
                      <p className="text-white text-center text-lg font-medium">{currentStory.content}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile navigation arrows — navigate individual stories */}
              {(currentStoryIndex > 0 || currentGroupIndex > 0) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {(currentStoryIndex < currentStories.length - 1 || currentGroupIndex < storyGroups.length - 1) && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

              {/* Story counter */}
              {currentStories.length > 1 && (
                <div className="absolute top-16 right-3 z-30">
                  <span className="text-white/60 text-[10px] font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {currentStoryIndex + 1}/{currentStories.length}
                  </span>
                </div>
              )}

              {/* Bottom actions */}
              <div className="absolute bottom-0 left-0 right-0 z-20">
                <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-20 pb-4 px-4 safe-bottom">
                  <div className="flex items-center gap-4 mb-3">
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} className="flex items-center gap-2">
                      <Heart className={`w-7 h-7 transition-colors ${liked[storyId] ? 'text-red-500 fill-red-500' : 'text-white'}`} />
                      {likeCounts[storyId] > 0 && <span className="text-white text-sm font-medium">{likeCounts[storyId]}</span>}
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={handleCommentToggle} className="flex items-center gap-2">
                      <MessageCircle className="w-7 h-7 text-white" />
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.85 }} onClick={() => setIsPaused(!isPaused)} className="ml-auto p-2 rounded-full bg-white/10">
                      {isPaused ? <Play className="w-5 h-5 text-white" fill="white" /> : <Pause className="w-5 h-5 text-white" />}
                    </motion.button>
                  </div>

                  {currentUser && !showComments && (
                    <div className="flex items-center gap-2">
                      <input type="text" value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onFocus={() => setIsPaused(true)}
                        onBlur={() => { if (!commentText.trim()) setIsPaused(false); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && commentText.trim()) handleAddComment(); }}
                        placeholder="Enviar mensaje..."
                        className="flex-1 bg-white/10 border border-white/20 rounded-full px-4 py-2.5 text-white text-sm placeholder-white/50 outline-none focus:border-white/40 focus:bg-white/15 transition-colors"
                      />
                      {commentText.trim() && (
                        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }} onClick={handleAddComment} className="p-2.5 bg-cyan-500 rounded-full text-white">
                          <Send className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Hold indicator */}
              <AnimatePresence>
                {isHolding && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <Pause className="w-16 h-16 text-white/50" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

// Helper: time ago in Spanish
function getTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return 'ahora';
  if (diffMin < 60) return `hace ${diffMin}m`;
  if (diffHr < 24) return `hace ${diffHr}h`;
  return `hace ${Math.floor(diffHr / 24)}d`;
}

export default StoryViewerPage;