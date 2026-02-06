import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useStories = (currentUser) => {
  const [stories, setStories] = useState([]);
  const [myStories, setMyStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStories = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      // Obtener TODAS las stories activas (no expiradas) de todos los usuarios
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:profiles!user_id(id, username, foto_perfil)
        `)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Agrupar stories por usuario
      const groupedStories = {};
      storiesData?.forEach(story => {
        const userId = story.user_id;
        if (!groupedStories[userId]) {
          groupedStories[userId] = {
            user: story.user,
            stories: [],
            hasUnseen: false,
            lastStoryTime: null
          };
        }
        
        groupedStories[userId].stories.push(story);
        
        // Verificar si hay stories no vistas
        if (!story.viewed_by?.includes(currentUser.id)) {
          groupedStories[userId].hasUnseen = true;
        }

        // Actualizar tiempo de la última story
        const storyTime = new Date(story.created_at);
        if (!groupedStories[userId].lastStoryTime || storyTime > groupedStories[userId].lastStoryTime) {
          groupedStories[userId].lastStoryTime = storyTime;
        }
      });

      // Convertir a array y ordenar
      const groupedArray = Object.values(groupedStories)
        .sort((a, b) => {
          // Priorizar stories no vistas
          if (a.hasUnseen && !b.hasUnseen) return -1;
          if (!a.hasUnseen && b.hasUnseen) return 1;
          
          // Luego por tiempo de última story
          return b.lastStoryTime - a.lastStoryTime;
        });

      // Separar propias stories
      const myStoriesGroup = groupedArray.find(g => g.user.id === currentUser.id);
      const otherStories = groupedArray.filter(g => g.user.id !== currentUser.id);

      setMyStories(myStoriesGroup?.stories || []);
      setStories(otherStories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      toast({
        variant: "destructive",
        title: "Error al cargar historias"
      });
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, toast]);

  const createStory = async (storyData, mediaFile) => {
    if (!currentUser?.id) return false;

    try {
      let mediaUrl = null;

      // Upload media if provided
      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop().toLowerCase();
        const fileName = `stories/${currentUser.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, mediaFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        mediaUrl = publicUrl;
      }

      // Create story record
      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          user_id: currentUser.id,
          media_url: mediaUrl,
          ...storyData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          views_count: 0,
          viewed_by: []
        });

      if (insertError) throw insertError;

      toast({
        title: "¡Historia publicada!",
        description: "Tu historia estará visible por 24 horas"
      });

      // Refresh stories
      await fetchStories();
      return true;
    } catch (error) {
      console.error('Error creating story:', error);
      toast({
        variant: "destructive",
        title: "Error al crear historia"
      });
      return false;
    }
  };

  const deleteStory = async (storyId) => {
    if (!currentUser?.id) return false;

    try {
      // Solo el propietario puede eliminar
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId)
        .eq('user_id', currentUser.id);

      if (error) throw error;

      toast({ title: "Historia eliminada" });
      await fetchStories();
      return true;
    } catch (error) {
      console.error('Error deleting story:', error);
      toast({
        variant: "destructive",
        title: "Error al eliminar historia"
      });
      return false;
    }
  };

  const markStoryAsViewed = async (storyId) => {
    if (!currentUser?.id) return;

    try {
      // Obtener story actual
      const { data: story } = await supabase
        .from('stories')
        .select('viewed_by, views_count')
        .eq('id', storyId)
        .single();

      if (!story) return;

      const viewedBy = story.viewed_by || [];
      
      // Si ya fue vista por este usuario, no hacer nada
      if (viewedBy.includes(currentUser.id)) return;

      // Actualizar
      await supabase
        .from('stories')
        .update({
          viewed_by: [...viewedBy, currentUser.id],
          views_count: (story.views_count || 0) + 1
        })
        .eq('id', storyId);

    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const likeStory = async (storyId, storyOwnerId) => {
    if (!currentUser?.id) return false;

    try {
      // Verificar si ya le dio like
      const { data: existingLike } = await supabase
        .from('story_likes')
        .select('id')
        .eq('story_id', storyId)
        .eq('user_id', currentUser.id)
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
            story_id: storyId,
            user_id: currentUser.id
          });

        // Enviar notificación si no es propia
        if (storyOwnerId !== currentUser.id) {
          await supabase.from('notifications').insert({
            user_id: storyOwnerId,
            type: 'story_like',
            related_user_id: currentUser.id,
            story_id: storyId,
            read: false
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error toggling story like:', error);
      return false;
    }
  };

  const replyToStory = async (storyId, storyOwnerId, message) => {
    if (!currentUser?.id || !message.trim()) return false;

    try {
      // Enviar como mensaje directo
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: storyOwnerId,
        contenido: `📖 Respondió a tu historia: ${message}`,
        story_id: storyId
      });

      // Enviar notificación
      await supabase.from('notifications').insert({
        user_id: storyOwnerId,
        type: 'story_reply',
        related_user_id: currentUser.id,
        story_id: storyId,
        read: false
      });

      toast({ title: "Respuesta enviada" });
      return true;
    } catch (error) {
      console.error('Error replying to story:', error);
      toast({
        variant: "destructive",
        title: "Error al enviar respuesta"
      });
      return false;
    }
  };

  const getStoriesByUser = async (userId) => {
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
      return data || [];
    } catch (error) {
      console.error('Error fetching user stories:', error);
      return [];
    }
  };

  // Auto-refresh stories
  useEffect(() => {
    fetchStories();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchStories, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStories]);

  return {
    stories,
    myStories,
    loading,
    createStory,
    deleteStory,
    markStoryAsViewed,
    likeStory,
    replyToStory,
    getStoriesByUser,
    refreshStories: fetchStories
  };
};