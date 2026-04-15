import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Radio, Video, VideoOff, Mic, MicOff, Heart, MessageCircle, Send, Eye, Clock, ChevronLeft, Camera, X, Sparkles, Monitor, Wifi, WifiOff, Loader2, Gift, Fish, Shield } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBroadcaster } from '@/hooks/useWebRTC';

const CATEGORIES = ['Todos', 'Carpas', 'Spinning', 'Tutoriales', 'Siluros', 'Trucha', 'Black Bass', 'Mar', 'General'];
const FRAME_MSG_PREFIX = '__frame__:';
const LIKE_MSG_PREFIX = '__like__:';
const GIFT_OPTIONS = [
  { id: 'fish_rose', label: 'Pez Rosa', value: 10, icon: 'fish' },
  { id: 'fish_gold', label: 'Pez Dorado', value: 50, icon: 'fish' },
  { id: 'fishing_rod', label: 'Cana Pro', value: 120, icon: 'rod' },
];

const useSmoothCounter = (target, duration = 260) => {
  const [value, setValue] = useState(Math.max(0, Number(target) || 0));
  const rafRef = useRef(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    const nextTarget = Math.max(0, Number(target) || 0);
    const startValue = valueRef.current;
    const delta = nextTarget - startValue;

    if (delta === 0) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const startAt = performance.now();

    const tick = (now) => {
      const progress = Math.min(1, (now - startAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (delta * eased));
      setValue(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, duration]);

  return value;
};

// ═══════════════════════════════════════════════════════════════
// Helper: direct Supabase operations (avoids hook-in-callback issues)
// ═══════════════════════════════════════════════════════════════

const streamOps = {
  async fetchAll() {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .select('*')
        .eq('is_live', true)
        .order('viewer_count', { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const streamIds = data.map((s) => s.id);
      const userIds = [...new Set(data.map(s => s.user_id))];

      let viewersCountMap = {};
      let likesCountMap = {};

      if (streamIds.length > 0) {
        const [{ data: viewersRows }, { data: likesRows }] = await Promise.all([
          supabase
            .from('live_stream_viewers')
            .select('stream_id')
            .in('stream_id', streamIds),
          supabase
            .from('live_stream_likes')
            .select('stream_id')
            .in('stream_id', streamIds),
        ]);

        viewersCountMap = (viewersRows || []).reduce((acc, row) => {
          acc[row.stream_id] = (acc[row.stream_id] || 0) + 1;
          return acc;
        }, {});

        likesCountMap = (likesRows || []).reduce((acc, row) => {
          acc[row.stream_id] = (acc[row.stream_id] || 0) + 1;
          return acc;
        }, {});
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .in('id', userIds);

      const pMap = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });

      return data.map(s => ({
        ...s,
        viewer_count: viewersCountMap[s.id] ?? s.viewer_count ?? 0,
        like_count: likesCountMap[s.id] ?? s.like_count ?? 0,
        user: pMap[s.user_id] || { id: s.user_id, username: 'Usuario' },
      }));
    } catch (err) {
      console.error('Error fetching streams:', err);
      return [];
    }
  },

  async start(userId, title, category) {
    try {
      // End any previous stream
      await supabase
        .from('live_streams')
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_live', true);

      const { data, error } = await supabase
        .from('live_streams')
        .insert({ user_id: userId, title, category, is_live: true, viewer_count: 0, like_count: 0 })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error starting stream:', err);
      return null;
    }
  },

  async end(streamId) {
    try {
      await supabase.from('live_stream_viewers').delete().eq('stream_id', streamId);
      await supabase.from('live_stream_likes').delete().eq('stream_id', streamId);
      await supabase.from('live_chat_messages').delete().eq('stream_id', streamId);
      await supabase.from('live_stream_gifts').delete().eq('stream_id', streamId);
      await supabase.from('live_streams').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', streamId);
    } catch (err) {
      console.error('Error ending stream:', err);
    }
  },

  async join(streamId, userId) {
    try {
      const { data: banData, error: banError } = await supabase
        .from('live_stream_bans')
        .select('stream_id')
        .eq('stream_id', streamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (!banError && banData) {
        return { ok: false, banned: true };
      }

      if (banError && banError.code !== '42P01') {
        console.error('Error checking stream bans:', banError);
      }

      await supabase.from('live_stream_viewers').upsert(
        { stream_id: streamId, user_id: userId },
        { onConflict: 'stream_id,user_id' }
      );

      const { count: viewerCount } = await supabase
        .from('live_stream_viewers')
        .select('id', { count: 'exact', head: true })
        .eq('stream_id', streamId);

      await supabase
        .from('live_streams')
        .update({ viewer_count: viewerCount || 0 })
        .eq('id', streamId);

      return { ok: true, banned: false };
    } catch (err) {
      console.error('Error joining:', err);
      return { ok: false, banned: false, error: err };
    }
  },

  async leave(streamId, userId) {
    try {
      await supabase.from('live_stream_viewers').delete().eq('stream_id', streamId).eq('user_id', userId);

      const { count: viewerCount } = await supabase
        .from('live_stream_viewers')
        .select('id', { count: 'exact', head: true })
        .eq('stream_id', streamId);

      await supabase
        .from('live_streams')
        .update({ viewer_count: viewerCount || 0 })
        .eq('id', streamId);
    } catch (err) { console.error('Error leaving:', err); }
  },

  async like(streamId, userId) {
    try {
      // Register one like event per tap so every tap is counted.
      await supabase.from('live_chat_messages').insert({
        stream_id: streamId,
        user_id: userId,
        message: `${LIKE_MSG_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });

      // Keep cumulative likes and avoid lost updates under concurrent taps.
      let incremented = false;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data: streamRow, error: readError } = await supabase
          .from('live_streams')
          .select('like_count')
          .eq('id', streamId)
          .single();

        if (readError) throw readError;

        const currentLikeCount = streamRow?.like_count || 0;
        const { data: updatedRow, error: updateError } = await supabase
          .from('live_streams')
          .update({ like_count: currentLikeCount + 1 })
          .eq('id', streamId)
          .eq('like_count', currentLikeCount)
          .select('id')
          .maybeSingle();

        if (updateError) throw updateError;
        if (updatedRow) {
          incremented = true;
          break;
        }
      }

      if (!incremented) {
        // Final fallback so one tap still tries to add one like.
        const { data: latestRow } = await supabase
          .from('live_streams')
          .select('like_count')
          .eq('id', streamId)
          .single();

        await supabase
          .from('live_streams')
          .update({ like_count: (latestRow?.like_count || 0) + 1 })
          .eq('id', streamId);
      }
    } catch (err) { console.error('Error liking:', err); }
  },

  async sendChat(streamId, userId, message) {
    try {
      await supabase.from('live_chat_messages').insert({ stream_id: streamId, user_id: userId, message });
    } catch (err) { console.error('Error sending chat:', err); }
  },

  async isMuted(streamId, userId) {
    try {
      const { data, error } = await supabase
        .from('live_stream_mutes')
        .select('id')
        .eq('stream_id', streamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') return false;
        throw error;
      }

      return !!data;
    } catch (err) {
      console.error('Error checking muted state:', err);
      return false;
    }
  },

  async isModerator(streamId, userId) {
    try {
      const { data, error } = await supabase
        .from('live_stream_moderators')
        .select('id')
        .eq('stream_id', streamId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01') return false;
        throw error;
      }

      return !!data;
    } catch (err) {
      console.error('Error checking moderator state:', err);
      return false;
    }
  },

  async sendGift(streamId, senderId, gift) {
    try {
      const { error } = await supabase.from('live_stream_gifts').insert({
        stream_id: streamId,
        sender_id: senderId,
        gift_type: gift.id,
        gift_name: gift.label,
        value: gift.value,
      });

      if (error) {
        if (error.code === '42P01') return { ok: false, missingTable: true };
        throw error;
      }

      return { ok: true, missingTable: false };
    } catch (err) {
      console.error('Error sending gift:', err);
      return { ok: false, missingTable: false };
    }
  },

  async fetchGifts(streamId) {
    try {
      const { data, error } = await supabase
        .from('live_stream_gifts')
        .select('id, sender_id, gift_name, value, created_at')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      const senderIds = [...new Set((data || []).map((gift) => gift.sender_id).filter(Boolean))];
      let profilesMap = {};

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .in('id', senderIds);

        profilesMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      return (data || []).map((gift) => ({
        ...gift,
        sender: profilesMap[gift.sender_id] || { id: gift.sender_id, username: 'usuario' },
      }));
    } catch (err) {
      console.error('Error fetching gifts:', err);
      return [];
    }
  },

  async fetchGiftRanking(streamId) {
    try {
      const { data, error } = await supabase
        .from('live_stream_gifts')
        .select('sender_id, value')
        .eq('stream_id', streamId);

      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }

      // Aggregate by sender
      const ranking = {};
      (data || []).forEach((gift) => {
        if (!ranking[gift.sender_id]) {
          ranking[gift.sender_id] = 0;
        }
        ranking[gift.sender_id] += gift.value || 0;
      });

      // Sort by value descending and get top 5
      const sorted = Object.entries(ranking)
        .map(([senderId, totalValue]) => ({ senderId, totalValue }))
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 5);

      // Fetch sender profiles
      const senderIds = sorted.map(r => r.senderId);
      let profilesMap = {};

      if (senderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .in('id', senderIds);

        profilesMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }

      return sorted.map((r) => ({
        ...r,
        sender: profilesMap[r.senderId] || { id: r.senderId, username: 'usuario' },
      }));
    } catch (err) {
      console.error('Error fetching gift ranking:', err);
      return [];
    }
  },

  async fetchChat(streamId) {
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('*')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const chatRows = data.filter((m) => {
        const text = m.message || '';
        return !text.startsWith(FRAME_MSG_PREFIX) && !text.startsWith(LIKE_MSG_PREFIX);
      });
      if (chatRows.length === 0) return [];

      const userIds = [...new Set(chatRows.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .in('id', userIds);

      const pMap = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });

      return chatRows.map(m => ({ ...m, user: pMap[m.user_id] || { id: m.user_id, username: 'Usuario' } }));
    } catch (err) {
      console.error('Error fetching chat:', err);
      return [];
    }
  },

  async fetchLatestFrame(streamId) {
    try {
      const { data, error } = await supabase
        .from('live_chat_messages')
        .select('message, created_at')
        .eq('stream_id', streamId)
        .like('message', `${FRAME_MSG_PREFIX}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const raw = data?.message || '';
      if (!raw.startsWith(FRAME_MSG_PREFIX)) return null;
      return raw.slice(FRAME_MSG_PREFIX.length);
    } catch (err) {
      console.error('Error fetching frame fallback:', err);
      return null;
    }
  },

  async getStats(streamId) {
    try {
      const { data } = await supabase
        .from('live_streams')
        .select('viewer_count, like_count, is_live')
        .eq('id', streamId)
        .single();
      return data || { viewer_count: 0, like_count: 0, is_live: false };
    } catch { return { viewer_count: 0, like_count: 0, is_live: false }; }
  },
};

// ═══════════════════════════════════════════════════════════════
// Reusable hook: realtime chat for a stream
// ═══════════════════════════════════════════════════════════════
const useRealtimeChat = (streamId) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!streamId) return;
    let mounted = true;

    setMessages([]);

    const refreshChat = async () => {
      const msgs = await streamOps.fetchChat(streamId);
      if (!mounted) return;
      setMessages((prev) => {
        const prevLast = prev[prev.length - 1]?.id;
        const nextLast = msgs[msgs.length - 1]?.id;
        if (prev.length === msgs.length && prevLast === nextLast) return prev;
        return msgs;
      });
    };

    refreshChat();

    const channel = supabase
      .channel(`chat-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`,
      }, async (payload) => {
        const msg = payload.new;
        if ((msg.message || '').startsWith(FRAME_MSG_PREFIX) || (msg.message || '').startsWith(LIKE_MSG_PREFIX)) return;
        const { data: profile } = await supabase
          .from('profiles').select('id, username, nombre, foto_perfil').eq('id', msg.user_id).single();
        if (mounted) {
          setMessages(prev => [...prev.slice(-200), { ...msg, user: profile || { id: msg.user_id, username: 'Usuario' } }]);
        }
      })
      .subscribe();

    const pollId = setInterval(() => {
      refreshChat();
    }, 1800);

    return () => {
      mounted = false;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return messages;
};

// ═══════════════════════════════════════════════════════════════
// Reusable hook: realtime stats for a stream
// ═══════════════════════════════════════════════════════════════
const useRealtimeStats = (streamId) => {
  const [stats, setStats] = useState({ viewer_count: 0, like_count: 0, is_live: true });

  useEffect(() => {
    if (!streamId) return;
    let mounted = true;

    const refreshStats = async () => {
      const [streamStats, viewersResult, likesResult] = await Promise.all([
        streamOps.getStats(streamId),
        supabase
          .from('live_stream_viewers')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', streamId),
        supabase
          .from('live_chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('stream_id', streamId)
          .like('message', `${LIKE_MSG_PREFIX}%`),
      ]);

      if (!mounted) return;
      setStats({
        viewer_count: viewersResult.count ?? streamStats.viewer_count ?? 0,
        like_count: streamStats.like_count ?? likesResult.count ?? 0,
        is_live: streamStats.is_live,
      });
    };

    refreshStats();

    const channel = supabase
      .channel(`stats-${streamId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'live_streams',
        filter: `id=eq.${streamId}`,
      }, (payload) => {
        if (mounted) {
          const u = payload.new;
          setStats({ viewer_count: u.viewer_count || 0, like_count: u.like_count || 0, is_live: u.is_live });
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_stream_viewers',
        filter: `stream_id=eq.${streamId}`,
      }, () => {
        refreshStats();
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'live_stream_likes',
        filter: `stream_id=eq.${streamId}`,
      }, () => {
        refreshStats();
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`,
      }, () => {
        refreshStats();
      })
      .subscribe();

    const pollId = setInterval(() => {
      refreshStats();
    }, 1500);

    return () => {
      mounted = false;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  return stats;
};

// ═══════════════════════════════════════════════════════════════
// Stream Card
// ═══════════════════════════════════════════════════════════════
const StreamCard = ({ stream, onClick }) => {
  const timeSince = stream.started_at
    ? formatDistanceToNow(new Date(stream.started_at), { locale: es, addSuffix: false })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(stream)}
      className="cursor-pointer group"
    >
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/80 border border-white/5 hover:border-cyan-500/20 transition-all">
        <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-blue-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
          <div className="text-center">
            <Radio className="w-10 h-10 text-red-500 animate-pulse mx-auto" />
            <p className="text-xs text-blue-400/60 mt-2">En directo</p>
          </div>
          <div className="absolute top-3 left-3 z-20">
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              EN VIVO
            </span>
          </div>
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
            <Eye className="w-3 h-3" /> {stream.viewer_count || 0}
          </div>
          {timeSince && (
            <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" /> {timeSince}
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="flex items-start gap-2.5">
            <Avatar className="w-9 h-9 border border-white/10 shrink-0">
              <AvatarImage src={stream.user?.foto_perfil} />
              <AvatarFallback className="bg-blue-900 text-cyan-200 text-xs font-bold">
                {stream.user?.username?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">{stream.title}</h3>
              <p className="text-xs text-blue-300/70 truncate">{stream.user?.username || 'Usuario'}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full">{stream.category || 'General'}</span>
                <span className="text-[10px] text-blue-400/50 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5" /> {stream.like_count || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Chat Message
// ═══════════════════════════════════════════════════════════════
const ChatMessage = ({ message }) => {
  const colors = ['text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-orange-400'];
  const name = message.user?.username || 'Usuario';
  const color = colors[name.length % colors.length];
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 py-1">
      <span className={`text-xs font-bold ${color} shrink-0`}>{name}</span>
      <span className="text-xs text-gray-300 break-words">{message.message}</span>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Floating Heart
// ═══════════════════════════════════════════════════════════════
const FloatingHeart = ({ id, onComplete }) => (
  <motion.div
    initial={{ opacity: 1, y: 0, scale: 0.5 }}
    animate={{ opacity: 0, y: -120, scale: 1.2, x: Math.random() * 40 - 20 }}
    transition={{ duration: 1.5, ease: 'easeOut' }}
    onAnimationComplete={() => onComplete(id)}
    className="absolute bottom-20 right-6 pointer-events-none z-30"
  >
    <Heart className="w-6 h-6 text-red-500 fill-red-500" />
  </motion.div>
);

const FishGiftAnimation = ({ id, onComplete, label, value }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.15, x: 0, y: 150 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0.15, 1.15, 1.25, 0.75],
      x: [0, -140, 130, 0],
      y: [150, -180, 10, 190],
      rotate: [0, -24, 20, 0],
    }}
    transition={{ duration: 2.05, times: [0, 0.28, 0.6, 1], ease: 'easeInOut' }}
    onAnimationComplete={() => onComplete(id)}
    className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
  >
    <div className="relative flex flex-col items-center">
      {[
        { x: -70, y: -35, delay: 0.03 },
        { x: 72, y: -28, delay: 0.08 },
        { x: -50, y: 48, delay: 0.12 },
        { x: 58, y: 54, delay: 0.16 },
      ].map((particle, index) => (
        <motion.span
          key={`${id}-spark-${index}`}
          initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.2, 1, 0.3],
            x: [0, particle.x, particle.x * 1.15],
            y: [0, particle.y, particle.y * 1.1],
          }}
          transition={{ duration: 1.15, delay: particle.delay, ease: 'easeOut' }}
          className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]"
        />
      ))}
      <motion.div
        initial={{ opacity: 0.2, scale: 0.5 }}
        animate={{ opacity: [0.1, 0.85, 0], scale: [0.45, 1.45, 1.9] }}
        transition={{ duration: 2.05, times: [0, 0.35, 1], ease: 'easeOut' }}
        className="absolute inset-0 -z-10 rounded-full bg-cyan-400/20 blur-2xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.6, y: 16 }}
        animate={{ opacity: [0, 1, 0], scale: [0.55, 1.05, 1.15], y: [16, 0, -16] }}
        transition={{ duration: 2.05, times: [0, 0.25, 1], ease: 'easeOut' }}
        className="absolute -bottom-8 left-1/2 h-6 w-24 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-xl"
      />
      <motion.div
        initial={{ scale: 0.75, rotate: -10 }}
        animate={{ scale: [0.75, 1.12, 1, 1.06], rotate: [-10, 10, -6, 0] }}
        transition={{ duration: 2.05, times: [0, 0.22, 0.55, 1], ease: 'easeOut' }}
      >
        <Fish className="w-18 h-18 md:w-24 md:h-24 text-amber-300 drop-shadow-[0_0_26px_rgba(251,191,36,0.9)] fill-current" />
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 0], scale: [0.75, 1.1, 0.85], y: [0, -2, -12] }}
        transition={{ duration: 2.05, times: [0, 0.3, 1], ease: 'easeOut' }}
        className="mt-2 rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-bold text-cyan-100 backdrop-blur-md border border-cyan-300/30 shadow-lg shadow-cyan-500/10"
      >
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-300" />
          {label}
          <span className="text-cyan-300">{value} pts</span>
        </span>
      </motion.div>
    </div>
  </motion.div>
);

// ═══════════════════════════════════════════════════════════════
// Stream Viewer (watching someone else's stream)
// ═══════════════════════════════════════════════════════════════
const StreamViewer = ({ stream, onBack }) => {
  const { user } = useAuth();
  const chatMessages = useRealtimeChat(stream.id);
  const stats = useRealtimeStats(stream.id);
  const [newMessage, setNewMessage] = useState('');
  const [hearts, setHearts] = useState([]);
  const [liked, setLiked] = useState(false);
  const [wasKicked, setWasKicked] = useState(false);
  const [canMonitorMembership, setCanMonitorMembership] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [showGiftPicker, setShowGiftPicker] = useState(false);
  const [gifts, setGifts] = useState([]);
  const [missingGiftTable, setMissingGiftTable] = useState(false);
  const [giftRanking, setGiftRanking] = useState([]);
  const [fishGiftAnimations, setFishGiftAnimations] = useState([]);
  const [mobileChatExpanded, setMobileChatExpanded] = useState(true);
  const chatRefDesktop = useRef(null);
  const chatRefMobile = useRef(null);
  const heartId = useRef(0);
  const prevGiftIdsRef = useRef(new Set());
  const prevChatIdsRef = useRef(new Set());
  const chatAnimationHydratedRef = useRef(false);
  const [dbFallbackFrame, setDbFallbackFrame] = useState(null);
  const [lastFrameAt, setLastFrameAt] = useState(0);
  const [frameStatus, setFrameStatus] = useState('waiting');
  const smoothViewerCount = useSmoothCounter(stats.viewer_count);
  const smoothLikeCount = useSmoothCounter(stats.like_count);
  const prevViewerCountRef = useRef(stats.viewer_count || 0);
  const prevLikeCountRef = useRef(stats.like_count || 0);
  const viewerPulseTimeoutRef = useRef(null);
  const likePulseTimeoutRef = useRef(null);
  const [viewerPulseLevel, setViewerPulseLevel] = useState('idle'); // idle | small | medium | big
  const [likePulseLevel, setLikePulseLevel] = useState('idle'); // idle | small | medium | big
  const [viewerPulseKey, setViewerPulseKey] = useState(0);
  const [likePulseKey, setLikePulseKey] = useState(0);

  useEffect(() => {
    prevGiftIdsRef.current = new Set();
    setFishGiftAnimations([]);
    prevChatIdsRef.current = new Set();
    chatAnimationHydratedRef.current = false;
  }, [stream?.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const previous = prevViewerCountRef.current;
    const current = stats.viewer_count || 0;
    const delta = current - previous;

    if (delta > 0) {
      const level = delta >= 5 ? 'big' : delta >= 2 ? 'medium' : 'small';
      setViewerPulseLevel(level);
      setViewerPulseKey((prev) => prev + 1);
      if (viewerPulseTimeoutRef.current) clearTimeout(viewerPulseTimeoutRef.current);
      viewerPulseTimeoutRef.current = setTimeout(() => {
        setViewerPulseLevel('idle');
      }, level === 'big' ? 820 : level === 'medium' ? 620 : 420);
    }

    prevViewerCountRef.current = current;
  }, [stats.viewer_count]);

  useEffect(() => {
    const previous = prevLikeCountRef.current;
    const current = stats.like_count || 0;
    const delta = current - previous;

    if (delta > 0) {
      const level = delta >= 5 ? 'big' : delta >= 2 ? 'medium' : 'small';
      setLikePulseLevel(level);
      setLikePulseKey((prev) => prev + 1);
      if (likePulseTimeoutRef.current) clearTimeout(likePulseTimeoutRef.current);
      likePulseTimeoutRef.current = setTimeout(() => {
        setLikePulseLevel('idle');
      }, level === 'big' ? 840 : level === 'medium' ? 640 : 440);
    }

    prevLikeCountRef.current = current;
  }, [stats.like_count]);

  useEffect(() => {
    return () => {
      if (viewerPulseTimeoutRef.current) clearTimeout(viewerPulseTimeoutRef.current);
      if (likePulseTimeoutRef.current) clearTimeout(likePulseTimeoutRef.current);
    };
  }, []);

  // Join/leave as viewer
  useEffect(() => {
    if (!user?.id || !stream?.id) return;

    let active = true;

    const joinAsViewer = async () => {
      const result = await streamOps.join(stream.id, user.id);
      if (!active) return;

      if (result?.banned) {
        setWasKicked(true);
        setCanMonitorMembership(false);
        return;
      }

      if (result?.ok) {
        setCanMonitorMembership(true);
      }
    };

    joinAsViewer();

    return () => {
      active = false;
      setCanMonitorMembership(false);
      if (user?.id) streamOps.leave(stream.id, user.id);
    };
  }, [stream?.id, user?.id]);

  // If the host removes this viewer from live_stream_viewers, force-exit the stream.
  useEffect(() => {
    if (!user?.id || !stream?.id || !canMonitorMembership) return;
    let active = true;

    const verifyMembership = async () => {
      const { data } = await supabase
        .from('live_stream_viewers')
        .select('id')
        .eq('stream_id', stream.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (active && !data && stats.is_live) {
        setWasKicked(true);
        setCanMonitorMembership(false);
      }
    };

    verifyMembership();

    const viewerChannel = supabase
      .channel(`viewer-membership-${stream.id}-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_stream_viewers',
        filter: `stream_id=eq.${stream.id}`,
      }, () => {
        verifyMembership();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(viewerChannel);
    };
  }, [stream?.id, user?.id, stats.is_live, canMonitorMembership]);

  useEffect(() => {
    if (!wasKicked) return;
    const t = setTimeout(() => onBack(), 1800);
    return () => clearTimeout(t);
  }, [wasKicked, onBack]);

  useEffect(() => {
    if (!user?.id || !stream?.id) return;
    let active = true;

    const hydrateModerationState = async () => {
      const [muted, moderator] = await Promise.all([
        streamOps.isMuted(stream.id, user.id),
        streamOps.isModerator(stream.id, user.id),
      ]);

      if (!active) return;
      setIsMuted(muted);
      setIsModerator(moderator || stream.user_id === user.id);
    };

    hydrateModerationState();

    const moderationChannel = supabase
      .channel(`viewer-moderation-${stream.id}-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_stream_mutes',
        filter: `stream_id=eq.${stream.id}`,
      }, () => {
        hydrateModerationState();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_stream_moderators',
        filter: `stream_id=eq.${stream.id}`,
      }, () => {
        hydrateModerationState();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(moderationChannel);
    };
  }, [stream?.id, stream?.user_id, user?.id]);

  useEffect(() => {
    if (!stream?.id) return;
    let active = true;

    const loadGifts = async () => {
      const rows = await streamOps.fetchGifts(stream.id);
      const ranking = await streamOps.fetchGiftRanking(stream.id);
      if (!active) return;

      prevGiftIdsRef.current = new Set(rows.map((gift) => gift.id));
      setGifts(rows);
      setGiftRanking(ranking);
    };

    loadGifts();

    const giftChannel = supabase
      .channel(`stream-gifts-${stream.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_stream_gifts',
        filter: `stream_id=eq.${stream.id}`,
      }, () => {
        loadGifts();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(giftChannel);
    };
  }, [stream?.id]);

  const removeFishAnimation = useCallback((id) => {
    setFishGiftAnimations((prev) => prev.filter((anim) => anim.id !== id));
  }, []);

  const spawnFishAnimation = useCallback((label, value, key) => {
    setFishGiftAnimations((prev) => {
      if (prev.some((anim) => anim.id === key)) return prev;
      return [...prev, { id: key, label, value }].slice(-4);
    });
  }, []);

  useEffect(() => {
    if (!chatMessages.length) return;

    if (!chatAnimationHydratedRef.current) {
      prevChatIdsRef.current = new Set(chatMessages.map((msg) => msg.id));
      chatAnimationHydratedRef.current = true;
      return;
    }

    const newMessages = chatMessages.filter((msg) => !prevChatIdsRef.current.has(msg.id));
    prevChatIdsRef.current = new Set(chatMessages.map((msg) => msg.id));

    newMessages.forEach((msg) => {
      const match = (msg.message || '').match(/dono\s+(.+?)\s+\((\d+)\s*pts\)/i);
      if (!match) return;
      spawnFishAnimation(match[1], Number(match[2]) || 0, `chat-${msg.id}`);
    });
  }, [chatMessages, spawnFishAnimation]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRefDesktop.current) chatRefDesktop.current.scrollTop = chatRefDesktop.current.scrollHeight;
    if (chatRefMobile.current) chatRefMobile.current.scrollTop = chatRefMobile.current.scrollHeight;
  }, [chatMessages]);

  // If stream ended, notify and go back
  useEffect(() => {
    if (!stats.is_live) {
      const t = setTimeout(() => onBack(), 2000);
      return () => clearTimeout(t);
    }
  }, [stats.is_live, onBack]);

  useEffect(() => {
    if (!stream?.id) return;
    let active = true;

    const loadFrame = async () => {
      const frame = await streamOps.fetchLatestFrame(stream.id);
      if (!active || !frame) return;
      setDbFallbackFrame(frame);
      setLastFrameAt(Date.now());
      setFrameStatus('live');
    };

    loadFrame();

    const frameChannel = supabase
      .channel(`stream-frames-${stream.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${stream.id}`,
      }, (payload) => {
        const raw = payload.new?.message || '';
        if (!raw.startsWith(FRAME_MSG_PREFIX)) return;
        if (!active) return;
        setDbFallbackFrame(raw.slice(FRAME_MSG_PREFIX.length));
        setLastFrameAt(Date.now());
        setFrameStatus('live');
      })
      .subscribe();

    // Optimized polling: 500ms instead of 1200ms for smoother frame updates
    const pollId = setInterval(() => {
      loadFrame();
    }, 500);

    return () => {
      active = false;
      clearInterval(pollId);
      supabase.removeChannel(frameChannel);
      setDbFallbackFrame(null);
    };
  }, [stream?.id]);

  useEffect(() => {
    if (!stream?.id) return;
    const timer = setInterval(() => {
      if (!lastFrameAt) {
        setFrameStatus('waiting');
        return;
      }

      const delta = Date.now() - lastFrameAt;
      if (delta > 7000) {
        setFrameStatus('stale');
      } else if (delta > 3000) {
        setFrameStatus('degraded');
      } else {
        setFrameStatus('live');
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [stream?.id, lastFrameAt]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    if (isMuted) return;
    await streamOps.sendChat(stream.id, user.id, newMessage.trim());
    setNewMessage('');
  };

  const handleSendGift = async (gift) => {
    if (!user?.id) return;

    // Trigger animation immediately so it appears even if gift persistence fails.
    const localAnimKey = `local-${Date.now()}-${gift.id}-${Math.random().toString(36).slice(2, 7)}`;
    spawnFishAnimation(gift.label, gift.value || 0, localAnimKey);

    const result = await streamOps.sendGift(stream.id, user.id, gift);
    if (result?.missingTable) {
      setMissingGiftTable(true);
    }

    const donationText = `${user.username || 'Usuario'} dono ${gift.label} (${gift.value} pts)`;
    await streamOps.sendChat(stream.id, user.id, donationText);
    setShowGiftPicker(false);
  };

  const handleLike = async () => {
    if (!user) return;
    setLiked(true);
    const id = heartId.current++;
    setHearts(prev => [...prev, id]);
    await streamOps.like(stream.id, user.id);
    setTimeout(() => setLiked(false), 300);
  };

  const removeHeart = useCallback((id) => setHearts(prev => prev.filter(h => h !== id)), []);

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-white/5 sticky top-0 z-40">
        <button onClick={() => onBack()} className="p-2 text-blue-300 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {stats.is_live ? (
            <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> EN VIVO
            </span>
          ) : (
            <span className="text-xs text-gray-400 font-medium px-2.5 py-1 bg-slate-800 rounded-lg">FINALIZADO</span>
          )}
          <motion.span
            animate={viewerPulseLevel !== 'idle'
              ? {
                  backgroundColor: viewerPulseLevel === 'big'
                    ? 'rgba(16,185,129,0.36)'
                    : viewerPulseLevel === 'medium'
                      ? 'rgba(16,185,129,0.28)'
                      : 'rgba(16,185,129,0.2)',
                  scale: viewerPulseLevel === 'big'
                    ? [1, 1.1, 1]
                    : viewerPulseLevel === 'medium'
                      ? [1, 1.08, 1]
                      : [1, 1.05, 1],
                }
              : { backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: viewerPulseLevel === 'big' ? 0.64 : viewerPulseLevel === 'medium' ? 0.5 : 0.34, ease: 'easeOut' }}
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${viewerPulseLevel !== 'idle' ? 'text-emerald-200' : 'text-blue-300'}`}
          >
            <motion.span
              key={`viewer-pulse-${viewerPulseKey}`}
              animate={viewerPulseLevel !== 'idle'
                ? {
                    scale: viewerPulseLevel === 'big'
                      ? [1, 1.34, 1]
                      : viewerPulseLevel === 'medium'
                        ? [1, 1.26, 1]
                        : [1, 1.18, 1],
                  }
                : { scale: 1 }}
              transition={{ duration: viewerPulseLevel === 'big' ? 0.54 : viewerPulseLevel === 'medium' ? 0.42 : 0.3, ease: 'easeOut' }}
            >
              <Eye className="w-3.5 h-3.5" />
            </motion.span>
            {smoothViewerCount}
          </motion.span>
          <motion.span
            animate={likePulseLevel !== 'idle'
              ? {
                  backgroundColor: likePulseLevel === 'big'
                    ? 'rgba(239,68,68,0.36)'
                    : likePulseLevel === 'medium'
                      ? 'rgba(239,68,68,0.28)'
                      : 'rgba(239,68,68,0.2)',
                  scale: likePulseLevel === 'big'
                    ? [1, 1.1, 1]
                    : likePulseLevel === 'medium'
                      ? [1, 1.08, 1]
                      : [1, 1.05, 1],
                }
              : { backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: likePulseLevel === 'big' ? 0.66 : likePulseLevel === 'medium' ? 0.52 : 0.36, ease: 'easeOut' }}
            className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${likePulseLevel !== 'idle' ? 'text-red-200' : 'text-red-400'}`}
          >
            <motion.span
              key={`like-pulse-${likePulseKey}`}
              animate={likePulseLevel !== 'idle'
                ? {
                    scale: likePulseLevel === 'big'
                      ? [1, 1.36, 1]
                      : likePulseLevel === 'medium'
                        ? [1, 1.28, 1]
                        : [1, 1.2, 1],
                  }
                : { scale: 1 }}
              transition={{ duration: likePulseLevel === 'big' ? 0.58 : likePulseLevel === 'medium' ? 0.44 : 0.32, ease: 'easeOut' }}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </motion.span>
            {smoothLikeCount}
          </motion.span>
        </div>
        <div className="w-9" />
      </div>

      <div className="relative flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* Video area - real WebRTC video from broadcaster */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0">
          {!stats.is_live && (
            <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
              <p className="text-white font-bold text-lg">La transmisión ha finalizado</p>
            </div>
          )}

          {wasKicked && (
            <div className="absolute inset-0 bg-black/70 z-30 flex items-center justify-center px-6">
              <p className="text-white font-bold text-lg text-center">Has sido expulsado de este directo</p>
            </div>
          )}

          {/* Simple viewer: render frames from this stream */}
          {dbFallbackFrame ? (
            <img
              src={dbFallbackFrame}
              alt="Retransmision en directo"
              className="w-full h-full object-cover md:object-contain"
            />
          ) : (
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
              <p className="text-blue-400/60 text-sm mt-3">Recibiendo señal del directo...</p>
            </div>
          )}

          {/* Connection indicator */}
          <div className="absolute top-3 left-3 z-20">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm ${
              frameStatus === 'live' ? 'bg-green-900/50 text-green-400' :
              frameStatus === 'degraded' ? 'bg-amber-900/50 text-amber-300' :
              frameStatus === 'stale' ? 'bg-red-900/50 text-red-400' :
              'bg-blue-900/50 text-blue-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                frameStatus === 'live' ? 'bg-green-400' :
                frameStatus === 'degraded' ? 'bg-amber-300' :
                frameStatus === 'stale' ? 'bg-red-400' :
                'bg-blue-400 animate-pulse'
              }`} />
              {frameStatus === 'live' ? 'En directo' :
               frameStatus === 'degraded' ? 'Senal media' :
               frameStatus === 'stale' ? 'Reintentando...' :
               'Conectando...'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMobileChatExpanded((prev) => !prev)}
            className="md:hidden absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-white border border-white/10"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {mobileChatExpanded ? 'Ocultar chat' : `Chat (${chatMessages.length})`}
          </button>

          {/* Streamer overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pb-24 md:pb-4 z-10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border-2 border-red-500">
                <AvatarImage src={stream.user?.foto_perfil} />
                <AvatarFallback className="bg-blue-900 text-cyan-200 font-bold text-sm">
                  {stream.user?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-white font-bold text-sm">{stream.user?.username || 'Usuario'}</h3>
                <p className="text-gray-300 text-xs">{stream.title}</p>
              </div>
            </div>
          </div>

          {/* Mobile overlay chat */}
          <div className="md:hidden absolute left-3 right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20">
            {mobileChatExpanded && (
              <div className="mb-2 rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl overflow-hidden">
                {(giftRanking.length > 0 || missingGiftTable || gifts.length > 0) && (
                  <div className="px-3 py-2 border-b border-white/10 bg-black/25 space-y-1">
                    {missingGiftTable && (
                      <p className="text-[10px] text-yellow-300/85">Activa setup-live-stream-moderation.sql para guardar donaciones.</p>
                    )}
                    {giftRanking.length > 0 && (
                      <p className="text-[10px] font-bold text-amber-300/90 flex items-center gap-1">
                        <Gift className="w-3 h-3" /> Top donadores
                      </p>
                    )}
                    {gifts.slice(0, 2).map((gift) => (
                      <p key={gift.id} className="text-[10px] text-amber-300/90 truncate">
                        {gift.sender?.username || 'usuario'} regalo {gift.gift_name}
                      </p>
                    ))}
                  </div>
                )}
                <div ref={chatRefMobile} className="max-h-[24vh] overflow-hidden px-3 py-2 space-y-0.5">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-blue-300/60 text-center py-4">Se el primero en comentar...</p>
                  ) : chatMessages.slice(-16).map(msg => <ChatMessage key={msg.id} message={msg} />)}
                </div>
              </div>
            )}

            {isMuted && (
              <p className="text-[11px] text-yellow-300/90 mb-2 px-2">Has sido silenciado en este directo.</p>
            )}

            {showGiftPicker && (
              <div className="mb-2 rounded-xl border border-white/10 bg-slate-900/90 p-2 space-y-1 backdrop-blur-xl">
                {GIFT_OPTIONS.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleSendGift(gift)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {gift.icon === 'rod' ? <Gift className="w-3.5 h-3.5 text-pink-300" /> : <Fish className="w-3.5 h-3.5 text-pink-300" />}
                      {gift.label}
                    </span>
                    <span className="text-amber-300">{gift.value} pts</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-slate-900/85 backdrop-blur-xl p-2 pb-[calc(env(safe-area-inset-bottom)+6px)]">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={isMuted ? 'No puedes enviar mensajes' : 'Comenta en directo...'}
                  disabled={isMuted}
                  className="flex-1 bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-blue-400/50 focus:outline-none focus:border-cyan-500/40 disabled:opacity-60"
                />
                <button onClick={handleSend} className="p-2 text-cyan-400 hover:text-cyan-300"><Send className="w-4 h-4" /></button>
                <button onClick={() => setShowGiftPicker((v) => !v)} className="p-2 text-pink-300 hover:text-pink-200"><Gift className="w-4 h-4" /></button>
                <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="p-2">
                  <Heart className={`w-5 h-5 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-red-400 hover:text-red-300'}`} />
                </motion.button>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {hearts.map(id => <FloatingHeart key={id} id={id} onComplete={removeHeart} />)}
          </AnimatePresence>
        </div>

        {/* Chat panel */}
        <div className="hidden md:flex w-full md:w-80 lg:w-96 flex-col bg-slate-900/50 border-l border-white/5 rounded-none min-h-0">
          <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" /> Chat en vivo
            </h4>
            <div className="flex items-center gap-2">
              {isModerator && (
                <span className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-500/40 bg-cyan-500/15 text-cyan-300 inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" /> MOD
                </span>
              )}
              <span className="text-[10px] text-blue-400/60">{chatMessages.length} msgs</span>
            </div>
          </div>
          {(giftRanking.length > 0 || missingGiftTable || gifts.length > 0) && (
            <div className="px-3 py-2 border-b border-white/5 bg-slate-950/40 space-y-1.5">
              {missingGiftTable && (
                <p className="text-[10px] text-yellow-300/80">Activa setup-live-stream-moderation.sql para guardar donaciones.</p>
              )}
              {giftRanking.length > 0 && (
                <>
                  <p className="text-[10px] font-bold text-amber-300/90 flex items-center gap-1">
                    <Gift className="w-3 h-3" /> 🏆 Top Donadores
                  </p>
                  <div className="space-y-1">
                    {giftRanking.map((rank, idx) => (
                      <div key={rank.senderId} className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-black/30">
                        <span className="text-amber-300 font-bold">
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          {rank.sender?.username || 'usuario'}
                        </span>
                        <span className="text-amber-400 font-semibold">{rank.totalValue} pts</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {gifts.slice(0, 3).map((gift) => (
                <p key={gift.id} className="text-[11px] text-amber-300/90 truncate">
                  {gift.sender?.username || 'usuario'} regalo {gift.gift_name} ({gift.value} pts)
                </p>
              ))}
            </div>
          )}
          <div ref={chatRefDesktop} className="flex-1 overflow-hidden px-3 py-2 space-y-0.5">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-blue-400/40 text-center py-8">Sé el primero en comentar...</p>
            ) : chatMessages.slice(-18).map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </div>
          <div className="p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] border-t border-white/5 bg-slate-900/90 backdrop-blur-xl">
            {isMuted && (
              <p className="text-[11px] text-yellow-300/90 mb-2">Has sido silenciado en este directo. No puedes enviar mensajes.</p>
            )}
            {showGiftPicker && (
              <div className="mb-2 rounded-xl border border-white/10 bg-slate-800/80 p-2 space-y-1">
                {GIFT_OPTIONS.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => handleSendGift(gift)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {gift.icon === 'rod' ? <Gift className="w-3.5 h-3.5 text-pink-300" /> : <Fish className="w-3.5 h-3.5 text-pink-300" />}
                      {gift.label}
                    </span>
                    <span className="text-amber-300">{gift.value} pts</span>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2">
              <input
                type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={isMuted ? 'No puedes enviar mensajes' : 'Enviar mensaje...'}
                disabled={isMuted}
                className="flex-1 bg-slate-800/90 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-blue-400/50 focus:outline-none focus:border-cyan-500/40 disabled:opacity-60"
              />
              <button onClick={handleSend} className="p-2 text-cyan-400 hover:text-cyan-300"><Send className="w-4 h-4" /></button>
              <button onClick={() => setShowGiftPicker((v) => !v)} className="p-2 text-pink-300 hover:text-pink-200"><Gift className="w-4 h-4" /></button>
              <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="p-2">
                <Heart className={`w-5 h-5 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-red-400 hover:text-red-300'}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Global Fish Gift Animations - Rendered at top level for full viewport coverage */}
      <AnimatePresence>
        {fishGiftAnimations.map((anim) => (
          <FishGiftAnimation key={anim.id} id={anim.id} label={anim.label} value={anim.value} onComplete={removeFishAnimation} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Go Live Setup (real camera via getUserMedia)
// ═══════════════════════════════════════════════════════════════
const GoLiveSetup = ({ onClose, onGoLive }) => {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [mediaStream, setMediaStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [sourceType, setSourceType] = useState('camera'); // 'camera' or 'screen'
  const videoRef = useRef(null);

  // Request media based on source type (camera or screen)
  const requestMedia = useCallback(async (type) => {
    // Stop previous stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(t => t.stop());
      setMediaStream(null);
    }
    setCameraError(null);

    try {
      let stream;
      if (type === 'screen') {
        // Screen capture
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        // Screen share might not include audio — try to add mic audio
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStream.getAudioTracks().forEach(t => stream.addTrack(t));
        } catch (_) {
          // No mic, continue with screen audio only
        }
      } else {
        // Camera + mic
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });
      }
      setMediaStream(stream);
      setCameraEnabled(true);

      // If screen share stops (user clicks "Stop sharing"), switch back to camera
      if (type === 'screen') {
        stream.getVideoTracks()[0]?.addEventListener('ended', () => {
          setSourceType('camera');
        });
      }
    } catch (err) {
      console.error('Media access denied:', err);
      if (type === 'screen') {
        setCameraError('No se pudo compartir la pantalla. El usuario canceló o no tiene permisos.');
      } else {
        setCameraError('No se pudo acceder a la cámara/micrófono. Verifica los permisos del navegador.');
      }
      setCameraEnabled(false);
    }
  }, [mediaStream]);

  // Request media on mount and when source type changes
  useEffect(() => {
    requestMedia(sourceType);
    return () => {
      // Cleanup handled on unmount
    };
  }, [sourceType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (videoRef.current && mediaStream) videoRef.current.srcObject = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    if (mediaStream) mediaStream.getVideoTracks().forEach(t => { t.enabled = cameraEnabled; });
  }, [cameraEnabled, mediaStream]);

  useEffect(() => {
    if (mediaStream) mediaStream.getAudioTracks().forEach(t => { t.enabled = micEnabled; });
  }, [micEnabled, mediaStream]);

  const handleClose = () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    onClose();
  };

  const handleGo = async () => {
    if (!title.trim() || starting) return;
    setStarting(true);
    // Pass mediaStream and sourceType to parent so the own-stream-view can use it
    await onGoLive({ title, category, mediaStream, sourceType });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={handleClose}>
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden">
        
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-500" /> Iniciar Directo
          </h2>
          <button onClick={handleClose} className="p-1.5 text-blue-300 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Real camera preview */}
          <div className="relative aspect-video rounded-xl bg-slate-800 overflow-hidden border border-white/5">
            {cameraEnabled && mediaStream && !cameraError ? (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={sourceType === 'camera' ? { transform: 'scaleX(-1)' } : {}} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {cameraError ? (
                  <div className="text-center px-4">
                    <VideoOff className="w-10 h-10 text-red-400/40 mx-auto" />
                    <p className="text-xs text-red-400/60 mt-2">{cameraError}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <VideoOff className="w-10 h-10 text-red-400/40 mx-auto" />
                    <p className="text-xs text-red-400/40 mt-2">Cámara desactivada</p>
                  </div>
                )}
              </div>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/50 rounded-lg px-2 py-1">
              <Avatar className="w-6 h-6">
                <AvatarImage src={profile?.foto_perfil} />
                <AvatarFallback className="bg-blue-900 text-cyan-200 text-[10px] font-bold">{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-white font-medium">{profile?.username}</span>
            </div>
          </div>

          {/* Source type selector: Camera vs Screen */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setSourceType('camera')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                sourceType === 'camera'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/50 border-white/5 text-blue-300/60 hover:text-white hover:border-white/10'
              }`}
            >
              <Camera className="w-4 h-4" /> Cámara
            </button>
            <button
              onClick={() => setSourceType('screen')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                sourceType === 'screen'
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-800/50 border-white/5 text-blue-300/60 hover:text-white hover:border-white/10'
              }`}
            >
              <Monitor className="w-4 h-4" /> Pantalla
            </button>
          </div>

          {/* Cam/Mic toggles */}
          <div className="flex justify-center gap-4">
            <button onClick={() => setCameraEnabled(!cameraEnabled)}
              className={`p-3 rounded-full transition-all ${cameraEnabled ? 'bg-slate-800 text-white' : 'bg-red-900/30 text-red-400'}`}>
              {cameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>
            <button onClick={() => setMicEnabled(!micEnabled)}
              className={`p-3 rounded-full transition-all ${micEnabled ? 'bg-slate-800 text-white' : 'bg-red-900/30 text-red-400'}`}>
              {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-blue-300/70 font-medium block mb-1.5">Título del directo</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Pesca de carpas en el río..."
              className="w-full bg-slate-800/80 border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30"
              maxLength={100} />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-blue-300/70 font-medium block mb-1.5">Categoría</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c !== 'Todos').map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    category === cat ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-slate-800/50 border-white/5 text-blue-300/60 hover:text-white hover:border-white/10'
                  }`}>{cat}</button>
              ))}
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleGo}
            disabled={!title.trim() || starting}
            className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
            {starting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Radio className="w-5 h-5" />}
            {starting ? 'Iniciando...' : 'Iniciar transmisión'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Own Stream View (streamer's real camera feed + real chat)
// ═══════════════════════════════════════════════════════════════
const OwnStreamView = ({ streamData, mediaStream, sourceType, onEnd }) => {
  const { user } = useAuth();
  const chatMessages = useRealtimeChat(streamData.id);
  const stats = useRealtimeStats(streamData.id);
  const [duration, setDuration] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [viewers, setViewers] = useState([]);
  const videoRef = useRef(null);
  const chatRef = useRef(null);

  // WebRTC: broadcast our media to all connected viewers
  useBroadcaster(streamData.id, mediaStream);

  useEffect(() => {
    if (videoRef.current && mediaStream) videoRef.current.srcObject = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    const interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  // Fetch and subscribe to viewers in real-time
  useEffect(() => {
    if (!streamData?.id) return;
    let active = true;

    const fetchViewers = async () => {
      try {
        const { data } = await supabase
          .from('live_stream_viewers')
          .select('user_id, profiles(id, username, nombre, foto_perfil)')
          .eq('stream_id', streamData.id);

        if (active) {
          setViewers(data || []);
        }
      } catch (err) {
        console.error('Error fetching viewers:', err);
      }
    };

    fetchViewers();

    const viewerChannel = supabase
      .channel(`viewers-${streamData.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'live_stream_viewers',
        filter: `stream_id=eq.${streamData.id}`,
      }, () => {
        fetchViewers();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(viewerChannel);
    };
  }, [streamData?.id]);

  const handleEnd = async () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    await streamOps.end(streamData.id);
    onEnd();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await streamOps.sendChat(streamData.id, user.id, newMessage.trim());
    setNewMessage('');
  };

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> EN VIVO
          </span>
          <span className="text-xs text-white font-mono">{fmt(duration)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-blue-300"><Eye className="w-3.5 h-3.5" /> {stats.viewer_count}</span>
          <span className="flex items-center gap-1 text-xs text-red-400"><Heart className="w-3.5 h-3.5 fill-red-400" /> {stats.like_count}</span>
        </div>
        <motion.button whileTap={{ scale: 0.95 }} onClick={handleEnd}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors">
          Finalizar
        </motion.button>
      </div>

      <div className="relative flex-1 flex flex-col md:flex-row">
        {/* Video */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[50vh]">
          {mediaStream ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={sourceType === 'camera' ? { transform: 'scaleX(-1)' } : {}} />
          ) : (
            <div className="text-center">
              <Camera className="w-16 h-16 text-red-500/30 mx-auto" />
              <p className="text-blue-400/30 text-sm mt-3">Cámara no disponible</p>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 z-10">
            <p className="text-white/90 text-sm font-bold">{streamData.title}</p>
            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full mt-1 inline-block">{streamData.category}</span>
          </div>
        </div>

        {/* Chat + Viewers Panel */}
        <div className="w-full md:w-96 flex flex-col bg-slate-900/70 border-l border-white/5 max-h-[46vh] md:max-h-none rounded-t-2xl md:rounded-none md:bg-slate-900/50">
          {/* Tabs: Chat / Espectadores */}
          <div className="flex border-b border-white/5">
            <button className="flex-1 px-3 py-2.5 text-xs font-semibold text-white bg-cyan-500/15 border-b-2 border-cyan-500/40">
              <MessageCircle className="w-4 h-4 inline mr-1" /> Chat
            </button>
            <button className="flex-1 px-3 py-2.5 text-xs font-semibold text-white/60 hover:text-white transition-colors">
              <Eye className="w-4 h-4 inline mr-1" /> Espectadores ({viewers.length})
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-blue-400/40 text-center py-8">Esperando mensajes de los espectadores...</p>
            ) : chatMessages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </div>

          {/* Chat Input */}
          <div className="p-2 pb-[calc(env(safe-area-inset-bottom)+8px)] border-t border-white/5 bg-slate-900/90 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Escribe tu mensaje..."
                className="flex-1 bg-slate-800/80 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSendMessage}
                className="p-2 text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Viewers List */}
          <div className="hidden md:flex flex-col max-h-64 overflow-y-auto p-2 border-t border-white/5 space-y-2 bg-black/10">
            {viewers.length === 0 ? (
              <p className="text-xs text-white/50 text-center py-3">Aun no hay espectadores</p>
            ) : (
              viewers.map((v) => (
                <div key={v.user_id} className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarImage src={v.profiles?.foto_perfil} />
                    <AvatarFallback className="bg-blue-900 text-cyan-200 text-[10px] font-bold">
                      {v.profiles?.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate font-semibold">
                      {v.profiles?.username || v.profiles?.nombre || 'usuario'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════════════
const LiveStreamPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [viewingStream, setViewingStream] = useState(null);

  // Fetch real streams from Supabase
  const fetchStreams = useCallback(async () => {
    const data = await streamOps.fetchAll();
    setStreams(data);
    setLoading(false);

  }, []);

  useEffect(() => {
    fetchStreams();

    // Realtime: refresh stream list when streams change
    const channel = supabase
      .channel('streams-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, () => {
        fetchStreams();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStreams]);

  useEffect(() => {
    const targetStreamId = location.state?.highlightStreamId;
    if (!targetStreamId || viewingStream) return;

    const targetStream = streams.find((stream) => stream.id === targetStreamId);
    if (targetStream) {
      setViewingStream(targetStream);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, streams, viewingStream]);

  const filteredStreams = selectedCategory === 'Todos' ? streams : streams.filter(s => s.category === selectedCategory);
  const otherStreams = filteredStreams.filter(s => s.user_id !== user?.id);
  const liveCount = otherStreams.length;
  const viewersCount = otherStreams.reduce((acc, stream) => acc + (stream.viewer_count || 0), 0);
  const popularCategory = liveCount > 0 ? otherStreams[0]?.category || '-' : '-';

  if (viewingStream) {
    return <StreamViewer stream={viewingStream} onBack={() => { setViewingStream(null); fetchStreams(); }} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-red-500" /> Directos
            </h1>
            <p className="text-sm text-blue-300/60 mt-0.5">Transmisiones en vivo de pesca. La creación se hace desde Cámara en modo EN VIVO.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-medium">En vivo</span>
            </div>
            <p className="text-lg font-bold text-white">{liveCount}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Viendo</span>
            </div>
            <p className="text-lg font-bold text-white">{viewersCount}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">Popular</span>
            </div>
            <p className="text-lg font-bold text-white">{popularCategory}</p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-4">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-medium whitespace-nowrap px-3.5 py-2 rounded-xl border transition-all ${
                selectedCategory === cat ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300' : 'bg-slate-900/40 border-white/5 text-blue-300/60 hover:text-white hover:border-white/10'
              }`}>{cat}</button>
          ))}
        </div>

        {/* Stream grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-slate-900/50 border border-white/5">
                <div className="aspect-video bg-slate-800 rounded-t-2xl" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : otherStreams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {otherStreams.map(stream => <StreamCard key={stream.id} stream={stream} onClick={setViewingStream} />)}
          </div>
        ) : (
          <div className="text-center py-16">
            <Radio className="w-12 h-12 text-blue-400/20 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No hay directos ahora mismo</h3>
            <p className="text-sm text-blue-300/50">Cuando alguien inicie un directo desde Cámara, aparecerá aquí automáticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamPage;
