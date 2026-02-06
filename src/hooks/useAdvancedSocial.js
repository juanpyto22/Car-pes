import { useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

export const useAdvancedSocial = (user) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Reaction types with emojis
  const REACTION_TYPES = {
    like: { emoji: '👍', label: 'Me gusta' },
    love: { emoji: '❤️', label: 'Me encanta' },
    wow: { emoji: '😮', label: 'Me asombra' },
    haha: { emoji: '😂', label: 'Me divierte' },
    sad: { emoji: '😢', label: 'Me entristece' },
    angry: { emoji: '😠', label: 'Me enfada' },
    fish: { emoji: '🐟', label: 'Gran pesca' },
    hook: { emoji: '🎣', label: 'Buen spot' }
  };

  // Add/Update reaction to a post
  const addReaction = useCallback(async (postId, reactionType) => {
    if (!user?.id) return false;

    setLoading(true);
    try {
      // Check if user already reacted to this post
      const { data: existingReaction, error: checkError } = await supabase
        .from('post_reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') throw checkError;

      if (existingReaction) {
        // Update existing reaction or remove if same type
        if (existingReaction.reaction_type === reactionType) {
          // Remove reaction
          const { error } = await supabase
            .from('post_reactions')
            .delete()
            .eq('id', existingReaction.id);
          
          if (error) throw error;
          
          toast({ title: "Reacción eliminada" });
        } else {
          // Update reaction type
          const { error } = await supabase
            .from('post_reactions')
            .update({ reaction_type: reactionType })
            .eq('id', existingReaction.id);
          
          if (error) throw error;
          
          toast({ title: `Reacción cambiada a ${REACTION_TYPES[reactionType]?.label}` });
        }
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('post_reactions')
          .insert({
            post_id: postId,
            user_id: user.id,
            reaction_type: reactionType,
            created_at: new Date().toISOString()
          });
        
        if (error) throw error;
        
        toast({ title: `${REACTION_TYPES[reactionType]?.emoji} ${REACTION_TYPES[reactionType]?.label}` });
      }

      return true;
    } catch (error) {
      console.error('Error managing reaction:', error);
      toast({
        variant: "destructive",
        title: "Error al reaccionar"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Share a post
  const sharePost = useCallback(async (postId, shareText = '') => {
    if (!user?.id) return false;

    setLoading(true);
    try {
      // Get original post
      const { data: originalPost, error: postError } = await supabase
        .from('posts')
        .select('*, profiles(nombre, foto_perfil)')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Create share post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          contenido: shareText,
          shared_post_id: postId,
          tipo: 'share',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Update share count on original post
      await supabase.rpc('increment_post_shares', { post_id: postId });

      toast({ title: "Publicación compartida" });
      return true;
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        variant: "destructive",
        title: "Error al compartir"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Report content
  const reportContent = useCallback(async (postId, reason, description = '') => {
    if (!user?.id) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('content_reports')
        .insert({
          post_id: postId,
          reporter_id: user.id,
          reason,
          description,
          status: 'pending',
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({ title: "Contenido reportado", description: "Revisaremos tu reporte pronto" });
      return true;
    } catch (error) {
      console.error('Error reporting content:', error);
      toast({
        variant: "destructive",
        title: "Error al reportar"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Block user
  const blockUser = useCallback(async (blockedUserId) => {
    if (!user?.id || user.id === blockedUserId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: blockedUserId,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      // Also unfollow if following
      await supabase
        .from('follows')
        .delete()
        .or(`follower_id.eq.${user.id},following_id.eq.${user.id}`)
        .or(`follower_id.eq.${blockedUserId},following_id.eq.${blockedUserId}`);

      toast({ title: "Usuario bloqueado" });
      return true;
    } catch (error) {
      console.error('Error blocking user:', error);
      toast({
        variant: "destructive",
        title: "Error al bloquear usuario"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Unblock user
  const unblockUser = useCallback(async (blockedUserId) => {
    if (!user?.id) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_blocks')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', blockedUserId);

      if (error) throw error;

      toast({ title: "Usuario desbloqueado" });
      return true;
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast({
        variant: "destructive",
        title: "Error al desbloquear usuario"
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  // Get blocked users
  const getBlockedUsers = useCallback(async () => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .select('blocked_id, profiles!user_blocks_blocked_id_fkey(id, nombre, foto_perfil)')
        .eq('blocker_id', user.id);

      if (error) throw error;

      return data?.map(block => block.profiles) || [];
    } catch (error) {
      console.error('Error fetching blocked users:', error);
      return [];
    }
  }, [user]);

  // Parse mentions in text
  const parseMentions = useCallback((text) => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push({
        username: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return mentions;
  }, []);

  // Parse hashtags in text
  const parseHashtags = useCallback((text) => {
    const hashtagRegex = /#(\w+)/g;
    const hashtags = [];
    let match;

    while ((match = hashtagRegex.exec(text)) !== null) {
      hashtags.push({
        hashtag: match[1],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    return hashtags;
  }, []);

  // Render text with mentions and hashtags
  const renderEnhancedText = useCallback((text) => {
    if (!text) return text;

    let processedText = text;
    const mentions = parseMentions(text);
    const hashtags = parseHashtags(text);

    // Sort by position (reverse to avoid index shifting)
    const entities = [...mentions.map(m => ({ ...m, type: 'mention' })), ...hashtags.map(h => ({ ...h, type: 'hashtag' }))]
      .sort((a, b) => b.start - a.start);

    entities.forEach(entity => {
      const before = processedText.slice(0, entity.start);
      const after = processedText.slice(entity.end);
      
      if (entity.type === 'mention') {
        processedText = before + `<span class="text-cyan-400 font-medium cursor-pointer hover:underline">@${entity.username}</span>` + after;
      } else if (entity.type === 'hashtag') {
        processedText = before + `<span class="text-blue-400 font-medium cursor-pointer hover:underline">#${entity.hashtag}</span>` + after;
      }
    });

    return processedText;
  }, [parseMentions, parseHashtags]);

  // Search users for mentions
  const searchUsersForMention = useCallback(async (query) => {
    if (!query || query.length < 2) return [];

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre, nombre_usuario, foto_perfil')
        .or(`nombre.ilike.%${query}%, nombre_usuario.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, []);

  // Save hashtag
  const saveHashtag = useCallback(async (hashtag, postId) => {
    try {
      const { error } = await supabase
        .from('post_hashtags')
        .insert({
          post_id: postId,
          hashtag: hashtag.toLowerCase(),
          created_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') throw error; // Ignore duplicate errors
    } catch (error) {
      console.error('Error saving hashtag:', error);
    }
  }, []);

  // Get trending hashtags
  const getTrendingHashtags = useCallback(async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('post_hashtags')
        .select('hashtag')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Count hashtag frequency
      const hashtagCount = {};
      data?.forEach(item => {
        hashtagCount[item.hashtag] = (hashtagCount[item.hashtag] || 0) + 1;
      });

      // Sort by frequency and return top hashtags
      return Object.entries(hashtagCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([hashtag, count]) => ({ hashtag, count }));
    } catch (error) {
      console.error('Error fetching trending hashtags:', error);
      return [];
    }
  }, []);

  return {
    // Reactions
    REACTION_TYPES,
    addReaction,
    
    // Sharing
    sharePost,
    
    // Reporting and Moderation
    reportContent,
    blockUser,
    unblockUser,
    getBlockedUsers,
    
    // Text Enhancement
    parseMentions,
    parseHashtags,
    renderEnhancedText,
    searchUsersForMention,
    
    // Hashtags
    saveHashtag,
    getTrendingHashtags,
    
    // State
    loading
  };
};