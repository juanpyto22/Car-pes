import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, Camera, FlipHorizontal2 as FlipCamera, Zap, ZapOff, Image,
  Radio, Type, Send, Circle, Square, ChevronDown, ChevronUp,
  Sparkles, Video, StopCircle, Check, RotateCcw, Download,
  Volume2, Mic, MicOff, Eye, Heart, MessageCircle, Clock, UserX, Shield, Fish,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

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

  const fetchLiveAudience = useCallback(async (streamId) => {
    if (!streamId) return;
    const { data: viewersData, error: viewersError } = await supabase
      .from('live_stream_viewers')
      .select('user_id, created_at')
      .eq('stream_id', streamId);

    if (viewersError) {
      console.error('Audience fetch error:', viewersError);
      return;
    }

    const rows = viewersData || [];
    setLiveViewers(rows.length);

    const uniqueIds = [...new Set(rows.map(v => v.user_id).filter(Boolean))];
    if (uniqueIds.length === 0) {
      setLiveAudience([]);
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
  }, []);

  const fetchLiveLikes = useCallback(async (streamId) => {
    if (!streamId) return;
    const { count } = await supabase
      .from('live_stream_likes')
      .select('id', { count: 'exact', head: true })
      .eq('stream_id', streamId);
    setLiveLikes(count || 0);
  }, []);

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
      setShowViewersPanel(false);
      setShowChatPanel(false);
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_viewers', filter: `stream_id=eq.${finalStreamId}` }, () => {
            fetchLiveAudience(finalStreamId);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_likes', filter: `stream_id=eq.${finalStreamId}` }, () => {
            fetchLiveLikes(finalStreamId);
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

        const chatRows = (data || []).filter((m) => !(m.message || '').startsWith(FRAME_MSG_PREFIX));

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

    const channel = supabase
      .channel(`camera-chat-${streamData.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'live_chat_messages',
        filter: `stream_id=eq.${streamData.id}`,
      }, async (payload) => {
        const msg = payload.new;
        if ((msg.message || '').startsWith(FRAME_MSG_PREFIX)) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, nombre, foto_perfil')
          .eq('id', msg.user_id)
          .single();

        if (active) {
          const messageText = msg.message || '';
          if (liveChatHydratedRef.current && !liveChatMessageIdsRef.current.has(msg.id)) {
            const fishMatch = messageText.match(/dono\s+(.+?)\s+\((\d+)\s*pts\)/i);
            if (fishMatch && /(pez|fish)/i.test(fishMatch[1])) {
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
      supabase.removeChannel(channel);
    };
  }, [streamData?.id, spawnFishAnimation]);

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
        <div className="flex-1 flex flex-col relative">
          {/* Camera Feed */}
          <div className="flex-1 relative bg-black overflow-hidden">
            {/* Video element */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${hasCapture ? 'hidden' : ''}`}
            />

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
                  <button
                    type="button"
                    onClick={() => setShowViewersPanel(v => !v)}
                     className="flex items-center gap-0.5 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded hover:bg-black/60 transition-colors"
                    title="Ver espectadores"
                  >
                    <Eye className="w-3 h-3" />{liveViewers}
                  </button>
                   <button
                     type="button"
                     onClick={() => setShowChatPanel(v => !v)}
                     className="flex items-center gap-0.5 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded hover:bg-black/60 transition-colors"
                     title="Ver chat"
                   >
                     <MessageCircle className="w-3 h-3" />{liveChatMessages.length}
                   </button>
                  <span className="flex items-center gap-0.5 text-[10px] text-red-300 bg-black/40 px-1.5 py-0.5 rounded">
                    <Heart className="w-3 h-3" />{liveLikes}
                  </span>
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
              <div className="absolute right-3 top-16 z-30 w-[320px] max-w-[92vw] bg-[#0d1320]/95 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-300" /> Espectadores ({liveAudience.length})
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

            {/* LIVE ACTIVE: Chat Panel */}
            {mode === 'EN VIVO' && isLive && showChatPanel && (
              <div className="absolute left-3 top-16 z-30 w-[320px] max-w-[92vw] bg-[#0d1320]/95 border border-white/10 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh]">
                <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-cyan-300" /> Chat en vivo
                  </h4>
                  <button onClick={() => setShowChatPanel(false)} className="text-white/60 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

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
