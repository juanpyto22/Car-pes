import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

export const useLiveStreams = (currentUser) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myStream, setMyStream] = useState(null);
  const subscriptionsRef = useRef([]);

  // ─── Fetch all active live streams ─────────────────────────
  const fetchStreams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false });

      if (error) throw error;

      // Fetch profiles for all streamers
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(s => s.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .in('id', userIds);

        const profileMap = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        const enriched = data.map(s => ({
          ...s,
          user: profileMap[s.user_id] || { id: s.user_id, username: 'Usuario', nombre: 'Usuario' },
        }));
        setStreams(enriched);

        // Check if current user has an active stream
        if (currentUser) {
          const mine = enriched.find(s => s.user_id === currentUser.id);
          setMyStream(mine || null);
        }
      } else {
        setStreams([]);
        setMyStream(null);
      }
    } catch (err) {
      console.error('Error fetching live streams:', err);
      setStreams([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ─── Subscribe to realtime stream changes ──────────────────
  useEffect(() => {
    fetchStreams();

    const channel = supabase
      .channel('live-streams-global')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_streams',
      }, () => {
        fetchStreams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStreams]);

  // ─── Start a live stream ───────────────────────────────────
  const startStream = useCallback(async ({ title, category }) => {
    if (!currentUser) return null;
    try {
      // End any existing stream first
      await supabase
        .from('live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('user_id', currentUser.id)
        .eq('is_live', true);

      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          user_id: currentUser.id,
          title,
          category,
          is_live: true,
          viewer_count: 0,
          like_count: 0,
        })
        .select()
        .single();

      if (error) throw error;
      setMyStream(data);
      return data;
    } catch (err) {
      console.error('Error starting stream:', err);
      return null;
    }
  }, [currentUser]);

  // ─── End a live stream ─────────────────────────────────────
  const endStream = useCallback(async (streamId) => {
    if (!streamId) return;
    try {
      // Remove all viewers
      await supabase
        .from('live_stream_viewers')
        .delete()
        .eq('stream_id', streamId);

      await supabase
        .from('live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('id', streamId);

      setMyStream(null);
    } catch (err) {
      console.error('Error ending stream:', err);
    }
  }, []);

  // ─── Join stream as viewer ─────────────────────────────────
  const joinStream = useCallback(async (streamId) => {
    if (!currentUser || !streamId) return;
    try {
      await supabase
        .from('live_stream_viewers')
        .upsert({ stream_id: streamId, user_id: currentUser.id }, { onConflict: 'stream_id,user_id' });
    } catch (err) {
      console.error('Error joining stream:', err);
    }
  }, [currentUser]);

  // ─── Leave stream as viewer ────────────────────────────────
  const leaveStream = useCallback(async (streamId) => {
    if (!currentUser || !streamId) return;
    try {
      await supabase
        .from('live_stream_viewers')
        .delete()
        .eq('stream_id', streamId)
        .eq('user_id', currentUser.id);
    } catch (err) {
      console.error('Error leaving stream:', err);
    }
  }, [currentUser]);

  // ─── Like a stream ─────────────────────────────────────────
  const likeStream = useCallback(async (streamId) => {
    if (!currentUser || !streamId) return;
    try {
      const { error } = await supabase
        .from('live_stream_likes')
        .insert({ stream_id: streamId, user_id: currentUser.id });

      if (error && error.code === '23505') {
        // Already liked — unlike
        await supabase
          .from('live_stream_likes')
          .delete()
          .eq('stream_id', streamId)
          .eq('user_id', currentUser.id);
      }
    } catch (err) {
      console.error('Error liking stream:', err);
    }
  }, [currentUser]);

  // ─── Check if user liked a stream ──────────────────────────
  const hasLiked = useCallback(async (streamId) => {
    if (!currentUser || !streamId) return false;
    try {
      const { data } = await supabase
        .from('live_stream_likes')
        .select('id')
        .eq('stream_id', streamId)
        .eq('user_id', currentUser.id)
        .single();
      return !!data;
    } catch {
      return false;
    }
  }, [currentUser]);

  // ─── Send chat message ─────────────────────────────────────
  const sendChatMessage = useCallback(async (streamId, message) => {
    if (!currentUser || !streamId || !message.trim()) return;
    try {
      await supabase
        .from('live_chat_messages')
        .insert({
          stream_id: streamId,
          user_id: currentUser.id,
          message: message.trim(),
        });
    } catch (err) {
      console.error('Error sending chat message:', err);
    }
  }, [currentUser]);

  // ─── Get chat messages with realtime subscription ──────────
  const useChatMessages = (streamId) => {
    const [messages, setMessages] = useState([]);
    const [chatLoading, setChatLoading] = useState(true);

    useEffect(() => {
      if (!streamId) return;

      const fetchMessages = async () => {
        try {
          const { data, error } = await supabase
            .from('live_chat_messages')
            .select('*')
            .eq('stream_id', streamId)
            .order('created_at', { ascending: true })
            .limit(100);

          if (error) throw error;

          // Fetch profiles for message authors
          if (data && data.length > 0) {
            const userIds = [...new Set(data.map(m => m.user_id))];
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, nombre, foto_perfil')
              .in('id', userIds);

            const profileMap = {};
            (profiles || []).forEach(p => { profileMap[p.id] = p; });

            setMessages(data.map(m => ({
              ...m,
              user: profileMap[m.user_id] || { id: m.user_id, username: 'Usuario' },
            })));
          } else {
            setMessages([]);
          }
        } catch (err) {
          console.error('Error fetching chat messages:', err);
        } finally {
          setChatLoading(false);
        }
      };

      fetchMessages();

      // Realtime subscription for new messages
      const channel = supabase
        .channel(`live-chat-${streamId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'live_chat_messages',
          filter: `stream_id=eq.${streamId}`,
        }, async (payload) => {
          const newMsg = payload.new;
          // Fetch profile for new message author
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, nombre, foto_perfil')
            .eq('id', newMsg.user_id)
            .single();

          setMessages(prev => [...prev.slice(-200), {
            ...newMsg,
            user: profile || { id: newMsg.user_id, username: 'Usuario' },
          }]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [streamId]);

    return { messages, chatLoading };
  };

  // ─── Subscribe to stream viewer/like count changes ─────────
  const useStreamStats = (streamId) => {
    const [stats, setStats] = useState({ viewer_count: 0, like_count: 0, is_live: true });

    useEffect(() => {
      if (!streamId) return;

      const fetchStats = async () => {
        const { data } = await supabase
          .from('live_streams')
          .select('viewer_count, like_count, is_live')
          .eq('id', streamId)
          .single();
        if (data) setStats(data);
      };

      fetchStats();

      const channel = supabase
        .channel(`stream-stats-${streamId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_streams',
          filter: `id=eq.${streamId}`,
        }, (payload) => {
          const updated = payload.new;
          setStats({
            viewer_count: updated.viewer_count || 0,
            like_count: updated.like_count || 0,
            is_live: updated.is_live,
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [streamId]);

    return stats;
  };

  return {
    streams,
    loading,
    myStream,
    fetchStreams,
    startStream,
    endStream,
    joinStream,
    leaveStream,
    likeStream,
    hasLiked,
    sendChatMessage,
    useChatMessages,
    useStreamStats,
  };
};
