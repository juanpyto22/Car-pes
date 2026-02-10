import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const StoriesBar = () => {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStories();
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

      // Agrupar por usuario
      const groupedStories = {};
      (storiesData || []).forEach(story => {
        const uid = story.user_id;
        if (!groupedStories[uid]) {
          groupedStories[uid] = {
            user: profilesMap[uid] || { id: uid, username: 'usuario' },
            stories: [],
            hasUnseen: false
          };
        }
        groupedStories[uid].stories.push(story);
      });

      const grouped = Object.values(groupedStories);
      
      // Separar propias stories
      const myStoriesGroup = grouped.find(g => g.user?.id === user.id);
      const otherStories = grouped.filter(g => g.user?.id !== user.id);
      
      setMyStories(myStoriesGroup?.stories || []);
      setStories(otherStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      setStories([]);
      setMyStories([]);
    } finally {
      setLoading(false);
    }
  };

  const StoryCircle = ({ storyGroup, isOwn = false }) => {
    const hasStories = storyGroup?.stories?.length > 0;

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
                    : ''
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
              ? 'bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600' 
              : ''
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
        </motion.div>
      </Link>
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