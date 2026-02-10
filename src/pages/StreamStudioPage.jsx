import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio, Video, VideoOff, Mic, MicOff, Camera, Monitor, X, Settings, Layout,
  Eye, Heart, MessageCircle, Send, ChevronLeft, Square, Circle, Download,
  Volume2, VolumeX, Type, Image, Maximize, Minimize, Layers, Palette,
  RotateCcw, Wifi, WifiOff, Clock, Disc, Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';
import { useBroadcaster } from '@/hooks/useWebRTC';
import { useStreamCompositor, useAudioLevel, useLocalRecorder, LAYOUTS } from '@/hooks/useStreamCompositor';

const CATEGORIES = ['Carpas', 'Spinning', 'Tutoriales', 'Siluros', 'Trucha', 'Black Bass', 'Mar', 'General'];

// ── streamOps: direct Supabase ops ──────────────────────────
const streamOps = {
  async start(userId, title, category) {
    try {
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
    } catch (err) { console.error('Error starting stream:', err); return null; }
  },
  async end(streamId) {
    try {
      await supabase.from('live_stream_viewers').delete().eq('stream_id', streamId);
      await supabase.from('live_streams').update({ is_live: false, ended_at: new Date().toISOString() }).eq('id', streamId);
    } catch (err) { console.error('Error ending stream:', err); }
  },
  async fetchChat(streamId) {
    try {
      const { data } = await supabase.from('live_chat_messages').select('*').eq('stream_id', streamId).order('created_at', { ascending: true }).limit(200);
      if (!data?.length) return [];
      const userIds = [...new Set(data.map(m => m.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, username, nombre, foto_perfil').in('id', userIds);
      const pMap = {}; (profiles || []).forEach(p => { pMap[p.id] = p; });
      return data.map(m => ({ ...m, user: pMap[m.user_id] || { id: m.user_id, username: 'Usuario' } }));
    } catch { return []; }
  },
  async sendChat(streamId, userId, message) {
    try { await supabase.from('live_chat_messages').insert({ stream_id: streamId, user_id: userId, message }); } catch {}
  },
};

// ── Realtime Chat Hook ──────────────────────────────────────
const useRealtimeChat = (streamId) => {
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    if (!streamId) return;
    let mounted = true;
    streamOps.fetchChat(streamId).then(msgs => { if (mounted) setMessages(msgs); });
    const channel = supabase.channel(`studio-chat-${streamId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${streamId}` }, async (payload) => {
        const msg = payload.new;
        const { data: profile } = await supabase.from('profiles').select('id, username, nombre, foto_perfil').eq('id', msg.user_id).single();
        if (mounted) setMessages(prev => [...prev.slice(-200), { ...msg, user: profile || { id: msg.user_id, username: 'Usuario' } }]);
      }).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [streamId]);
  return messages;
};

// ── Realtime Stats Hook ──────────────────────────────────────
const useRealtimeStats = (streamId) => {
  const [stats, setStats] = useState({ viewer_count: 0, like_count: 0, is_live: true });
  useEffect(() => {
    if (!streamId) return;
    let mounted = true;
    supabase.from('live_streams').select('viewer_count, like_count, is_live').eq('id', streamId).single().then(({ data }) => {
      if (mounted && data) setStats(data);
    });
    const channel = supabase.channel(`studio-stats-${streamId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${streamId}` }, (payload) => {
        if (mounted) { const u = payload.new; setStats({ viewer_count: u.viewer_count || 0, like_count: u.like_count || 0, is_live: u.is_live }); }
      }).subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [streamId]);
  return stats;
};

// ═══════════════════════════════════════════════════════════════
//                     STREAM STUDIO PAGE
// ═══════════════════════════════════════════════════════════════
const StreamStudioPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // ─── Sources ───
  const [cameraStream, setCameraStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [screenError, setScreenError] = useState(null);

  // ─── Layout / Overlay ───
  const [layout, setLayout] = useState('camera');
  const [overlayText, setOverlayText] = useState('');
  const [showWatermark, setShowWatermark] = useState(true);
  const [showOverlayInput, setShowOverlayInput] = useState(false);

  // ─── Stream config ───
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [streamData, setStreamData] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [resolution] = useState({ width: 1280, height: 720 });

  // ─── UI state ───
  const [activePanel, setActivePanel] = useState('sources'); // sources, scenes, chat, settings
  const [fullscreenPreview, setFullscreenPreview] = useState(false);
  const chatRef = useRef(null);

  // ─── Compositor ───
  const { canvasRef, compositeStream } = useStreamCompositor({
    cameraStream: cameraEnabled ? cameraStream : null,
    screenStream: screenEnabled ? screenStream : null,
    layout,
    overlayText,
    showWatermark,
    resolution,
  });

  // ─── Audio levels ───
  const camAudioLevel = useAudioLevel(cameraStream);
  const screenAudioLevel = useAudioLevel(screenStream);

  // ─── Local recorder ───
  const { isRecording, recordedBlob, duration: recDuration, startRecording, stopRecording, downloadRecording } = useLocalRecorder(compositeStream);

  // ─── WebRTC broadcast ───
  useBroadcaster(streamData?.id, isLive ? compositeStream : null);

  // ─── Chat ───
  const chatMessages = useRealtimeChat(streamData?.id);
  const stats = useRealtimeStats(streamData?.id);
  const [newMessage, setNewMessage] = useState('');

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatMessages]);

  // Duration timer
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // ─── Source Management ─────────────────────────────────────
  const requestCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      setCameraStream(stream);
      setCameraEnabled(true);
      setMicEnabled(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('No se pudo acceder a la cámara');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraEnabled(false);
  }, [cameraStream]);

  const requestScreen = useCallback(async () => {
    try {
      setScreenError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: true,
      });
      // Add mic audio if no system audio
      if (stream.getAudioTracks().length === 0 && cameraStream) {
        cameraStream.getAudioTracks().forEach(t => {
          stream.addTrack(t.clone());
        });
      }
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setScreenStream(null);
        setScreenEnabled(false);
      });
      setScreenStream(stream);
      setScreenEnabled(true);
    } catch (err) {
      console.error('Screen error:', err);
      setScreenError('Pantalla cancelada o sin permisos');
    }
  }, [cameraStream]);

  const stopScreen = useCallback(() => {
    if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    setScreenStream(null);
    setScreenEnabled(false);
  }, [screenStream]);

  // Toggle mic
  useEffect(() => {
    if (cameraStream) cameraStream.getAudioTracks().forEach(t => { t.enabled = micEnabled; });
  }, [micEnabled, cameraStream]);

  // ─── Go Live / End ─────────────────────────────────────
  const handleGoLive = async () => {
    if (!user || !title.trim()) return;
    const result = await streamOps.start(user.id, title, category);
    if (result) {
      setStreamData(result);
      setIsLive(true);
      setDuration(0);
    }
  };

  const handleEndStream = async () => {
    if (streamData) await streamOps.end(streamData.id);
    if (isRecording) stopRecording();
    setIsLive(false);
    setStreamData(null);
    setDuration(0);
  };

  const handleSendChat = async () => {
    if (!newMessage.trim() || !user || !streamData) return;
    await streamOps.sendChat(streamData.id, user.id, newMessage.trim());
    setNewMessage('');
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  // Mobile panel open/close
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const toggleMobilePanel = (panelId) => {
    if (activePanel === panelId && mobilePanelOpen) {
      setMobilePanelOpen(false);
    } else {
      setActivePanel(panelId);
      setMobilePanelOpen(true);
    }
  };

  // ── Shared panel contents (used on both mobile and desktop) ──
  const PanelSources = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <h3 className="text-xs font-bold text-blue-300/70 uppercase tracking-wider">Fuentes de Vídeo</h3>
      {/* Camera Source */}
      <div className={`rounded-xl border p-3 transition-all ${cameraEnabled ? 'bg-green-900/10 border-green-500/20' : 'bg-slate-900/40 border-white/5'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Camera className={`w-4 h-4 ${cameraEnabled ? 'text-green-400' : 'text-blue-400/50'}`} />
            <span className="text-xs font-bold text-white">Cámara</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${cameraEnabled ? 'bg-green-400' : 'bg-slate-600'}`} />
        </div>
        {cameraError && <p className="text-[10px] text-red-400 mb-2">{cameraError}</p>}
        {cameraEnabled ? (
          <button onClick={stopCamera} className="w-full text-xs py-1.5 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors">Desactivar</button>
        ) : (
          <button onClick={requestCamera} className="w-full text-xs py-1.5 bg-green-900/20 text-green-400 rounded-lg hover:bg-green-900/30 transition-colors">Activar Cámara</button>
        )}
        {cameraEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-green-400/60" />
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${camAudioLevel}%` }} className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full" transition={{ duration: 0.1 }} />
            </div>
          </div>
        )}
      </div>
      {/* Screen Source */}
      <div className={`rounded-xl border p-3 transition-all ${screenEnabled ? 'bg-purple-900/10 border-purple-500/20' : 'bg-slate-900/40 border-white/5'}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Monitor className={`w-4 h-4 ${screenEnabled ? 'text-purple-400' : 'text-blue-400/50'}`} />
            <span className="text-xs font-bold text-white">Pantalla</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${screenEnabled ? 'bg-purple-400' : 'bg-slate-600'}`} />
        </div>
        {screenError && <p className="text-[10px] text-red-400 mb-2">{screenError}</p>}
        {screenEnabled ? (
          <button onClick={stopScreen} className="w-full text-xs py-1.5 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors">Dejar de Compartir</button>
        ) : (
          <button onClick={requestScreen} className="w-full text-xs py-1.5 bg-purple-900/20 text-purple-400 rounded-lg hover:bg-purple-900/30 transition-colors">Compartir Pantalla</button>
        )}
        {screenEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-purple-400/60" />
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div animate={{ width: `${screenAudioLevel}%` }} className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" transition={{ duration: 0.1 }} />
            </div>
          </div>
        )}
      </div>
      {/* Mic Toggle */}
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {micEnabled ? <Mic className="w-4 h-4 text-cyan-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
            <span className="text-xs font-bold text-white">Micrófono</span>
          </div>
          <button onClick={() => setMicEnabled(!micEnabled)}
            className={`w-9 h-5 rounded-full transition-all relative ${micEnabled ? 'bg-cyan-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${micEnabled ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
      <hr className="border-white/5" />
      <h3 className="text-xs font-bold text-blue-300/70 uppercase tracking-wider">Overlays</h3>
      {/* Text Overlay */}
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-yellow-400/60" />
            <span className="text-xs font-bold text-white">Texto</span>
          </div>
          <button onClick={() => setShowOverlayInput(!showOverlayInput)} className="text-[10px] text-cyan-400 hover:text-cyan-300">
            {showOverlayInput ? 'Cerrar' : 'Editar'}
          </button>
        </div>
        {showOverlayInput && (
          <input type="text" value={overlayText} onChange={e => setOverlayText(e.target.value)}
            placeholder="Texto overlay..." className="w-full bg-slate-800/80 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30 mt-1" maxLength={80} />
        )}
        {overlayText && !showOverlayInput && <p className="text-[10px] text-blue-300/50 truncate mt-1">"{overlayText}"</p>}
      </div>
      {/* Watermark */}
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400/60" />
            <span className="text-xs font-bold text-white">Marca de agua</span>
          </div>
          <button onClick={() => setShowWatermark(!showWatermark)}
            className={`w-9 h-5 rounded-full transition-all relative ${showWatermark ? 'bg-cyan-500' : 'bg-slate-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${showWatermark ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const PanelScenes = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <h3 className="text-xs font-bold text-blue-300/70 uppercase tracking-wider mb-2">Escenas / Layouts</h3>
      {Object.entries(LAYOUTS).map(([key, val]) => (
        <button key={key} onClick={() => setLayout(key)}
          className={`w-full text-left p-3 rounded-xl border transition-all ${layout === key ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-slate-900/40 border-white/5 text-blue-300/60 hover:text-white hover:border-white/10'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${layout === key ? 'bg-cyan-500/20' : 'bg-slate-800'}`}>
              {key === 'camera' && <Camera className="w-4 h-4" />}
              {key === 'screen' && <Monitor className="w-4 h-4" />}
              {key === 'pip_cam_small' && <span className="text-[10px] font-bold">PiP</span>}
              {key === 'pip_screen_small' && <span className="text-[10px] font-bold">PiP</span>}
              {key === 'side_by_side' && <Layout className="w-4 h-4" />}
              {key === 'top_bottom' && <Layout className="w-4 h-4 rotate-90" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold">{val.label}</p>
              <p className="text-[10px] text-blue-400/40 truncate">
                {key === 'camera' && 'Solo cámara web'}
                {key === 'screen' && 'Solo pantalla'}
                {key === 'pip_cam_small' && 'Pantalla + cam pequeña'}
                {key === 'pip_screen_small' && 'Cam + pantalla pequeña'}
                {key === 'side_by_side' && 'Lado a lado'}
                {key === 'top_bottom' && 'Arriba / Abajo'}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const PanelChat = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2.5 border-b border-white/5 flex items-center justify-between shrink-0">
        <h4 className="text-xs font-bold text-white flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-cyan-400" /> Chat en vivo
        </h4>
        <span className="text-[10px] text-blue-400/60">{chatMessages.length}</span>
      </div>
      <div ref={chatRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-hide">
        {!streamData ? (
          <p className="text-xs text-blue-400/40 text-center py-8">Inicia el directo para ver el chat</p>
        ) : chatMessages.length === 0 ? (
          <p className="text-xs text-blue-400/40 text-center py-8">Esperando mensajes...</p>
        ) : chatMessages.map(msg => (
          <div key={msg.id} className="flex items-start gap-1.5 py-0.5">
            <span className="text-[10px] font-bold text-cyan-400 shrink-0">{msg.user?.username || 'Usuario'}</span>
            <span className="text-[10px] text-gray-300 break-words">{msg.message}</span>
          </div>
        ))}
      </div>
      {streamData && (
        <div className="p-2 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-1.5">
            <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Mensaje..."
              className="flex-1 bg-slate-800/80 border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30" />
            <button onClick={handleSendChat} className="p-1.5 text-cyan-400 hover:text-cyan-300"><Send className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
    </div>
  );

  const PanelSettings = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <h3 className="text-xs font-bold text-blue-300/70 uppercase tracking-wider">Configuración</h3>
      <div>
        <label className="text-[10px] text-blue-300/60 font-medium block mb-1">Título del directo</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Pesca de carpas..." disabled={isLive}
          className="w-full bg-slate-800/80 border border-white/5 rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30 disabled:opacity-50" maxLength={100} />
      </div>
      <div>
        <label className="text-[10px] text-blue-300/60 font-medium block mb-1.5">Categoría</label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => !isLive && setCategory(cat)} disabled={isLive}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all disabled:opacity-50 ${category === cat ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' : 'bg-slate-800/50 border-white/5 text-blue-300/60 hover:text-white'}`}>{cat}</button>
          ))}
        </div>
      </div>
      <hr className="border-white/5" />
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
        <p className="text-[10px] text-blue-300/60 mb-1">Resolución de salida</p>
        <p className="text-xs text-white font-mono">{resolution.width}x{resolution.height} @ 30fps</p>
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3 space-y-2">
        <p className="text-[10px] text-blue-300/60">Grabación local</p>
        <div className="flex gap-2">
          {!isRecording ? (
            <button onClick={startRecording} disabled={!compositeStream}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 bg-red-900/20 text-red-400 rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-30">
              <Circle className="w-3 h-3" /> Grabar
            </button>
          ) : (
            <button onClick={stopRecording}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 bg-red-600/30 text-red-300 rounded-lg hover:bg-red-600/40 transition-colors">
              <Square className="w-3 h-3" /> Parar
            </button>
          )}
          {recordedBlob && (
            <button onClick={downloadRecording}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-900/20 text-green-400 rounded-lg hover:bg-green-900/30 transition-colors">
              <Download className="w-3 h-3" /> Descargar
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const panelTabs = [
    { id: 'sources', icon: Layers, label: 'Fuentes' },
    { id: 'scenes', icon: Layout, label: 'Escenas' },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ];

  return (
    <div className="h-screen bg-[#0a0e1a] flex flex-col overflow-hidden">

      {/* ═══ TOP BAR ═══ */}
      <div className="h-11 bg-[#0f1420] border-b border-white/5 flex items-center justify-between px-2 sm:px-3 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/live')} className="p-1 text-blue-300 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <Radio className="w-3.5 h-3.5 text-red-500" />
          <span className="text-xs sm:text-sm font-bold text-white">Studio</span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {isLive && (
            <>
              <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg animate-pulse">
                <span className="w-1.5 h-1.5 bg-white rounded-full" /> VIVO
              </span>
              <span className="text-[10px] sm:text-xs text-white font-mono">{fmtTime(duration)}</span>
              <span className="flex items-center gap-0.5 text-[10px] text-blue-300"><Eye className="w-3 h-3" />{stats.viewer_count}</span>
              <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-red-400"><Heart className="w-3 h-3" />{stats.like_count}</span>
            </>
          )}
          {isRecording && (
            <span className="flex items-center gap-1 bg-orange-600/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
              <Disc className="w-2.5 h-2.5 animate-spin" /> REC
            </span>
          )}
        </div>

        <Avatar className="w-6 h-6 sm:w-7 sm:h-7">
          <AvatarImage src={profile?.foto_perfil} />
          <AvatarFallback className="bg-blue-900 text-cyan-200 text-[9px] font-bold">{profile?.username?.[0]?.toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      {/* Desktop: sidebar + panel + canvas | Mobile: canvas + bottom sheet */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">

        {/* ─── DESKTOP ONLY: Left Sidebar tabs ─── */}
        <div className="hidden md:flex w-12 bg-[#0d1117] border-r border-white/5 flex-col items-center py-2 gap-1 shrink-0">
          {panelTabs.map(tab => (
            <button key={tab.id} onClick={() => setActivePanel(tab.id)}
              className={`p-2.5 rounded-lg transition-all ${activePanel === tab.id ? 'bg-cyan-500/15 text-cyan-400' : 'text-blue-400/50 hover:text-white hover:bg-white/5'}`}
              title={tab.label}>
              <tab.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        {/* ─── DESKTOP ONLY: Left Panel ─── */}
        <div className="hidden md:flex w-64 bg-[#0f1420] border-r border-white/5 flex-col shrink-0 overflow-hidden">
          {activePanel === 'sources' && <PanelSources />}
          {activePanel === 'scenes' && <PanelScenes />}
          {activePanel === 'chat' && <PanelChat />}
          {activePanel === 'settings' && <PanelSettings />}
        </div>

        {/* ═══ CENTER: Canvas Preview (both mobile & desktop) ═══ */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#0a0e1a]">
          {/* Preview Header - desktop only */}
          <div className="hidden md:flex px-3 py-2 border-b border-white/5 items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Vista Previa</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLive ? 'bg-red-600/20 text-red-400' : 'bg-slate-800 text-blue-400/50'}`}>
                {isLive ? 'EN VIVO' : 'OFFLINE'}
              </span>
            </div>
            <span className="text-[10px] text-blue-400/50 font-mono">{resolution.width}x{resolution.height}</span>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0">
            <div className="relative w-full max-w-4xl" style={{ aspectRatio: `${resolution.width}/${resolution.height}` }}>
              <canvas ref={canvasRef} className="w-full h-full rounded-lg sm:rounded-xl border border-white/10 bg-black" style={{ maxHeight: '100%', objectFit: 'contain' }} />
              {!cameraEnabled && !screenEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg sm:rounded-xl">
                  <div className="text-center px-4">
                    <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400/30 mx-auto mb-2" />
                    <p className="text-xs sm:text-sm text-blue-300/50 font-medium">Sin fuentes activas</p>
                    <p className="text-[10px] sm:text-xs text-blue-400/30 mt-1">Activa la cámara o pantalla</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ DESKTOP BOTTOM CONTROLS ═══ */}
          <div className="hidden md:block px-4 py-3 border-t border-white/5 bg-[#0f1420] shrink-0">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-2">
                <button onClick={cameraEnabled ? stopCamera : requestCamera}
                  className={`p-2.5 rounded-xl transition-all ${cameraEnabled ? 'bg-green-900/20 text-green-400 border border-green-500/20' : 'bg-slate-800 text-blue-400/50 border border-white/5 hover:text-white'}`}>
                  {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setMicEnabled(!micEnabled)}
                  className={`p-2.5 rounded-xl transition-all ${micEnabled ? 'bg-cyan-900/20 text-cyan-400 border border-cyan-500/20' : 'bg-red-900/20 text-red-400 border border-red-500/20'}`}>
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button onClick={screenEnabled ? stopScreen : requestScreen}
                  className={`p-2.5 rounded-xl transition-all ${screenEnabled ? 'bg-purple-900/20 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-blue-400/50 border border-white/5 hover:text-white'}`}>
                  <Monitor className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {!isLive ? (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleGoLive}
                    disabled={!title.trim() || (!cameraEnabled && !screenEnabled)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-lg shadow-red-900/20 transition-all">
                    <Radio className="w-4 h-4" /> Iniciar Directo
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleEndStream}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold text-sm rounded-xl transition-all">
                    <Square className="w-4 h-4" /> Finalizar Directo
                  </motion.button>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isRecording ? (
                  <button onClick={startRecording} disabled={!compositeStream}
                    className="p-2.5 rounded-xl bg-slate-800 text-blue-400/50 border border-white/5 hover:text-red-400 transition-all disabled:opacity-30" title="Grabar">
                    <Circle className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={stopRecording}
                    className="p-2.5 rounded-xl bg-red-900/30 text-red-400 border border-red-500/20 animate-pulse transition-all" title="Parar">
                    <Square className="w-4 h-4" />
                  </button>
                )}
                {recordedBlob && (
                  <button onClick={downloadRecording}
                    className="p-2.5 rounded-xl bg-green-900/20 text-green-400 border border-green-500/20 transition-all" title="Descargar">
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ MOBILE: Bottom Sheet Panel (slides up over canvas) ═══ */}
        <AnimatePresence>
          {mobilePanelOpen && (
            <>
              {/* Backdrop */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="md:hidden fixed inset-0 bg-black/40 z-30" onClick={() => setMobilePanelOpen(false)} />
              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="md:hidden fixed bottom-[108px] left-0 right-0 z-40 bg-[#0f1420] border-t border-white/10 rounded-t-2xl max-h-[60vh] flex flex-col"
              >
                {/* Drag handle */}
                <div className="flex justify-center pt-2 pb-1 shrink-0">
                  <div className="w-10 h-1 bg-white/20 rounded-full" />
                </div>
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 pb-2 shrink-0">
                  <h3 className="text-sm font-bold text-white">
                    {activePanel === 'sources' && 'Fuentes'}
                    {activePanel === 'scenes' && 'Escenas'}
                    {activePanel === 'chat' && 'Chat'}
                    {activePanel === 'settings' && 'Ajustes'}
                  </h3>
                  <button onClick={() => setMobilePanelOpen(false)} className="p-1 text-blue-300 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Panel content */}
                <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                  {activePanel === 'sources' && <PanelSources />}
                  {activePanel === 'scenes' && <PanelScenes />}
                  {activePanel === 'chat' && <PanelChat />}
                  {activePanel === 'settings' && <PanelSettings />}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ MOBILE BOTTOM BAR ═══ */}
      <div className="md:hidden shrink-0 bg-[#0d1117] border-t border-white/5 pb-[env(safe-area-inset-bottom)]">
        {/* Source toggles + GO LIVE row */}
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <div className="flex items-center gap-1.5">
            <button onClick={cameraEnabled ? stopCamera : requestCamera}
              className={`p-2 rounded-lg transition-all ${cameraEnabled ? 'bg-green-900/20 text-green-400' : 'bg-slate-800 text-blue-400/50'}`}>
              {cameraEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button onClick={() => setMicEnabled(!micEnabled)}
              className={`p-2 rounded-lg transition-all ${micEnabled ? 'bg-cyan-900/20 text-cyan-400' : 'bg-red-900/20 text-red-400'}`}>
              {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button onClick={screenEnabled ? stopScreen : requestScreen}
              className={`p-2 rounded-lg transition-all ${screenEnabled ? 'bg-purple-900/20 text-purple-400' : 'bg-slate-800 text-blue-400/50'}`}>
              <Monitor className="w-4 h-4" />
            </button>
            {/* Record */}
            {!isRecording ? (
              <button onClick={startRecording} disabled={!compositeStream}
                className="p-2 rounded-lg bg-slate-800 text-blue-400/50 disabled:opacity-30">
                <Circle className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={stopRecording}
                className="p-2 rounded-lg bg-red-900/30 text-red-400 animate-pulse">
                <Square className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* GO LIVE / END */}
          {!isLive ? (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleGoLive}
              disabled={!title.trim() || (!cameraEnabled && !screenEnabled)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 disabled:from-slate-700 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-lg transition-all">
              <Radio className="w-3.5 h-3.5" /> EN VIVO
            </motion.button>
          ) : (
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleEndStream}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-800 to-red-700 text-white font-bold text-xs rounded-lg transition-all">
              <Square className="w-3.5 h-3.5" /> PARAR
            </motion.button>
          )}
        </div>
        {/* Panel tabs row */}
        <div className="flex items-center justify-around px-2 pb-1.5">
          {panelTabs.map(tab => (
            <button key={tab.id} onClick={() => toggleMobilePanel(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                activePanel === tab.id && mobilePanelOpen ? 'text-cyan-400' : 'text-blue-400/50'
              }`}>
              <tab.icon className="w-4 h-4" />
              <span className="text-[9px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StreamStudioPage;
