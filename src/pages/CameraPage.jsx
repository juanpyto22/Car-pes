import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  X, Camera, FlipHorizontal2 as FlipCamera, Zap, ZapOff, Image,
  Radio, Type, Send, Circle, Square, ChevronDown, ChevronUp,
  Sparkles, Video, StopCircle, Check, RotateCcw, Download,
  Volume2, Mic, MicOff, Eye, Heart, MessageCircle, Clock,
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

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const galleryInputRef = useRef(null);
  const liveIntervalRef = useRef(null);
  const recordIntervalRef = useRef(null);
  const textareaRef = useRef(null);

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
        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          image_url: null,
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
    if (!user?.id || !liveTitle.trim()) return;

    try {
      const { data, error } = await supabase.from('live_streams').insert({
        user_id: user.id,
        title: liveTitle.trim(),
        category: liveCategory,
        is_live: true,
        started_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      setStreamData(data);
      setIsLive(true);
      setShowLiveSetup(false);
      setLiveDuration(0);

      // Duration counter
      liveIntervalRef.current = setInterval(() => {
        setLiveDuration(d => d + 1);
      }, 1000);

      // Subscribe to stats
      const channel = supabase.channel(`live-stats-${data.id}`);
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_viewers', filter: `stream_id=eq.${data.id}` }, () => {
        supabase.from('live_stream_viewers').select('id', { count: 'exact' }).eq('stream_id', data.id).then(({ count }) => setLiveViewers(count || 0));
      }).on('postgres_changes', { event: '*', schema: 'public', table: 'live_stream_likes', filter: `stream_id=eq.${data.id}` }, () => {
        supabase.from('live_stream_likes').select('id', { count: 'exact' }).eq('stream_id', data.id).then(({ count }) => setLiveLikes(count || 0));
      }).subscribe();
    } catch (err) {
      console.error('Go live error:', err);
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const handleEndLive = async () => {
    clearInterval(liveIntervalRef.current);
    if (streamData?.id) {
      await supabase.from('live_streams').update({
        is_live: false,
        ended_at: new Date().toISOString(),
      }).eq('id', streamData.id);
    }
    setIsLive(false);
    setStreamData(null);
    setShowLiveSetup(true);
    setLiveDuration(0);
    setLiveViewers(0);
    setLiveLikes(0);
    navigate('/live');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(liveIntervalRef.current);
      clearInterval(recordIntervalRef.current);
      if (cameraStream) cameraStream.getTracks().forEach(t => t.stop());
    };
  }, [cameraStream]);

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
              <button onClick={() => { if (cameraStream) cameraStream.getTracks().forEach(t => t.stop()); navigate(-1); }}
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
                  <span className="flex items-center gap-0.5 text-[10px] text-white bg-black/40 px-1.5 py-0.5 rounded">
                    <Eye className="w-3 h-3" />{liveViewers}
                  </span>
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
                    <button onClick={() => navigate('/studio')}
                      className="flex-1 py-3 bg-white/10 text-white text-sm font-semibold rounded-xl hover:bg-white/15 transition-colors">
                      Abrir Studio
                    </button>
                    <button onClick={handleGoLive} disabled={!liveTitle.trim() || !cameraReady}
                      className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-500 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
                      <Radio className="w-4 h-4" /> EN VIVO
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
              discardCapture();
              setMode(m);
              if (m !== 'TEXTO' && !cameraStream) startCamera(facingMode);
            }} />
          </div>
        </div>
      )}
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
