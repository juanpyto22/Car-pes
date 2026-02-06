import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Play } from 'lucide-react';
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
      console.log('Fetching stories...');
      
      // Obtener stories (con manejo de errores si la tabla no existe)
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          profiles!user_id(id, username, foto_perfil, nombre)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Stories table error:', error);
        // Si la tabla no existe, mostrar stories simuladas
        setStories([]);
        setMyStories([]);
        setLoading(false);
        return;
      }

      // Agrupar por usuario
      const groupedStories = {};
      storiesData?.forEach(story => {
        const userId = story.user_id;
        if (!groupedStories[userId]) {
          groupedStories[userId] = {
            user: story.user,
            stories: [],
            hasUnseen: false
          };
        }
        groupedStories[userId].stories.push(story);
        
        // Verificar si hay stories no vistas
        if (!story.viewed_by?.includes(user.id)) {
          groupedStories[userId].hasUnseen = true;
        }
      });

      const grouped = Object.values(groupedStories);
      
      // Separar propias stories
      const myStoriesGroup = grouped.find(g => g.user.id === user.id);
      const otherStories = grouped.filter(g => g.user.id !== user.id);
      
      setMyStories(myStoriesGroup?.stories || []);
      setStories(otherStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const StoryCircle = ({ storyGroup, isOwn = false }) => {
    const hasStories = storyGroup?.stories?.length > 0;
    const hasUnseen = storyGroup?.hasUnseen;

    return (
      <Link
        to={hasStories ? `/story/${storyGroup.user.id}` : '/create-story'}
        className="flex-shrink-0"
      >
        <motion.div
          whileTap={{ scale: 0.95 }}
          className="flex flex-col items-center gap-2 p-2"
        >
          <div className={`relative ${
            hasUnseen 
              ? 'ring-4 ring-gradient-to-r from-purple-500 to-pink-500' 
              : hasStories 
                ? 'ring-2 ring-gray-400' 
                : ''
          } rounded-full`}>
            <Avatar className="w-16 h-16 border-2 border-background">
              <AvatarImage 
                src={isOwn ? profile?.foto_perfil : storyGroup?.user?.foto_perfil} 
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white">
                {isOwn 
                  ? profile?.username?.[0]?.toUpperCase() 
                  : storyGroup?.user?.username?.[0]?.toUpperCase()
                }
              </AvatarFallback>
            </Avatar>
            
            {isOwn && !hasStories && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-white" />
              </div>
            )}
            
            {hasStories && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-background">
                <Play className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <span className="text-xs text-center text-blue-200 font-medium max-w-[70px] truncate">
            {isOwn 
              ? (hasStories ? 'Tu Story' : 'Tu Story')
              : storyGroup?.user?.username
            }
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
    <div className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm border-y border-white/5">
      <div className="flex gap-2 px-4 py-4 overflow-x-auto scrollbar-hide">
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
          <div className="flex-1 text-center py-8">
            <p className="text-blue-400 text-sm">
              ¡Sé el primero en compartir una historia!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoriesBar;