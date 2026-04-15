import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, Camera, FlipHorizontal2 as FlipCamera, Zap, ZapOff, Image,
  Radio, Type, Send, Circle, Square, ChevronDown, ChevronUp,
  Sparkles, Video, StopCircle, Check, RotateCcw, Download,
  Volume2, Mic, MicOff, Eye, Heart, MessageCircle, Clock, UserX, Shield, Fish, Gift,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ─────────────────────────────────────────────────────
// Instagram-like Camera Page
// Modes: HISTORIA (photo/video) | TEXTO | EN VIVO
// ─────────────────────────────────────────────────────

const MODES = ['EN VIVO', 'HISTORIA', 'TEXTO'];

const TEXT_BACKGROUNDS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
];

const TEXT_COLORS = [
  '#ffffff', '#000000', '#ff4444', '#44ff44', '#4444ff',
  '#ffff44', '#ff44ff', '#44ffff', '#ff8844', '#8844ff',
];

const LIVE_CATEGORIES = ['Pesca', 'Carpfishing', 'Spinning', 'Tutorials', 'Unboxing', 'Cocina', 'Naturaleza'];
const FRAME_MSG_PREFIX = '__frame__:';
const LIKE_MSG_PREFIX = '__like__:';

const getInitials = (value) => {
  const text = (value || '').trim();
  if (!text) return '?';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const getAvatarToneClass = (seed = '') => {
  const tones = [
    'bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/20',
    'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/20',
    'bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/20',
    'bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-500/20',
    'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/20',
    'bg-rose-500/20 text-rose-200 ring-1 ring-rose-500/20',
  ];
  const key = `${seed}`;
  const index = Array.from(key).reduce((acc, char) => acc + char.charCodeAt(0), 0) % tones.length;
  return tones[index];
};

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

const escapeXml = (value = '') => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const extractGradientColors = (gradient) => {
  const matches = (gradient || '').match(/#(?:[0-9a-fA-F]{3}){1,2}/g) || [];
  if (matches.length >= 2) return [matches[0], matches[1]];
  if (matches.length === 1) return [matches[0], matches[0]];
  return ['#667eea', '#764ba2'];
};

const buildTextStorySvgBlob = ({ text, background, color, size, bold }) => {
  const [fromColor, toColor] = extractGradientColors(background);
  const safeLines = (text || 'Tu historia')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6);

  const lines = safeLines.length > 0 ? safeLines : ['Tu historia'];
  const initialY = 900 - ((lines.length - 1) * (size * 1.35)) / 2;

  const tspans = lines
    .map((line, idx) => `<tspan x="540" y="${initialY + idx * (size * 1.35)}">${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${fromColor}" />
      <stop offset="100%" stop-color="${toColor}" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <text x="540" y="900" fill="${color || '#ffffff'}" text-anchor="middle" font-size="${size || 24}" font-weight="${bold ? 700 : 400}" font-family="system-ui, -apple-system, Segoe UI, sans-serif">
    ${tspans}
  </text>
</svg>`;

  return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
};

const FishGiftAnimation = ({ id, label, value, onComplete }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.15, x: 0, y: 140 }}
    animate={{
      opacity: [0, 1, 1, 0],
      scale: [0.15, 1.12, 1.2, 0.75],
      x: [0, -120, 120, 0],
      y: [140, -170, 10, 180],
      rotate: [0, -22, 18, 0],
    }}
    transition={{ duration: 2.05, times: [0, 0.28, 0.62, 1], ease: 'easeInOut' }}
    onAnimationComplete={() => onComplete(id)}
    className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
  >
    <div className="relative flex flex-col items-center">
      {[
        { x: -62, y: -34, delay: 0.03 },
        { x: 68, y: -24, delay: 0.08 },
        { x: -48, y: 42, delay: 0.12 },
        { x: 56, y: 50, delay: 0.16 },
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
          transition={{ duration: 1.1, delay: particle.delay, ease: 'easeOut' }}
          className="absolute h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.95)]"
        />
      ))}

      <motion.div
        initial={{ opacity: 0.12, scale: 0.4 }}
        animate={{ opacity: [0.12, 0.95, 0], scale: [0.4, 1.45, 1.9] }}
        transition={{ duration: 2.05, times: [0, 0.34, 1], ease: 'easeOut' }}
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
        initial={{ opacity: 0, scale: 0.75 }}
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

const CameraPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Determine initial mode from URL param (?mode=live | story | text)
  const initialMode = (() => {
    const p = searchParams.get('mode');
    if (p === 'live') return 'EN VIVO';
    if (p === 'text') return 'TEXTO';
    return 'HISTORIA';
  })();

  // ── Core State ──
  const [mode, setMode] = useState(initialMode);
  const [facingMode, setFacingMode] = useState('user'); // user | environment
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // ── Story State ──
  const [capturedPhoto, setCapturedPhoto] = useState(null); // data URL
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState(null); // Blob
  const [recordedVideoURL, setRecordedVideoURL] = useState(null);
  const [galleryFile, setGalleryFile] = useState(null);
  const [galleryPreview, setGalleryPreview] = useState(null);
  const [galleryType, setGalleryType] = useState(''); // image | video
  const [storyText, setStoryText] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);

  // ── Text Story State ──
  const [textContent, setTextContent] = useState('');
  const [textBg, setTextBg] = useState(TEXT_BACKGROUNDS[0]);
  const [textColor, setTextColor] = useState('#ffffff');
  const [textSize, setTextSize] = useState(24);
  const [textBold, setTextBold] = useState(false);

  // ── Live State ──
  const [liveTitle, setLiveTitle] = useState('');
  const [liveCategory, setLiveCategory] = useState('Pesca');
  const [isLive, setIsLive] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveViewers, setLiveViewers] = useState(0);
  const [liveLikes, setLiveLikes] = useState(0);
  const smoothLiveViewers = useSmoothCounter(liveViewers);
  const smoothLiveLikes = useSmoothCounter(liveLikes);
  const prevLiveViewersRef = useRef(0);
  const prevLiveLikesRef = useRef(0);
  const viewerPulseTimeoutRef = useRef(null);
  const likePulseTimeoutRef = useRef(null);
  const [liveViewerPulseLevel, setLiveViewerPulseLevel] = useState('idle'); // idle | small | medium | big
  const [liveLikePulseLevel, setLiveLikePulseLevel] = useState('idle'); // idle | small | medium | big
  const [liveViewerPulseKey, setLiveViewerPulseKey] = useState(0);
  const [liveLikePulseKey, setLiveLikePulseKey] = useState(0);
  const [showLiveSetup, setShowLiveSetup] = useState(true);
  const [showViewersPanel, setShowViewersPanel] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [liveAudience, setLiveAudience] = useState([]);
  const [liveMutedUserIds, setLiveMutedUserIds] = useState(new Set());
  const [liveModeratorUserIds, setLiveModeratorUserIds] = useState(new Set());
  const [startingLive, setStartingLive] = useState(false);
  const [liveChatMessages, setLiveChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [fishGiftAnimations, setFishGiftAnimations] = useState([]);
  const liveDonationMessages = liveChatMessages
    .filter((msg) => /dono\s+.+?\s+\(\d+\s*pts\)/i.test(msg.message || ''))
    .slice(-5)
    .reverse();
  const liveDonationCount = liveDonationMessages.length;

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const galleryInputRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const liveStatsChannelRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const textareaRef = useRef(null);
  const chatPanelRef = useRef(null);
  const liveChatChannelRef = useRef(null);
  const liveFrameIntervalRef = useRef(null);
  const liveFrameCanvasRef = useRef(null);
  const liveChatMessageIdsRef = useRef(new Set());
  const liveChatHydratedRef = useRef(false);

  useEffect(() => {
    const previous = prevLiveViewersRef.current;
    const current = liveViewers || 0;
    const delta = current - previous;

    if (delta > 0) {
      const level = delta >= 5 ? 'big' : delta >= 2 ? 'medium' : 'small';
      setLiveViewerPulseLevel(level);
      setLiveViewerPulseKey((prev) => prev + 1);
      if (viewerPulseTimeoutRef.current) clearTimeout(viewerPulseTimeoutRef.current);
      viewerPulseTimeoutRef.current = setTimeout(() => {
        setLiveViewerPulseLevel('idle');
      }, level === 'big' ? 820 : level === 'medium' ? 620 : 420);
    }

    prevLiveViewersRef.current = current;
  }, [liveViewers]);

  useEffect(() => {
    const previous = prevLiveLikesRef.current;
    const current = liveLikes || 0;
    const delta = current - previous;

    if (delta > 0) {
      const level = delta >= 5 ? 'big' : delta >= 2 ? 'medium' : 'small';
      setLiveLikePulseLevel(level);
      setLiveLikePulseKey((prev) => prev + 1);
      if (likePulseTimeoutRef.current) clearTimeout(likePulseTimeoutRef.current);
      likePulseTimeoutRef.current = setTimeout(() => {
        setLiveLikePulseLevel('idle');
      }, level === 'big' ? 840 : level === 'medium' ? 640 : 440);
    }

    prevLiveLikesRef.current = current;
  }, [liveLikes]);

  useEffect(() => {
    if (!isLive) return;
    setShowViewersPanel(false);
    setShowChatPanel(true);
  }, [isLive, liveAudience.length, liveChatMessages.length]);

  useEffect(() => {
    return () => {
      if (viewerPulseTimeoutRef.current) clearTimeout(viewerPulseTimeoutRef.current);
      if (likePulseTimeoutRef.current) clearTimeout(likePulseTimeoutRef.current);
    };
  }, []);

  const removeFishAnimation = useCallback((id) => {
    setFishGiftAnimations((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const spawnFishAnimation = useCallback((label, value, key) => {
    setFishGiftAnimations((prev) => {
      if (prev.some((item) => item.id === key)) return prev;
      return [...prev, { id: key, label, value }].slice(-4);
    });
  }, []);

  const closeLiveStatsChannel = useCallback(() => {
    if (liveStatsChannelRef.current) {
      supabase.removeChannel(liveStatsChannelRef.current);
      liveStatsChannelRef.current = null;
    }
  }, []);

  const fetchStreamCounters = useCallback(async (streamId) => {
    if (!streamId) return { viewer_count: 0, like_count: 0 };

    const { data } = await supabase
      .from('live_streams')
      .select('viewer_count, like_count')
      .eq('id', streamId)
      .maybeSingle();

    return {
      viewer_count: data?.viewer_count || 0,
      like_count: data?.like_count || 0,
    };
  }, []);

  const fetchLiveAudience = useCallback(async (streamId) => {
    if (!streamId) return;
    const streamCounters = await fetchStreamCounters(streamId);

    const { data: viewersData, error: viewersError } = await supabase
      .from('live_stream_viewers')
      .select('user_id, created_at')
      .eq('stream_id', streamId);

    if (viewersError) {
      console.error('Audience fetch error:', viewersError);
      setLiveViewers(streamCounters.viewer_count);
      return;
    }

    const rows = viewersData || [];
    // Some RLS setups can restrict row visibility for host, so keep the maximum available value.
    setLiveViewers(Math.max(rows.length, streamCounters.viewer_count));

    const uniqueIds = [...new Set(rows.map(v => v.user_id).filter(Boolean))];
    if (uniqueIds.length === 0) {
      // If host cannot read live_stream_viewers rows due to RLS, keep known spectators
      // and try to infer active users from recent chat activity.
      if ((streamCounters.viewer_count || 0) === 0) {
        setLiveAudience([]);
        return;
      }

      const { data: recentChat } = await supabase
        .from('live_chat_messages')
        .select('user_id, message, created_at')
        .eq('stream_id', streamId)
        .order('created_at', { ascending: false })
        .limit(120);

      const recentUserIds = [...new Set((recentChat || [])
        .filter((m) => {
          const text = m.message || '';
          return !text.startsWith(FRAME_MSG_PREFIX) && !text.startsWith(LIKE_MSG_PREFIX);
        })
        .map((m) => m.user_id)
        .filter(Boolean))];

      if (recentUserIds.length > 0) {
        const { data: chatProfiles } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .in('id', recentUserIds);

        const chatProfileMap = (chatProfiles || []).reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});

        setLiveAudience((prev) => {
          const prevMap = (prev || []).reduce((acc, item) => {
            acc[item.user_id] = item;
            return acc;
          }, {});

          return recentUserIds.map((uid) => ({
            user_id: uid,
            profile: chatProfileMap[uid] || prevMap[uid]?.profile || { id: uid, username: 'usuario' },
          }));
        });
      }
      return;
    }

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, username, nombre, foto_perfil')
      .in('id', uniqueIds);

    const profileMap = (profilesData || []).reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    setLiveAudience(uniqueIds.map(uid => ({
      user_id: uid,
      profile: profileMap[uid] || { id: uid, username: 'usuario' },
    })));
  }, [fetchStreamCounters]);

  const fetchLiveLikes = useCallback(async (streamId) => {
    if (!streamId) return;
    const streamCounters = await fetchStreamCounters(streamId);
    const { count } = await supabase
      .from('live_chat_messages')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId)
      .like('message', `${LIKE_MSG_PREFIX}%`);
    setLiveLikes(Math.max(count || 0, streamCounters.like_count));
  }, [fetchStreamCounters]);

  const refreshLivePresence = useCallback(async (streamId) => {
    if (!streamId) return;
    await Promise.all([
      fetchLiveAudience(streamId),
      fetchLiveLikes(streamId),
    ]);
  }, [fetchLiveAudience, fetchLiveLikes]);

  // Fallback polling for host monitor in case realtime websocket fails.
  useEffect(() => {
    if (!isLive || !streamData?.id) return;

    const pollId = setInterval(() => {
      refreshLivePresence(streamData.id);
    }, 1800);

    return () => clearInterval(pollId);
  }, [isLive, streamData?.id, refreshLivePresence]);

  const fetchMutedUsers = useCallback(async (streamId) => {
    if (!streamId) return;
    const { data, error } = await supabase
      .from('live_stream_mutes')
      .select('user_id')
      .eq('stream_id', streamId);

    if (error) {
      if (error.code !== '42P01') console.error('Muted users fetch error:', error);
      setLiveMutedUserIds(new Set());
      return;
    }

    setLiveMutedUserIds(new Set((data || []).map((row) => row.user_id)));
  }, []);

  const fetchModeratorUsers = useCallback(async (streamId) => {
    if (!streamId) return;
    const { data, error } = await supabase
      .from('live_stream_moderators')
      .select('user_id')
      .eq('stream_id', streamId);

    if (error) {
      if (error.code !== '42P01') console.error('Moderators fetch error:', error);
      setLiveModeratorUserIds(new Set());
      return;
    }

    setLiveModeratorUserIds(new Set((data || []).map((row) => row.user_id)));
  }, []);

  // ═══════════════════════════════════════════════════════
  // Camera management
  // ═══════════════════════════════════════════════════════
  const startCamera = useCallback(async (facing) => {
    // Stop previous stream
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
    }
    setCameraReady(false);
    setCameraError(null);

    try {
      const constraints = {
        video: {
          facingMode: facing || facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraReady(true);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(err.message || 'No se pudo acceder a la cámara');
    }
  }, [facingMode, cameraStream]);

  // Start camera on mount (only for HISTORIA and EN VIVO modes)
  useEffect(() => {
    if (mode !== 'TEXTO') {
      startCamera('user');
    }
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When mode changes to TEXTO, we can optionally stop camera
  useEffect(() => {
    if (mode === 'TEXTO' && cameraStream) {
      // Keep camera running for smooth transition back
    }
  }, [mode]);

  // Assign stream to video element whenever it changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const flipCamera = async () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    await startCamera(newFacing);
  };

  // ═══════════════════════════════════════════════════════
  // Story: Capture photo
  // ═══════════════════════════════════════════════════════
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    // Mirror if front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.92));
  };

  // ═══════════════════════════════════════════════════════
  // Story: Record video
  // ═══════════════════════════════════════════════════════
  const startVideoRecording = () => {
    if (!cameraStream) return;
    recordedChunksRef.current = [];
    setRecordDuration(0);

    try {
      const mr = new MediaRecorder(cameraStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : 'video/webm',
      });
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        setRecordedVideoURL(URL.createObjectURL(blob));
      };
      mr.start(200);
      mediaRecorderRef.current = mr;
      setIsRecordingVideo(true);

      // Duration counter
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration(d => d + 1);
      }, 1000);
    } catch (err) {
      console.error('Recording error:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo iniciar la grabación' });
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVideo(false);
    clearInterval(recordIntervalRef.current);
  };

  // ═══════════════════════════════════════════════════════
  // Gallery picker
  // ═══════════════════════════════════════════════════════
  const handleGallerySelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'Archivo muy grande', description: 'Máximo 50MB' });
      return;
    }
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setGalleryFile(file);
    setGalleryType(type);
    setGalleryPreview(URL.createObjectURL(file));
  };

  // ═══════════════════════════════════════════════════════
  // Reset / discard captured content
  // ═══════════════════════════════════════════════════════
  const discardCapture = () => {
    setCapturedPhoto(null);
    setRecordedVideo(null);
    setRecordedVideoURL(null);
    setGalleryFile(null);
    setGalleryPreview(null);
    setGalleryType('');
    setStoryText('');
    setRecordDuration(0);
  };

  // ═══════════════════════════════════════════════════════
  // Publish Story (photo, video, gallery, or text)
  // ═══════════════════════════════════════════════════════
  const publishStory = async () => {
    if (!user?.id) return;
    setPublishing(true);

    try {
      let mediaUrl = null;

      if (mode === 'TEXTO') {
        // Text-only story — no media to upload
        const svgBlob = buildTextStorySvgBlob({
          text: textContent,
          background: textBg,
          color: textColor,
          size: textSize,
          bold: textBold,
        });

        const fileName = `stories/${user.id}/${Date.now()}_text.svg`;
        const { error: uploadError } = await supabase.storage
          .from('stories')
          .upload(fileName, svgBlob, { contentType: 'image/svg+xml' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stories')
          .getPublicUrl(fileName);

        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          image_url: publicUrl,
          content: JSON.stringify({ text: textContent, bg: textBg, color: textColor, size: textSize, bold: textBold }),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      } else {
        // Determine file to upload
        let fileToUpload = null;
        let ext = 'jpg';

        if (galleryFile) {
          fileToUpload = galleryFile;
          ext = galleryFile.name.split('.').pop().toLowerCase();
        } else if (capturedPhoto) {
          // Convert data URL to blob
          const res = await fetch(capturedPhoto);
          fileToUpload = await res.blob();
          ext = 'jpg';
        } else if (recordedVideo) {
          fileToUpload = recordedVideo;
          ext = 'webm';
        } else {
          toast({ variant: 'destructive', title: 'Sin contenido', description: 'Captura una foto o graba un vídeo' });
          setPublishing(false);
          return;
        }

        const fileName = `stories/${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('stories').upload(fileName, fileToUpload);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('stories').getPublicUrl(fileName);
        mediaUrl = publicUrl;

        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          image_url: mediaUrl,
          content: storyText || null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
        if (error) throw error;
      }

      toast({ title: '¡Historia publicada!', description: 'Visible durante 24 horas' });
      navigate('/feed');
    } catch (err) {
      console.error('Publish error:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message || 'No se pudo publicar' });
    } finally {
      setPublishing(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // Live: Start / End stream
  // ═══════════════════════════════════════════════════════
  const handleGoLive = async () => {
    if (!user?.id || !liveTitle.trim() || startingLive) return;
    
    setStartingLive(true);

    try {
      const nowIso = new Date().toISOString();

      // Always close any previous active stream from this user to avoid ghost streams.
      await supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: nowIso,
        })
        .eq('user_id', user.id)
        .eq('is_live', true);

      const { data: createdStream, error: createError } = await supabase
        .from('live_streams')
        .insert({
          user_id: user.id,
          title: liveTitle.trim(),
          category: liveCategory,
          is_live: true,
          started_at: nowIso,
          viewer_count: 0,
          like_count: 0,
        })
        .select()
        .single();

      if (createError || !createdStream) {
        throw new Error(`No se pudo crear el directo: ${createError?.message || 'respuesta vacia'}`);
      }

      if (!createdStream) {
        throw new Error('No se pudo crear o recuperar la transmisión');
      }

      // Notify followers that this user has started a live stream.
      try {
        const { data: followerRows, error: followerError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', user.id);

        if (followerError) throw followerError;

        const followerIds = [...new Set((followerRows || []).map((row) => row.follower_id).filter(Boolean))];
        if (followerIds.length > 0) {
          const notificationsPayload = followerIds.map((followerId) => ({
            user_id: followerId,
            type: 'live_started',
            related_user_id: user.id,
            post_id: null,
            read: false,
          }));

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notificationsPayload);

          if (notificationError) throw notificationError;
        }
      } catch (notifyErr) {
        console.warn('Could not notify followers about live start:', notifyErr?.message || notifyErr);
      }

      setStreamData(createdStream);
      setIsLive(true);
      setShowLiveSetup(false);
      // Open live control panels by default so broadcaster can monitor viewers and chat immediately.
      setShowViewersPanel(false);
      setShowChatPanel(true);
      setLiveDuration(0);
      setLiveViewers(0);
      setLiveLikes(0);
      setLiveAudience([]);
      setLiveMutedUserIds(new Set());
      setLiveModeratorUserIds(new Set());
      setLiveChatMessages([]);
      setNewChatMessage('');
      setFishGiftAnimations([]);
      liveChatMessageIdsRef.current = new Set();
      liveChatHydratedRef.current = false;

      // Duration counter
      liveIntervalRef.current = setInterval(() => {
        setLiveDuration(d => d + 1);
      }, 1000);

      // Subscribe to stats
      const finalStreamId = createdStream?.id;
      if (finalStreamId) {
        await fetchLiveAudience(finalStreamId);
        await fetchLiveLikes(finalStreamId);
        await fetchMutedUsers(finalStreamId);
        await fetchModeratorUsers(finalStreamId);

        closeLiveStatsChannel();
        const channel = supabase.channel(`camera-live-stats-${finalStreamId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_viewers', filter: `stream_id=eq.${finalStreamId}` }, (payload) => {
            if (payload?.eventType === 'INSERT') {
              setLiveViewers((prev) => prev + 1);
              const newUserId = payload?.new?.user_id;
              if (newUserId) {
                supabase
                  .from('profiles')
                  .select('id, username, nombre, foto_perfil')
                  .eq('id', newUserId)
                  .maybeSingle()
                  .then(({ data: p }) => {
                    setLiveAudience((prev) => {
                      if ((prev || []).some((v) => v.user_id === newUserId)) return prev;
                      return [
                        ...prev,
                        {
                          user_id: newUserId,
                          profile: p || { id: newUserId, username: 'usuario' },
                        },
                      ];
                    });
                  });
              }
            } else if (payload?.eventType === 'DELETE') {
              setLiveViewers((prev) => Math.max(0, prev - 1));
              const oldUserId = payload?.old?.user_id;
              if (oldUserId) {
                setLiveAudience((prev) => (prev || []).filter((v) => v.user_id !== oldUserId));
              }
            }
            fetchLiveAudience(finalStreamId);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_likes', filter: `stream_id=eq.${finalStreamId}` }, () => {
            fetchLiveLikes(finalStreamId);
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_chat_messages', filter: `stream_id=eq.${finalStreamId}` }, () => {
            // Chat insert should keep broadcaster view warm without requiring refresh.
            refreshLivePresence(finalStreamId);
          })
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_streams', filter: `id=eq.${finalStreamId}` }, () => {
            refreshLivePresence(finalStreamId);
          })
          .subscribe();
        liveStatsChannelRef.current = channel;
      }

      toast({ title: '¡Directo iniciado!', description: 'Tu transmisión está en vivo.' });
    } catch (err) {
      console.error('Go live error:', err);
      toast({ variant: 'destructive', title: 'Error al iniciar directo', description: err.message || 'Inténtalo de nuevo.' });
    } finally {
      setStartingLive(false);
    }
  };

  const handleKickViewer = async (viewerId) => {
    if (!streamData?.id || !viewerId) return;
    try {
      const { error: banError } = await supabase
        .from('live_stream_bans')
        .upsert(
          {
            stream_id: streamData.id,
            user_id: viewerId,
            created_by: user?.id || null,
          },
          { onConflict: 'stream_id,user_id' }
        );

      // If the bans table doesn't exist yet, keep current behavior (kick only).
      if (banError && banError.code !== '42P01') {
        console.error('Ban viewer error:', banError);
      }

      const { error } = await supabase
        .from('live_stream_viewers')
        .delete()
        .eq('stream_id', streamData.id)
        .eq('user_id', viewerId);

      if (error) throw error;

      toast({ title: 'Espectador expulsado', description: 'Se ha retirado del directo.' });
      await fetchLiveAudience(streamData.id);
    } catch (err) {
      console.error('Kick viewer error:', err);
      toast({ variant: 'destructive', title: 'No se pudo expulsar', description: err.message || 'Inténtalo de nuevo.' });
    }
  };

  const handleToggleMuteViewer = async (viewerId) => {
    if (!streamData?.id || !viewerId) return;
    const isMuted = liveMutedUserIds.has(viewerId);
    try {
      if (isMuted) {
        const { error } = await supabase
          .from('live_stream_mutes')
          .delete()
          .eq('stream_id', streamData.id)
          .eq('user_id', viewerId);

        if (error && error.code !== '42P01') throw error;
      } else {
        const { error } = await supabase
          .from('live_stream_mutes')
          .upsert(
            { stream_id: streamData.id, user_id: viewerId, created_by: user?.id || null },
            { onConflict: 'stream_id,user_id' }
          );

        if (error) {
          if (error.code === '42P01') {
            toast({ variant: 'destructive', title: 'Falta configurar silencios', description: 'Ejecuta setup-live-stream-moderation.sql en Supabase.' });
            return;
          }
          throw error;
        }
      }

      await fetchMutedUsers(streamData.id);
    } catch (err) {
      console.error('Mute viewer error:', err);
      toast({ variant: 'destructive', title: 'No se pudo actualizar el silencio', description: err.message || 'Inténtalo de nuevo.' });
    }
  };

  const handleToggleModerator = async (viewerId) => {
    if (!streamData?.id || !viewerId) return;
    const isModerator = liveModeratorUserIds.has(viewerId);

    try {
      if (isModerator) {
        const { error } = await supabase
          .from('live_stream_moderators')
          .delete()
          .eq('stream_id', streamData.id)
          .eq('user_id', viewerId);

        if (error && error.code !== '42P01') throw error;
      } else {
        const { error } = await supabase
          .from('live_stream_moderators')
          .upsert(
            { stream_id: streamData.id, user_id: viewerId, created_by: user?.id || null },
            { onConflict: 'stream_id,user_id' }
          );

        if (error) {
          if (error.code === '42P01') {
            toast({ variant: 'destructive', title: 'Falta configurar moderadores', description: 'Ejecuta setup-live-stream-moderation.sql en Supabase.' });
            return;
          }
          throw error;
        }
      }

      await fetchModeratorUsers(streamData.id);
    } catch (err) {
      console.error('Moderator toggle error:', err);
      toast({ variant: 'destructive', title: 'No se pudo actualizar moderador', description: err.message || 'Inténtalo de nuevo.' });
    }
  };

  const handleSendChatMessage = async () => {
    if (!newChatMessage.trim() || !user?.id || !streamData?.id) return;

    try {
      await supabase.from('live_chat_messages').insert({
        stream_id: streamData.id,
        user_id: user.id,
        message: newChatMessage.trim(),
      });
      setNewChatMessage('');
    } catch (err) {
      console.error('Error sending chat message:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje.' });
    }
  };

  const handleEndLive = async () => {
    clearInterval(liveIntervalRef.current);
    if (liveFrameIntervalRef.current) {
      clearInterval(liveFrameIntervalRef.current);
      liveFrameIntervalRef.current = null;
    }
    closeLiveStatsChannel();
    if (streamData?.id) {
      await supabase.from('live_stream_viewers').delete().eq('stream_id', streamData.id);
      await supabase.from('live_stream_likes').delete().eq('stream_id', streamData.id);
      await supabase.from('live_chat_messages').delete().eq('stream_id', streamData.id);
      await supabase.from('live_stream_gifts').delete().eq('stream_id', streamData.id);
      await supabase.from('live_stream_bans').delete().eq('stream_id', streamData.id);
      await supabase.from('live_stream_mutes').delete().eq('stream_id', streamData.id);
      await supabase.from('live_stream_moderators').delete().eq('stream_id', streamData.id);
      await supabase.from('live_streams').update({
        is_live: false,
        ended_at: new Date().toISOString(),
      }).eq('id', streamData.id);
    }
    setIsLive(false);
    setStreamData(null);
    setShowLiveSetup(true);
    setShowViewersPanel(false);
    setLiveDuration(0);
    setLiveViewers(0);
    setLiveLikes(0);
    setLiveAudience([]);
    setLiveMutedUserIds(new Set());
    setLiveModeratorUserIds(new Set());
    setLiveChatMessages([]);
    setFishGiftAnimations([]);
    liveChatMessageIdsRef.current = new Set();
    liveChatHydratedRef.current = false;
    navigate('/live');
  };

  // Subscribe to chat messages in real-time when live
  useEffect(() => {
    if (!streamData?.id) return;
    let active = true;

    setLiveChatMessages([]);
    liveChatMessageIdsRef.current = new Set();
    liveChatHydratedRef.current = false;

    const fetchChat = async () => {
      try {
        const { data } = await supabase
          .from('live_chat_messages')
          .select('*')
          .eq('stream_id', streamData.id)
          .order('created_at', { ascending: true })
          .limit(200);

        const chatRows = (data || []).filter((m) => {
          const text = m.message || '';
          return !text.startsWith(FRAME_MSG_PREFIX) && !text.startsWith(LIKE_MSG_PREFIX);
        });

        if (active) {
          if (!liveChatHydratedRef.current) {
            liveChatMessageIdsRef.current = new Set(chatRows.map((m) => m.id));
            liveChatHydratedRef.current = true;
          }

          const userIds = [...new Set(chatRows.map(m => m.user_id))];
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username, nombre, foto_perfil')
              .in('id', userIds);

            const pMap = {};
            (profiles || []).forEach(p => { pMap[p.id] = p; });

            setLiveChatMessages(chatRows.map(m => ({
              ...m,
              user: pMap[m.user_id] || { id: m.user_id, username: 'Usuario' }
            })));
          } else {
            setLiveChatMessages(chatRows);
          }
        }
      } catch (err) {
        console.error('Error fetching chat:', err);
      }
    };

    fetchChat();

    const pollId = setInterval(() => {
      fetchChat();
      if (streamData?.id) {
        refreshLivePresence(streamData.id);
      }
    }, 1800);

    const channel = supabase
      .channel(`camera-chat-${streamData.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamData.id}`,
      }, async (payload) => {
        const msg = payload.new;
        if ((msg.message || '').startsWith(FRAME_MSG_PREFIX) || (msg.message || '').startsWith(LIKE_MSG_PREFIX)) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .eq('id', msg.user_id)
          .single();

        if (active) {
          const messageText = msg.message || '';
          if (liveChatHydratedRef.current && !liveChatMessageIdsRef.current.has(msg.id)) {
            const fishMatch = messageText.match(/dono\s+(.+?)\s+\((\d+)\s*pts\)/i);
            if (fishMatch) {
              spawnFishAnimation(fishMatch[1], Number(fishMatch[2]) || 0, `chat-${msg.id}`);
            }
          }

          liveChatMessageIdsRef.current = new Set([...liveChatMessageIdsRef.current, msg.id]);
          setLiveChatMessages(prev => [
            ...prev.slice(-200),
            { ...msg, user: profile || { id: msg.user_id, username: 'Usuario' } }
          ]);
        }
      })
      .subscribe();

    liveChatChannelRef.current = channel;

    return () => {
      active = false;
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [streamData?.id, spawnFishAnimation, refreshLivePresence]);

  // Simple camera broadcast fallback: send periodic frame snapshots to this stream.
  useEffect(() => {
    if (!isLive || !streamData?.id || !user?.id || mode !== 'EN VIVO') return;

    if (!liveFrameCanvasRef.current) {
      liveFrameCanvasRef.current = document.createElement('canvas');
    }

    if (liveFrameIntervalRef.current) {
      clearInterval(liveFrameIntervalRef.current);
      liveFrameIntervalRef.current = null;
    }

    liveFrameIntervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) return;

      try {
        const canvas = liveFrameCanvasRef.current;
        // Optimized dimensions: 512px width for faster processing & transmission
        const targetWidth = 512;
        const ratio = video.videoHeight / video.videoWidth;
        const targetHeight = Math.max(360, Math.round(targetWidth * ratio));

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (facingMode === 'user') {
          ctx.save();
          ctx.translate(targetWidth, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        }

        // Optimized frame capture: higher quality, faster interval for smooth streaming
        // 512px @ 0.70 quality every 300ms = ~3.3 FPS smooth playback
        const frame = canvas.toDataURL('image/webp', 0.70);
        await supabase.from('live_chat_messages').insert({
          stream_id: streamData.id,
          user_id: user.id,
          message: `${FRAME_MSG_PREFIX}${frame}`,
        });
      } catch (err) {
        console.error('Error sending frame fallback:', err);
      }
    }, 300);

    return () => {
      if (liveFrameIntervalRef.current) {
        clearInterval(liveFrameIntervalRef.current);
        liveFrameIntervalRef.current = null;
      }
    };
  }, [isLive, streamData?.id, user?.id, mode, facingMode]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatPanelRef.current) {
      chatPanelRef.current.scrollTop = chatPanelRef.current.scrollHeight;
    }
  }, [liveChatMessages]);

  // While live, block browser/tab exits and back navigation to avoid ghost streams.
  useEffect(() => {
    if (!isLive) return;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    const handlePopState = () => {
      window.history.pushState({ liveLocked: true }, '', window.location.href);
      toast({
        variant: 'destructive',
        title: 'No puedes salir del directo',
        description: 'Finaliza el directo primero para salir.',
      });
    };

    window.history.pushState({ liveLocked: true }, '', window.location.href);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isLive, toast]);

  // Emergency fallback: if component unmounts while stream is still live, mark it ended.
  useEffect(() => {
    return () => {
      if (!isLive || !streamData?.id) return;
      supabase
        .from('live_streams')
        .update({
          is_live: false,
          ended_at: new Date().toISOString(),
        })
        .eq('id', streamData.id);
    };
  }, [isLive, streamData?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(liveIntervalRef.current);
      closeLiveStatsChannel();
      clearInterval(recordIntervalRef.current);
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream, closeLiveStatsChannel]);

  // ═══════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════
  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Is viewing a captured/gallery result (not live camera)?
  const hasCapture = capturedPhoto || recordedVideoURL || galleryPreview;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden select-none">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={galleryInputRef} type="file" accept="image/*,video/*" onChange={handleGallerySelect} className="hidden" />

      {/* ═══════════════════════════════════════════════════ */}
      {/* TEXT MODE */}
      {/* ═══════════════════════════════════════════════════ */}
      {mode === 'TEXTO' && (
        <div className="flex-1 flex flex-col">
          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
            <button onClick={() => navigate(-1)} className="p-2 text-white">
              <X className="w-6 h-6" />
            </button>
            <button onClick={publishStory} disabled={publishing || !textContent.trim()}
              className="px-5 py-2 bg-white text-black font-bold text-sm rounded-full disabled:opacity-40 transition-opacity">
              {publishing ? 'Publicando...' : 'Compartir'}
            </button>
          </div>

          {/* Text canvas */}
          <div className="flex-1 flex items-center justify-center relative" style={{ background: textBg }}>
            <textarea
              ref={textareaRef}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Escribe algo..."
              className="w-full bg-transparent border-none outline-none resize-none text-center px-8 placeholder:text-white/40"
              style={{ color: textColor, fontSize: `${textSize}px`, fontWeight: textBold ? 'bold' : 'normal' }}
              rows={4}
              maxLength={200}
              autoFocus
            />
          </div>

          {/* Text controls */}
          <div className="bg-black/80 backdrop-blur-md p-3 space-y-3">
            {/* Backgrounds */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {TEXT_BACKGROUNDS.map((bg, i) => (
                <button key={i} onClick={() => setTextBg(bg)}
                  className={`w-8 h-8 rounded-full shrink-0 border-2 transition-all ${textBg === bg ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: bg }} />
              ))}
            </div>
            {/* Colors */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-[10px] text-white/50 shrink-0 mr-1">Aa</span>
              {TEXT_COLORS.map(c => (
                <button key={c} onClick={() => setTextColor(c)}
                  className={`w-6 h-6 rounded-full shrink-0 border-2 transition-all ${textColor === c ? 'border-white scale-110' : 'border-white/20'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            {/* Size + Bold */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-white/50">Tamaño</span>
              <input type="range" min={16} max={48} value={textSize} onChange={e => setTextSize(+e.target.value)}
                className="flex-1 accent-cyan-400 h-1" />
              <button onClick={() => setTextBold(!textBold)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${textBold ? 'bg-white text-black' : 'bg-white/10 text-white'}`}>
                B
              </button>
            </div>
          </div>

          {/* Mode selector at bottom */}
          <ModeSelector mode={mode} setMode={setMode} />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* CAMERA MODE (HISTORIA + EN VIVO) */}
      {/* ═══════════════════════════════════════════════════ */}
      {mode !== 'TEXTO' && (
        <div className="flex-1 min-h-0 flex flex-col relative md:flex-row md:items-stretch">
          {/* Camera Feed */}
          <div className="flex-1 min-h-0 relative bg-black overflow-hidden md:w-[calc(100%-360px)] md:min-w-0">
            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCapture ? 'hidden' : ''}`}
            />

            {!cameraStream && !cameraError && !hasCapture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-[2px] z-10">
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center shadow-2xl">
                  <div className="h-10 w-10 rounded-full border-2 border-cyan-300 border-t-transparent animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-white">Iniciando cámara</p>
                    <p className="text-[11px] text-white/55">Si tarda demasiado, revisa permisos del navegador.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Captured Photo Preview */}
            {capturedPhoto && (
              <img src={capturedPhoto} alt="Captura" className="absolute inset-0 w-full h-full object-cover" />
            )}

            {/* Recorded Video Preview */}
            {recordedVideoURL && !capturedPhoto && (
              <video src={recordedVideoURL} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
            )}

            {/* Gallery Preview */}
            {galleryPreview && !capturedPhoto && !recordedVideoURL && (
              galleryType === 'video' ? (
                <video src={galleryPreview} className="absolute inset-0 w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={galleryPreview} alt="Galería" className="absolute inset-0 w-full h-full object-cover" />
              )
            )}

            {/* Camera error */}
            {cameraError && !hasCapture && (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="text-center px-6">
                  <Camera className="w-12 h-12 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">{cameraError}</p>
                  <button onClick={() => startCamera(facingMode)} className="mt-3 px-4 py-2 bg-white/10 text-white text-sm rounded-full">
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {/* ── Top controls overlay ── */}
            <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
              <button onClick={async () => {
                if (isLive) {
                  await handleEndLive();
                  return;
                }
                if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
                navigate(-1);
              }}
                className="p-2 text-white">
                <X className="w-6 h-6" />
              </button>

              {/* Live status badges */}
              {mode === 'EN VIVO' && isLive && (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                    <span className="w-1.5 h-1.5 bg-white rounded-full" /> EN VIVO
                  </span>
                  <span className="text-white text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded">{fmtTime(liveDuration)}</span>
                  <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded text-cyan-300 bg-cyan-900/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> Camara activa
                  </span>
                  <motion.button
                    type="button"
                    onClick={() => setShowViewersPanel(v => !v)}
                    animate={liveViewerPulseLevel !== 'idle'
                      ? {
                          backgroundColor: liveViewerPulseLevel === 'big'
                            ? 'rgba(16,185,129,0.36)'
                            : liveViewerPulseLevel === 'medium'
                              ? 'rgba(16,185,129,0.28)'
                              : 'rgba(16,185,129,0.2)',
                          scale: liveViewerPulseLevel === 'big'
                            ? [1, 1.1, 1]
                            : liveViewerPulseLevel === 'medium'
                              ? [1, 1.08, 1]
                              : [1, 1.05, 1],
                        }
                      : { backgroundColor: 'rgba(0,0,0,0.4)' }}
                    transition={{ duration: liveViewerPulseLevel === 'big' ? 0.64 : liveViewerPulseLevel === 'medium' ? 0.5 : 0.34, ease: 'easeOut' }}
                    className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded transition-colors ${liveViewerPulseLevel !== 'idle' ? 'text-emerald-200' : 'text-white'}`}
                    title="Ver espectadores"
                  >
                    <motion.span
                      key={`live-viewer-pulse-${liveViewerPulseKey}`}
                      animate={liveViewerPulseLevel !== 'idle'
                        ? {
                            scale: liveViewerPulseLevel === 'big'
                              ? [1, 1.34, 1]
                              : liveViewerPulseLevel === 'medium'
                                ? [1, 1.26, 1]
                                : [1, 1.18, 1],
                          }
                        : { scale: 1 }}
                      transition={{ duration: liveViewerPulseLevel === 'big' ? 0.54 : liveViewerPulseLevel === 'medium' ? 0.42 : 0.3, ease: 'easeOut' }}
                    >
                      <Eye className="w-3 h-3" />
                    </motion.span>
                    {smoothLiveViewers}
                  </motion.button>
                   <button
                     type="button"
                     onClick={() => setShowChatPanel(v => !v)}
                     className="flex items-center gap-0.5 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded hover:bg-black/60 transition-colors"
                     title="Ver chat"
                   >
                     <MessageCircle className="w-3 h-3" />{liveChatMessages.length}
                   </button>
                  <motion.span
                    animate={liveLikePulseLevel !== 'idle'
                      ? {
                          backgroundColor: liveLikePulseLevel === 'big'
                            ? 'rgba(239,68,68,0.36)'
                            : liveLikePulseLevel === 'medium'
                              ? 'rgba(239,68,68,0.28)'
                              : 'rgba(239,68,68,0.2)',
                          scale: liveLikePulseLevel === 'big'
                            ? [1, 1.1, 1]
                            : liveLikePulseLevel === 'medium'
                              ? [1, 1.08, 1]
                              : [1, 1.05, 1],
                        }
                      : { backgroundColor: 'rgba(0,0,0,0.4)' }}
                    transition={{ duration: liveLikePulseLevel === 'big' ? 0.66 : liveLikePulseLevel === 'medium' ? 0.52 : 0.36, ease: 'easeOut' }}
                    className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${liveLikePulseLevel !== 'idle' ? 'text-red-200' : 'text-red-300'}`}
                  >
                    <motion.span
                      key={`live-like-pulse-${liveLikePulseKey}`}
                      animate={liveLikePulseLevel !== 'idle'
                        ? {
                            scale: liveLikePulseLevel === 'big'
                              ? [1, 1.36, 1]
                              : liveLikePulseLevel === 'medium'
                                ? [1, 1.28, 1]
                                : [1, 1.2, 1],
                          }
                        : { scale: 1 }}
                      transition={{ duration: liveLikePulseLevel === 'big' ? 0.58 : liveLikePulseLevel === 'medium' ? 0.44 : 0.32, ease: 'easeOut' }}
                    >
                      <Heart className="w-3 h-3 fill-current" />
                    </motion.span>
                    {smoothLiveLikes}
                  </motion.span>
                </div>
              )}

              {/* Right side: flash + flip (when camera is live) */}
              {!hasCapture && !isLive && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setFlashEnabled(!flashEnabled)} className="p-2 text-white">
                    {flashEnabled ? <Zap className="w-5 h-5 text-yellow-400" /> : <ZapOff className="w-5 h-5" />}
                  </button>
                  <button onClick={flipCamera} className="p-2 text-white">
                    <FlipCamera className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Capture done → share button */}
              {hasCapture && mode === 'HISTORIA' && (
                <button onClick={publishStory} disabled={publishing}
                  className="px-5 py-2 bg-white text-black font-bold text-sm rounded-full disabled:opacity-40 transition-opacity">
                  {publishing ? 'Publicando...' : 'Compartir'}
                </button>
              )}
            </div>

            {/* Recording indicator */}
            {isRecordingVideo && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-red-600/80 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {fmtTime(recordDuration)}
              </div>
            )}

            {/* ── LIVE SETUP OVERLAY ── */}
            {mode === 'EN VIVO' && showLiveSetup && !isLive && (
              <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-sm flex items-end">
                <motion.div
                  initial={{ y: '100%' }} animate={{ y: 0 }} transition={{ type: 'spring', damping: 25 }}
                  className="w-full bg-[#0f1420]/95 backdrop-blur-xl rounded-t-3xl p-5 pb-8 space-y-4"
                >
                  <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />
                  <h3 className="text-lg font-bold text-white text-center">Configurar Directo</h3>

                  <div>
                    <label className="text-xs text-white/60 block mb-1">Título</label>
                    <input type="text" value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
                      placeholder="¿De qué va tu directo?"
                      className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50"
                      maxLength={100} />
                  </div>

                  <div>
                    <label className="text-xs text-white/60 block mb-2">Categoría</label>
                    <div className="flex flex-wrap gap-2">
                      {LIVE_CATEGORIES.map(cat => (
                        <button key={cat} onClick={() => setLiveCategory(cat)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-all ${liveCategory === cat ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-white/10 text-white/50 hover:text-white'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button onClick={handleGoLive} disabled={!liveTitle.trim() || startingLive}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                      {startingLive ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <Radio className="w-4 h-4" /> EN VIVO
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}

            {/* ── LIVE ACTIVE: End button ── */}
            {mode === 'EN VIVO' && isLive && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20">
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleEndLive}
                  className="px-8 py-3 bg-red-600/90 backdrop-blur text-white font-bold text-sm rounded-full shadow-lg">
                  Finalizar Directo
                </motion.button>
              </div>
            )}

            {mode === 'EN VIVO' && isLive && showViewersPanel && (
              <div className="absolute right-3 top-16 z-30 w-[320px] max-w-[92vw] bg-[#0d1320]/95 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl md:hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-300" /> Espectadores ({smoothLiveViewers})
                  </h4>
                  <button onClick={() => setShowViewersPanel(false)} className="text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                  {liveAudience.length === 0 ? (
                    <p className="text-xs text-white/50 text-center py-3">Aun no hay espectadores conectados.</p>
                  ) : (
                    liveAudience.map((viewer) => (
                      <div key={viewer.user_id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate flex items-center gap-1.5">
                            {viewer.profile?.username || viewer.profile?.nombre || 'usuario'}
                            {liveModeratorUserIds.has(viewer.user_id) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3" /> MOD
                              </span>
                            )}
                            {liveMutedUserIds.has(viewer.user_id) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Silenciado</span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/45 truncate">{viewer.user_id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleMuteViewer(viewer.user_id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${liveMutedUserIds.has(viewer.user_id) ? 'bg-yellow-600/25 text-yellow-300 hover:bg-yellow-600/35' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            <MicOff className="w-3.5 h-3.5" /> {liveMutedUserIds.has(viewer.user_id) ? 'Quitar silencio' : 'Silenciar'}
                          </button>
                          <button
                            onClick={() => handleToggleModerator(viewer.user_id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${liveModeratorUserIds.has(viewer.user_id) ? 'bg-cyan-500/25 text-cyan-300 hover:bg-cyan-500/35' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            <Shield className="w-3.5 h-3.5" /> {liveModeratorUserIds.has(viewer.user_id) ? 'Quitar mod' : 'Hacer mod'}
                          </button>
                          <button
                            onClick={() => handleKickViewer(viewer.user_id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/35 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" /> Expulsar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {mode === 'EN VIVO' && isLive && showViewersPanel && (
              <div className="hidden md:block absolute right-[368px] top-20 z-30 w-[360px] max-w-[40vw] bg-[#0d1320]/95 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-300" /> Espectadores ({smoothLiveViewers})
                  </h4>
                  <button onClick={() => setShowViewersPanel(false)} className="text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="max-h-[68vh] overflow-y-auto p-2 space-y-2">
                  {liveAudience.length === 0 ? (
                    <p className="text-xs text-white/50 text-center py-3">Aun no hay espectadores conectados.</p>
                  ) : (
                    liveAudience.map((viewer) => (
                      <div key={`desktop-panel-${viewer.user_id}`} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 border border-white/10 px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate flex items-center gap-1.5">
                            {viewer.profile?.username || viewer.profile?.nombre || 'usuario'}
                            {liveModeratorUserIds.has(viewer.user_id) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                                <Shield className="w-3 h-3" /> MOD
                              </span>
                            )}
                            {liveMutedUserIds.has(viewer.user_id) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/30">Silenciado</span>
                            )}
                          </p>
                          <p className="text-[10px] text-white/45 truncate">{viewer.user_id}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleMuteViewer(viewer.user_id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${liveMutedUserIds.has(viewer.user_id) ? 'bg-yellow-600/25 text-yellow-300 hover:bg-yellow-600/35' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            <MicOff className="w-3.5 h-3.5" /> {liveMutedUserIds.has(viewer.user_id) ? 'Quitar silencio' : 'Silenciar'}
                          </button>
                          <button
                            onClick={() => handleToggleModerator(viewer.user_id)}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${liveModeratorUserIds.has(viewer.user_id) ? 'bg-cyan-500/25 text-cyan-300 hover:bg-cyan-500/35' : 'bg-white/10 text-white hover:bg-white/20'}`}
                          >
                            <Shield className="w-3.5 h-3.5" /> {liveModeratorUserIds.has(viewer.user_id) ? 'Quitar mod' : 'Hacer mod'}
                          </button>
                          <button
                            onClick={() => handleKickViewer(viewer.user_id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/35 transition-colors"
                          >
                            <UserX className="w-3.5 h-3.5" /> Expulsar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* LIVE ACTIVE: Chat Panel */}
            {mode === 'EN VIVO' && isLive && showChatPanel && (
              <div className="absolute left-3 top-16 z-30 w-[320px] max-w-[92vw] bg-[#0d1320]/95 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] md:hidden">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-300" /> Chat en vivo
                  </h4>
                  <button onClick={() => setShowChatPanel(false)} className="text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {liveDonationMessages.length > 0 && (
                  <div className="px-3 py-2 border-b border-white/10 bg-amber-500/10 space-y-1">
                    <p className="text-[11px] font-bold text-amber-300 inline-flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" /> Donaciones recientes
                    </p>
                    {liveDonationMessages.map((msg) => (
                      <p key={`donation-${msg.id}`} className="text-[11px] text-amber-200/90 truncate">
                        {(msg.user?.username || 'Usuario')}: {msg.message}
                      </p>
                    ))}
                  </div>
                )}

                <div ref={chatPanelRef} className="flex-1 overflow-y-auto p-2 space-y-0.5">
                  {liveChatMessages.length === 0 ? (
                    <p className="text-xs text-blue-400/40 text-center py-6">Esperando mensajes...</p>
                  ) : (
                    liveChatMessages.map(msg => {
                      const colors = ['text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-orange-400'];
                      const name = msg.user?.username || 'Usuario';
                      const color = colors[name.length % colors.length];
                      return (
                        <motion.div key={msg.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 py-1">
                          <span className={`text-xs font-bold ${color} shrink-0`}>{name}</span>
                          <span className="text-xs text-gray-300 break-words">{msg.message}</span>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                <div className="px-2 py-2 border-t border-white/10 bg-black/20">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={newChatMessage}
                      onChange={(e) => setNewChatMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                      placeholder="Tu mensaje..."
                      className="flex-1 bg-slate-800/80 border border-white/5 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-blue-400/40 focus:outline-none focus:border-cyan-500/30"
                    />
                    <button onClick={handleSendChatMessage} className="p-1.5 text-cyan-400 hover:text-cyan-300">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Discard capture button */}
            {hasCapture && mode === 'HISTORIA' && (
              <button onClick={discardCapture}
                className="absolute bottom-24 left-6 z-20 p-3 bg-black/50 backdrop-blur text-white rounded-full">
                <RotateCcw className="w-5 h-5" />
              </button>
            )}

            {/* Text input for story caption */}
            {hasCapture && mode === 'HISTORIA' && (
              <div className="absolute bottom-24 left-16 right-6 z-20">
                <input type="text" value={storyText} onChange={e => setStoryText(e.target.value)}
                  placeholder="Añade un texto..."
                  className="w-full bg-black/40 backdrop-blur border border-white/10 rounded-full px-4 py-2.5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-white/30"
                  maxLength={150} />
              </div>
            )}
          </div>

          {mode === 'EN VIVO' && isLive && (
            <aside className="hidden md:flex w-[360px] shrink-0 flex-col border-l border-white/10 bg-[#0d1320]/95 backdrop-blur-xl overflow-hidden">
              <div className="border-b border-white/10 bg-gradient-to-b from-white/[0.08] to-transparent p-2.5 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 font-semibold">Panel del anfitrión</p>
                    <h4 className="text-sm font-bold text-white truncate">Monitor en vivo</h4>
                    <p className="text-[11px] text-white/45 truncate">{liveTitle || 'Directo activo'} · {liveCategory}</p>
                  </div>
                  <span className="text-[10px] text-white/50 rounded-full border border-white/10 px-2 py-1 bg-white/5">En vivo</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70">
                    <Clock className="w-3 h-3 text-cyan-300" /> {Math.floor(liveDuration / 60)}:{String(liveDuration % 60).padStart(2, '0')}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70">
                    <Eye className="w-3 h-3 text-cyan-300" /> {smoothLiveViewers} conectados
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/70">
                    <MessageCircle className="w-3 h-3 text-fuchsia-300" /> {liveChatMessages.length} mensajes
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center gap-2 text-white/55 text-[10px] uppercase tracking-[0.12em]">
                      <Eye className="w-3.5 h-3.5 text-cyan-300" /> Espectadores
                    </div>
                    <p className="mt-1 text-base font-bold text-white leading-none">{smoothLiveViewers}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center gap-2 text-white/55 text-[10px] uppercase tracking-[0.12em]">
                      <Heart className="w-3.5 h-3.5 text-rose-300" /> Me gustas
                    </div>
                    <p className="mt-1 text-base font-bold text-white leading-none">{smoothLiveLikes}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center gap-2 text-white/55 text-[10px] uppercase tracking-[0.12em]">
                      <MessageCircle className="w-3.5 h-3.5 text-fuchsia-300" /> Mensajes
                    </div>
                    <p className="mt-1 text-base font-bold text-white leading-none">{liveChatMessages.length}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center gap-2 text-white/55 text-[10px] uppercase tracking-[0.12em]">
                      <Gift className="w-3.5 h-3.5 text-amber-300" /> Donaciones
                    </div>
                    <p className="mt-1 text-base font-bold text-white leading-none">{liveDonationCount}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/8 p-2">
                  <div className="flex items-center justify-between text-[11px] text-white/70">
                    <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
                      <Gift className="w-3.5 h-3.5" /> Donaciones recientes
                    </span>
                    <span>{liveDonationCount} activas</span>
                  </div>
                  <div className="mt-2 max-h-[14vh] overflow-y-auto rounded-xl border border-white/5 bg-black/20 p-2 space-y-1">
                    {liveDonationMessages.length > 0 ? (
                      liveDonationMessages.slice(0, 3).map((msg) => (
                        <div key={`desktop-donation-${msg.id}`} className="flex items-start gap-2 rounded-lg bg-white/5 px-2 py-1.5">
                          <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                            <AvatarImage src={msg.user?.foto_perfil || msg.user?.avatar_url} className="object-cover" />
                            <AvatarFallback className={`text-[10px] font-bold ${getAvatarToneClass(msg.user?.username || msg.user?.nombre || 'usuario')}`}>
                              {getInitials(msg.user?.username || msg.user?.nombre || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-white truncate">{msg.user?.username || msg.user?.nombre || 'Usuario'}</p>
                            <p className="max-h-8 overflow-hidden text-[11px] text-amber-200/90">{msg.message}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-white/40">Las donaciones aparecerán aquí en tiempo real.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h5 className="text-xs font-bold text-white flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-cyan-300" /> Espectadores
                    </h5>
                    <span className="text-[10px] text-white/50">{smoothLiveViewers} conectados</span>
                  </div>
                  {liveAudience.length === 0 ? (
                    <p className="text-xs text-white/50 text-center py-3">Aun no hay espectadores conectados.</p>
                  ) : (
                    liveAudience.map((viewer) => (
                      <div key={viewer.user_id} className="flex items-center justify-between gap-2 rounded-xl bg-black/20 border border-white/10 px-2.5 py-2 mb-2 last:mb-0 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0 border border-white/10">
                            <AvatarImage src={viewer.profile?.foto_perfil || viewer.profile?.avatar_url} className="object-cover" />
                            <AvatarFallback className={`text-[10px] font-bold ${getAvatarToneClass(viewer.profile?.username || viewer.profile?.nombre || viewer.user_id)}`}>
                              {getInitials(viewer.profile?.username || viewer.profile?.nombre || viewer.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-xs text-white truncate flex items-center gap-1.5">
                              {viewer.profile?.username || viewer.profile?.nombre || 'usuario'}
                              {liveModeratorUserIds.has(viewer.user_id) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">MOD</span>}
                            </p>
                            <p className="text-[10px] text-white/45 truncate">{viewer.user_id}</p>
                          </div>
                        </div>
                        <div className="text-[10px] text-white/50 shrink-0">Conectado</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-bold text-white flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5 text-cyan-300" /> Comentarios
                    </h5>
                    <span className="text-[10px] text-white/50">{liveChatMessages.length}</span>
                  </div>
                  <div ref={chatPanelRef} className="max-h-[31vh] overflow-y-auto space-y-1 pr-1">
                    {liveChatMessages.length === 0 ? (
                      <p className="text-xs text-blue-400/40 text-center py-6">Esperando mensajes...</p>
                    ) : (
                      liveChatMessages.slice(-40).map((msg) => {
                        const colors = ['text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-orange-400'];
                        const name = msg.user?.username || 'Usuario';
                        const color = colors[name.length % colors.length];
                        return (
                          <motion.div key={`desktop-${msg.id}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 rounded-xl bg-black/15 border border-white/5 px-2 py-1.5">
                            <Avatar className="h-6.5 w-6.5 shrink-0 border border-white/10">
                              <AvatarImage src={msg.user?.foto_perfil || msg.user?.avatar_url} className="object-cover" />
                              <AvatarFallback className={`text-[10px] font-bold ${getAvatarToneClass(name)}`}>
                                {getInitials(name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold ${color} shrink-0`}>{name}</span>
                                {msg.user?.is_moderator && <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">MOD</span>}
                              </div>
                              <span className="text-xs text-gray-300 break-words">{msg.message}</span>
                            </div>
                          </motion.div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* ── Bottom Controls ── */}
          <div className="bg-black pt-2 pb-[env(safe-area-inset-bottom)]">
            {/* Capture controls (only in HISTORIA mode, no capture yet) */}
            {mode === 'HISTORIA' && !hasCapture && (
              <div className="flex items-center justify-between px-6 py-3">
                {/* Gallery */}
                <button onClick={() => galleryInputRef.current?.click()}
                  className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Image className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[9px] text-white/50">Galería</span>
                </button>

                {/* Shutter button */}
                <div className="flex flex-col items-center gap-1">
                  {!isRecordingVideo ? (
                    <button
                      onClick={capturePhoto}
                      onLongPress={startVideoRecording}
                      onTouchStart={(e) => {
                        e.currentTarget._longPress = setTimeout(() => {
                          startVideoRecording();
                          e.currentTarget._didLongPress = true;
                        }, 500);
                      }}
                      onTouchEnd={(e) => {
                        clearTimeout(e.currentTarget._longPress);
                        if (e.currentTarget._didLongPress) {
                          stopVideoRecording();
                          e.currentTarget._didLongPress = false;
                        }
                      }}
                      className="w-[72px] h-[72px] rounded-full border-[4px] border-white flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <div className="w-[60px] h-[60px] rounded-full bg-white" />
                    </button>
                  ) : (
                    <button onClick={stopVideoRecording}
                      className="w-[72px] h-[72px] rounded-full border-[4px] border-red-500 flex items-center justify-center animate-pulse">
                      <div className="w-7 h-7 rounded-md bg-red-500" />
                    </button>
                  )}
                  <span className="text-[9px] text-white/50">
                    {isRecordingVideo ? 'Grabando...' : 'Toca ó mantén'}
                  </span>
                </div>

                {/* Flip camera */}
                <button onClick={flipCamera} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <FlipCamera className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[9px] text-white/50">Girar</span>
                </button>
              </div>
            )}

            {/* EN VIVO: volume indicators */}
            {mode === 'EN VIVO' && !showLiveSetup && (
              <div className="flex items-center justify-center gap-4 px-6 py-3">
                <button onClick={flipCamera} className="p-3 rounded-full bg-white/10 text-white">
                  <FlipCamera className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* HISTORIA captured: hidden (controls are overlayed on image) */}
            {mode === 'HISTORIA' && hasCapture && (
              <div className="h-3" /> /* Spacer */
            )}

            {/* Mode selector */}
            <ModeSelector mode={mode} setMode={(m) => {
              if (isLive && m !== 'EN VIVO') {
                toast({ variant: 'destructive', title: 'Finaliza el directo primero', description: 'No puedes cambiar de modo mientras estas en vivo.' });
                return;
              }
              discardCapture();
              setMode(m);
              if (m !== 'TEXTO' && !cameraStream) startCamera(facingMode);
            }} />
          </div>
        </div>
      )}

      {/* Global Fish Gift Animations - Rendered at top level for full viewport coverage */}
      <AnimatePresence>
        {fishGiftAnimations.map((anim) => (
          <FishGiftAnimation key={anim.id} id={anim.id} label={anim.label} value={anim.value} onComplete={removeFishAnimation} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Mode Selector (horizontal swipeable tabs at bottom)
// ═══════════════════════════════════════════════════════
const ModeSelector = ({ mode, setMode }) => (
  <div className="flex items-center justify-center gap-1 py-2 pb-3 bg-black">
    {MODES.map(m => (
      <button key={m} onClick={() => setMode(m)}
        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
          mode === m
            ? m === 'EN VIVO'
              ? 'bg-red-600 text-white'
              : 'bg-white text-black'
            : 'text-white/50 hover:text-white/80'
        }`}>
        {m}
      </button>
    ))}
  </div>
);

export default CameraPage;
