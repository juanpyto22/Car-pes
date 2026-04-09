import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';

const StoriesBar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
  }, [user]);

  useEffect(() => {
    const handleStoriesUpdated = () => {
      fetchStories();
    };

    window.addEventListener('stories:updated', handleStoriesUpdated);
    return () => window.removeEventListener('stories:updated', handleStoriesUpdated);
  }, [user]);

  const fetchStories = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    try {
      // Primero obtener los IDs de usuarios que sigue
      const { data: followsData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id);

      const followingIds = followsData?.map(f => f.following_id) || [];
      const userIds = [...followingIds, user.id];

      // Obtener historias de usuarios que sigue + las propias
      let { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .in('user_id', userIds)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error || !storiesData) {
        console.error('Stories table error:', error);
        setStories([]);
        setMyStories([]);
        setLoading(false);
        return;
      }

      // Obtener datos de perfiles para los usuarios
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      const profilesMap = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = p;
      });

      // Agrupar por usuario y calcular si hay historias no vistas
      const groupedStories = {};
      (storiesData || []).forEach(story => {
        const uid = story.user_id;
        if (!groupedStories[uid]) {
          groupedStories[uid] = {
            user: profilesMap[uid] || { id: uid, username: 'usuario' },
            stories: [],
            hasUnseen: false,
            lastStoryTime: null,
          };
        }
        groupedStories[uid].stories.push(story);

        const viewedBy = story.viewed_by || [];
        if (!viewedBy.includes(user.id)) {
          groupedStories[uid].hasUnseen = true;
        }

        const storyTime = new Date(story.created_at);
        if (!groupedStories[uid].lastStoryTime || storyTime > groupedStories[uid].lastStoryTime) {
          groupedStories[uid].lastStoryTime = storyTime;
        }
      });

      const grouped = Object.values(groupedStories).sort((a, b) => {
        // 1) no vistas primero
        if (a.hasUnseen && !b.hasUnseen) return -1;
        if (!a.hasUnseen && b.hasUnseen) return 1;

        // 2) entre no vistas: más recientes primero
        if (a.hasUnseen && b.hasUnseen) {
          return (b.lastStoryTime?.getTime?.() || 0) - (a.lastStoryTime?.getTime?.() || 0);
        }

        // 3) entre vistas: más antiguas primero (quedan atrás)
        return (a.lastStoryTime?.getTime?.() || 0) - (b.lastStoryTime?.getTime?.() || 0);
      });
      
      // Separar propias stories
      const myStoriesGroup = grouped.find(g => g.user?.id === user.id);
      const otherStories = grouped.filter(g => g.user?.id !== user.id);
      
      setMyStories(myStoriesGroup?.stories || []);
      setStories(otherStories);

      // Directos activos de usuarios seguidos
      if (followingIds.length > 0) {
        const { data: liveData } = await supabase
          .from('live_streams')
          .select('id, user_id, title, is_live, started_at')
          .in('user_id', followingIds)
          .eq('is_live', true)
          .order('started_at', { ascending: false });

        const liveUserIds = [...new Set((liveData || []).map(l => l.user_id))];
        let liveProfilesMap = {};

        if (liveUserIds.length > 0) {
          const { data: liveProfiles } = await supabase
            .from('profiles')
            .select('id, username, foto_perfil')
            .in('id', liveUserIds);

          liveProfilesMap = (liveProfiles || []).reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }

        const groupedLive = {};
        (liveData || []).forEach((stream) => {
          if (!groupedLive[stream.user_id]) {
            groupedLive[stream.user_id] = {
              ...stream,
              user: liveProfilesMap[stream.user_id],
            };
          }
        });

        setLiveStreams(Object.values(groupedLive));
      } else {
        setLiveStreams([]);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
      setMyStories([]);
      setLiveStreams([]);
    } finally {
      setLoading(false);
    }
  };

  const StoryCircle = ({ storyGroup, isOwn = false }) => {
    const hasStories = storyGroup?.stories?.length > 0;
    const isViewed = !storyGroup?.hasUnseen;

    // For own stories: tapping the avatar opens stories (if any), tapping "+" creates new
    // For other users: tapping opens their stories
    if (isOwn) {
      return (
        <div className="flex-shrink-0">
          <motion.div
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-1.5 px-1.5 py-2"
          >
            <div className="relative">
              <Link to={hasStories ? `/story/${storyGroup.user.id}` : '/camera'}>
                <div className={`rounded-full p-[2.5px] ${
                  hasStories
                    ? 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600'
                    : 'bg-slate-700'
                }`}>
                  <div className="bg-slate-950 rounded-full p-[2px]">
                    <Avatar className="w-16 h-16 md:w-[68px] md:h-[68px]">
                      <AvatarImage 
                        src={profile?.foto_perfil} 
                        className="object-cover"
                      />
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-lg">
                        {profile?.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </Link>
              
              {/* Always show "+" button to add more stories */}
              <Link to="/camera">
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-slate-950 hover:bg-blue-400 transition-colors z-10">
                  <Plus className="w-3.5 h-3.5 text-white" />
                </div>
              </Link>
            </div>
            
            <span className="text-[11px] text-center text-gray-300 max-w-[72px] truncate leading-tight">
              Tu historia
            </span>
          </motion.div>
        </div>
      );
    }

    return (
      <Link
        to={`/story/${storyGroup.user.id}`}
        className="flex-shrink-0"
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-1.5 px-1.5 py-2"
        >
          <div className={`relative rounded-full p-[2.5px] ${
            hasStories
              ? (isViewed ? 'bg-slate-700' : 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600')
              : 'bg-slate-700'
          }`}>
            <div className="bg-slate-950 rounded-full p-[2px]">
              <Avatar className="w-16 h-16 md:w-[68px] md:h-[68px]">
                <AvatarImage 
                  src={storyGroup?.user?.foto_perfil} 
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-lg">
                  {storyGroup?.user?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          <span className="text-[11px] text-center text-gray-300 max-w-[72px] truncate leading-tight">
            {storyGroup?.user?.username}
          </span>

          {hasStories && isViewed && (
            <span className="text-[10px] text-slate-400 leading-none">Visto</span>
          )}
        </motion.div>
      </Link>
    );
  };

  const LiveCircle = ({ stream }) => {
    if (!stream?.user) return null;

    return (
      <button
        type="button"
        onClick={() => navigate('/live')}
        className="flex-shrink-0"
        title={stream.title || 'Directo en vivo'}
      >
        <motion.div whileTap={{ scale: 0.95 }} className="flex flex-col items-center gap-1.5 px-1.5 py-2">
          <div className="relative rounded-full p-[2.5px] bg-gradient-to-br from-red-500 to-rose-700">
            <div className="bg-slate-950 rounded-full p-[2px]">
              <Avatar className="w-16 h-16 md:w-[68px] md:h-[68px]">
                <AvatarImage src={stream.user.foto_perfil} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-red-700 to-rose-900 text-white text-lg">
                  {stream.user.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-red-400/40 inline-flex items-center gap-1">
              <Radio className="w-2.5 h-2.5" /> EN VIVO
            </div>
          </div>

          <span className="text-[11px] text-center text-red-300 max-w-[72px] truncate leading-tight">
            {stream.user.username}
          </span>
        </motion.div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex gap-4 px-4 py-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 animate-pulse">
            <div className="w-16 h-16 bg-slate-700 rounded-full mb-2"></div>
            <div className="w-12 h-3 bg-slate-700 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative bg-transparent border-b border-white/5 mb-2">
      <div className="flex gap-0 px-3 py-2 overflow-x-auto scrollbar-hide">
        {/* Mi story */}
        <StoryCircle 
          storyGroup={{ user: { id: user?.id }, stories: myStories }} 
          isOwn={true} 
        />

        {/* Directos en vivo de usuarios seguidos */}
        {liveStreams.map((stream) => (
          <LiveCircle key={`live-${stream.id}`} stream={stream} />
        ))}
        
        {/* Stories de otros usuarios */}
        {stories.map((storyGroup) => (
          <StoryCircle key={storyGroup.user.id} storyGroup={storyGroup} />
        ))}
        
        {stories.length === 0 && myStories.length === 0 && (
          <div className="flex items-center justify-center px-4">
            <p className="text-blue-400/60 text-sm whitespace-nowrap">
              ¡Sé el primero en compartir una historia!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;