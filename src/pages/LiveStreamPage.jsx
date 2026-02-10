import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Video, VideoOff, Mic, MicOff, Heart, MessageCircle, Send, Eye, Clock, ChevronLeft, Camera, X, Sparkles, Monitor, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useBroadcaster, useViewer } from '@/hooks/useWebRTC';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = ['Todos', 'Carpas', 'Spinning', 'Tutoriales', 'Siluros', 'Trucha', 'Black Bass', 'Mar', 'General'];

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

      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .in('id', userIds);

      const pMap = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });

      return data.map(s => ({
        ...s,
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
      await supabase.from('live_streams').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', streamId);
    } catch (err) {
      console.error('Error ending stream:', err);
    }
  },

  async join(streamId, userId) {
    try {
      await supabase.from('live_stream_viewers').upsert(
        { stream_id: streamId, user_id: userId },
        { onConflict: 'stream_id,user_id' }
      );
    } catch (err) { console.error('Error joining:', err); }
  },

  async leave(streamId, userId) {
    try {
      await supabase.from('live_stream_viewers').delete().eq('stream_id', streamId).eq('user_id', userId);
    } catch (err) { console.error('Error leaving:', err); }
  },

  async like(streamId, userId) {
    try {
      const { error } = await supabase.from('live_stream_likes').insert({ stream_id: streamId, user_id: userId });
      if (error && error.code === '23505') {
        await supabase.from('live_stream_likes').delete().eq('stream_id', streamId).eq('user_id', userId);
      }
    } catch (err) { console.error('Error liking:', err); }
  },

  async sendChat(streamId, userId, message) {
    try {
      await supabase.from('live_chat_messages').insert({ stream_id: streamId, user_id: userId, message });
    } catch (err) { console.error('Error sending chat:', err); }
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

      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, nombre, foto_perfil')
        .in('id', userIds);

      const pMap = {};
      (profiles || []).forEach(p => { pMap[p.id] = p; });

      return data.map(m => ({ ...m, user: pMap[m.user_id] || { id: m.user_id, username: 'Usuario' } }));
    } catch (err) {
      console.error('Error fetching chat:', err);
      return [];
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

    streamOps.fetchChat(streamId).then(msgs => { if (mounted) setMessages(msgs); });

    const channel = supabase
      .channel(`chat-${streamId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'live_chat_messages',
        filter: `stream_id=eq.${streamId}`,
      }, async (payload) => {
        const msg = payload.new;
        const { data: profile } = await supabase
          .from('profiles').select('id, username, nombre, foto_perfil').eq('id', msg.user_id).single();
        if (mounted) {
          setMessages(prev => [...prev.slice(-200), { ...msg, user: profile || { id: msg.user_id, username: 'Usuario' } }]);
        }
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
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

    streamOps.getStats(streamId).then(s => { if (mounted) setStats(s); });

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
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
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
  const chatRef = useRef(null);
  const heartId = useRef(0);
  const remoteVideoRef = useRef(null);

  // WebRTC: connect to broadcaster and receive video
  const { remoteStream, connectionState } = useViewer(stream.id);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Join/leave as viewer
  useEffect(() => {
    if (user) streamOps.join(stream.id, user.id);
    return () => { if (user) streamOps.leave(stream.id, user.id); };
  }, [stream.id, user]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  // If stream ended, notify and go back
  useEffect(() => {
    if (!stats.is_live) {
      const t = setTimeout(() => onBack(), 2000);
      return () => clearTimeout(t);
    }
  }, [stats.is_live, onBack]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    await streamOps.sendChat(stream.id, user.id, newMessage.trim());
    setNewMessage('');
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
    <div className="min-h-screen bg-slate-950 flex flex-col">
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
          <span className="flex items-center gap-1 text-xs text-blue-300"><Eye className="w-3.5 h-3.5" /> {stats.viewer_count}</span>
          <span className="flex items-center gap-1 text-xs text-red-400"><Heart className="w-3.5 h-3.5 fill-red-400" /> {stats.like_count}</span>
        </div>
        <div className="w-9" />
      </div>

      <div className="relative flex-1 flex flex-col md:flex-row">
        {/* Video area - real WebRTC video from broadcaster */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0">
          {!stats.is_live && (
            <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
              <p className="text-white font-bold text-lg">La transmisión ha finalizado</p>
            </div>
          )}

          {/* Remote video from broadcaster */}
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-center">
              {connectionState === 'connected' ? (
                <>
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-cyan-400/60 text-sm mt-3">Recibiendo vídeo...</p>
                </>
              ) : connectionState === 'waiting' || connectionState === 'connecting' ? (
                <>
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
                  <p className="text-blue-400/60 text-sm mt-3">Conectando con el streamer...</p>
                </>
              ) : connectionState === 'failed' ? (
                <>
                  <WifiOff className="w-12 h-12 text-red-400/60 mx-auto" />
                  <p className="text-red-400/60 text-sm mt-3">Error de conexión. Reintentando...</p>
                </>
              ) : (
                <>
                  <Wifi className="w-12 h-12 text-blue-400/40 mx-auto" />
                  <p className="text-blue-400/40 text-sm mt-3">Esperando señal del streamer...</p>
                </>
              )}
            </div>
          )}

          {/* Connection indicator */}
          <div className="absolute top-3 left-3 z-20">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg backdrop-blur-sm ${
              connectionState === 'connected' ? 'bg-green-900/50 text-green-400' :
              connectionState === 'failed' ? 'bg-red-900/50 text-red-400' :
              'bg-blue-900/50 text-blue-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                connectionState === 'connected' ? 'bg-green-400' :
                connectionState === 'failed' ? 'bg-red-400' :
                'bg-blue-400 animate-pulse'
              }`} />
              {connectionState === 'connected' ? 'Conectado' :
               connectionState === 'failed' ? 'Reconectando...' :
               'Conectando...'}
            </span>
          </div>
          {/* Streamer overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 z-10">
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
          <AnimatePresence>
            {hearts.map(id => <FloatingHeart key={id} id={id} onComplete={removeHeart} />)}
          </AnimatePresence>
        </div>

        {/* Chat panel */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900/50 border-l border-white/5 max-h-[50vh] md:max-h-none">
          <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" /> Chat en vivo
            </h4>
            <span className="text-[10px] text-blue-400/60">{chatMessages.length} msgs</span>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-blue-400/40 text-center py-8">Sé el primero en comentar...</p>
            ) : chatMessages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </div>
          <div className="p-2 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Enviar mensaje..."
                className="flex-1 bg-slate-800/80 border border-white/5 rounded-xl px-3 py-2 text-sm text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30"
              />
              <button onClick={handleSend} className="p-2 text-cyan-400 hover:text-cyan-300"><Send className="w-4 h-4" /></button>
              <motion.button whileTap={{ scale: 0.8 }} onClick={handleLike} className="p-2">
                <Heart className={`w-5 h-5 transition-colors ${liked ? 'text-red-500 fill-red-500' : 'text-red-400 hover:text-red-300'}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
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

  const handleEnd = async () => {
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    await streamOps.end(streamData.id);
    onEnd();
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

        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-slate-900/50 border-l border-white/5 max-h-[40vh] md:max-h-none">
          <div className="px-3 py-2.5 border-b border-white/5">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-cyan-400" /> Chat en vivo
            </h4>
          </div>
          <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">
            {chatMessages.length === 0 ? (
              <p className="text-xs text-blue-400/40 text-center py-8">Esperando mensajes de los espectadores...</p>
            ) : chatMessages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
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
  const navigate = useNavigate();
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [viewingStream, setViewingStream] = useState(null);

  // Fetch real streams from Supabase
  const fetchStreams = useCallback(async () => {
    const data = await streamOps.fetchAll();
    setStreams(data);
    setLoading(false);

    // If user has an active stream, redirect to studio
    if (user) {
      const mine = data.find(s => s.user_id === user.id);
      if (mine) {
        navigate('/studio');
      }
    }
  }, [user, navigate]);

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

  const filteredStreams = selectedCategory === 'Todos' ? streams : streams.filter(s => s.category === selectedCategory);
  const otherStreams = filteredStreams.filter(s => s.user_id !== user?.id);

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
            <p className="text-sm text-blue-300/60 mt-0.5">Transmisiones en vivo de pesca</p>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => {
            const isMobile = window.innerWidth < 768;
            navigate(isMobile ? '/camera?mode=live' : '/studio');
          }}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-red-900/20 transition-all">
            <Radio className="w-4 h-4" />
            <span className="hidden sm:inline">Abrir Studio</span>
            <span className="sm:hidden">En Vivo</span>
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400 font-medium">En vivo</span>
            </div>
            <p className="text-lg font-bold text-white">{streams.length}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs text-blue-400 font-medium">Viendo</span>
            </div>
            <p className="text-lg font-bold text-white">{streams.reduce((a, s) => a + (s.viewer_count || 0), 0)}</p>
          </div>
          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-xs text-yellow-400 font-medium">Popular</span>
            </div>
            <p className="text-lg font-bold text-white">{streams.length > 0 ? streams[0]?.category || '-' : '-'}</p>
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
            <p className="text-sm text-blue-300/50 mb-4">¡Sé el primero en iniciar una transmisión!</p>
            <Button onClick={() => {
              const isMobile = window.innerWidth < 768;
              navigate(isMobile ? '/camera?mode=live' : '/studio');
            }} className="bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl">
              <Radio className="w-4 h-4 mr-2" /> {window.innerWidth < 768 ? 'En Vivo' : 'Abrir Studio'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveStreamPage;
