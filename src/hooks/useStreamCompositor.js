import { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════
// Canvas-based Stream Compositor
// Combines multiple video sources (camera, screen) into a single
// composited stream using Canvas2D, supporting multiple layouts,
// text overlays, and watermarks.
// ═══════════════════════════════════════════════════════════════

const LAYOUTS = {
  camera: { label: 'Solo Cámara', icon: 'camera' },
  screen: { label: 'Solo Pantalla', icon: 'monitor' },
  pip_cam_small: { label: 'Pantalla + Cámara (PiP)', icon: 'pip' },
  pip_screen_small: { label: 'Cámara + Pantalla (PiP)', icon: 'pip-reverse' },
  side_by_side: { label: 'Lado a Lado', icon: 'columns' },
  top_bottom: { label: 'Arriba / Abajo', icon: 'rows' },
};

export { LAYOUTS };

export const useStreamCompositor = ({
  cameraStream,
  screenStream,
  layout = 'camera',
  overlayText = '',
  showWatermark = true,
  resolution = { width: 1280, height: 720 },
  fps = 30,
}) => {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const [compositeStream, setCompositeStream] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  const cameraVideoRef = useRef(document.createElement('video'));
  const screenVideoRef = useRef(document.createElement('video'));

  // Attach media streams to hidden video elements
  useEffect(() => {
    const camVid = cameraVideoRef.current;
    camVid.muted = true;
    camVid.playsInline = true;
    if (cameraStream) {
      camVid.srcObject = cameraStream;
      camVid.play().catch(() => {});
    } else {
      camVid.srcObject = null;
    }
  }, [cameraStream]);

  useEffect(() => {
    const scrVid = screenVideoRef.current;
    scrVid.muted = true;
    scrVid.playsInline = true;
    if (screenStream) {
      scrVid.srcObject = screenStream;
      scrVid.play().catch(() => {});
    } else {
      scrVid.srcObject = null;
    }
  }, [screenStream]);

  // Draw a rounded rectangle
  const drawRoundedRect = useCallback((ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }, []);

  // Draw video preserving aspect ratio with cover fit
  const drawVideoCover = useCallback((ctx, video, dx, dy, dw, dh, mirror = false) => {
    if (!video.videoWidth || !video.videoHeight) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const vAspect = vw / vh;
    const dAspect = dw / dh;

    let sx, sy, sw, sh;
    if (vAspect > dAspect) {
      sh = vh;
      sw = vh * dAspect;
      sx = (vw - sw) / 2;
      sy = 0;
    } else {
      sw = vw;
      sh = vw / dAspect;
      sx = 0;
      sy = (vh - sh) / 2;
    }

    ctx.save();
    if (mirror) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, dw, dh);
    } else {
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    }
    ctx.restore();
  }, []);

  // Main render loop
  const startRendering = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = resolution.width;
    canvas.height = resolution.height;

    const camVid = cameraVideoRef.current;
    const scrVid = screenVideoRef.current;
    const hasCam = () => cameraStream && camVid.videoWidth > 0;
    const hasScr = () => screenStream && scrVid.videoWidth > 0;

    const render = () => {
      const W = canvas.width;
      const H = canvas.height;

      // Background
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, W, H);

      // Layout-based drawing
      switch (layout) {
        case 'camera':
          if (hasCam()) drawVideoCover(ctx, camVid, 0, 0, W, H, true);
          else drawNoSignal(ctx, W, H, 'Cámara');
          break;

        case 'screen':
          if (hasScr()) drawVideoCover(ctx, scrVid, 0, 0, W, H, false);
          else drawNoSignal(ctx, W, H, 'Pantalla');
          break;

        case 'pip_cam_small': {
          // Screen fullscreen + camera PiP bottom-right
          if (hasScr()) drawVideoCover(ctx, scrVid, 0, 0, W, H, false);
          else drawNoSignal(ctx, W, H, 'Pantalla');
          if (hasCam()) {
            const pw = Math.round(W * 0.25);
            const ph = Math.round(pw * 0.75);
            const px = W - pw - 16;
            const py = H - ph - 16;
            // Shadow
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 12;
            ctx.save();
            drawRoundedRect(ctx, px, py, pw, ph, 12);
            ctx.clip();
            drawVideoCover(ctx, camVid, px, py, pw, ph, true);
            ctx.restore();
            ctx.shadowBlur = 0;
            // Border
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, px, py, pw, ph, 12);
            ctx.stroke();
          }
          break;
        }

        case 'pip_screen_small': {
          // Camera fullscreen + screen PiP bottom-right
          if (hasCam()) drawVideoCover(ctx, camVid, 0, 0, W, H, true);
          else drawNoSignal(ctx, W, H, 'Cámara');
          if (hasScr()) {
            const pw = Math.round(W * 0.3);
            const ph = Math.round(pw * 0.5625);
            const px = W - pw - 16;
            const py = H - ph - 16;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 12;
            ctx.save();
            drawRoundedRect(ctx, px, py, pw, ph, 12);
            ctx.clip();
            drawVideoCover(ctx, scrVid, px, py, pw, ph, false);
            ctx.restore();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            ctx.lineWidth = 2;
            drawRoundedRect(ctx, px, py, pw, ph, 12);
            ctx.stroke();
          }
          break;
        }

        case 'side_by_side': {
          const gap = 4;
          const hw = (W - gap) / 2;
          if (hasCam()) drawVideoCover(ctx, camVid, 0, 0, hw, H, true);
          else { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, hw, H); drawNoSignal(ctx, hw, H, 'Cámara', 0, 0); }
          if (hasScr()) drawVideoCover(ctx, scrVid, hw + gap, 0, hw, H, false);
          else { ctx.fillStyle = '#1e293b'; ctx.fillRect(hw + gap, 0, hw, H); drawNoSignal(ctx, hw, H, 'Pantalla', hw + gap, 0); }
          break;
        }

        case 'top_bottom': {
          const gap = 4;
          const hh = (H - gap) / 2;
          if (hasCam()) drawVideoCover(ctx, camVid, 0, 0, W, hh, true);
          else { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, W, hh); drawNoSignal(ctx, W, hh, 'Cámara', 0, 0); }
          if (hasScr()) drawVideoCover(ctx, scrVid, 0, hh + gap, W, hh, false);
          else { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, hh + gap, W, hh); drawNoSignal(ctx, W, hh, 'Pantalla', 0, hh + gap); }
          break;
        }

        default:
          if (hasCam()) drawVideoCover(ctx, camVid, 0, 0, W, H, true);
      }

      // Overlay text
      if (overlayText) {
        const fontSize = Math.max(14, Math.round(H * 0.028));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        const metrics = ctx.measureText(overlayText);
        const tw = metrics.width + 24;
        const th = fontSize + 16;
        const tx = 16;
        const ty = H - th - 16;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        drawRoundedRect(ctx, tx, ty, tw, th, 8);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(overlayText, tx + 12, ty + fontSize + 4);
      }

      // Watermark
      if (showWatermark) {
        const fontSize = Math.max(10, Math.round(H * 0.018));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText('CAR-PES LIVE', 12, fontSize + 8);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    function drawNoSignal(ctx2, w, h, label, ox = 0, oy = 0) {
      ctx2.fillStyle = 'rgba(30,41,59,0.8)';
      ctx2.fillRect(ox, oy, w, h);
      const fs = Math.max(12, Math.round(h * 0.04));
      ctx2.font = `${fs}px system-ui, sans-serif`;
      ctx2.fillStyle = 'rgba(148,163,184,0.5)';
      ctx2.textAlign = 'center';
      ctx2.fillText(`Sin señal: ${label}`, ox + w / 2, oy + h / 2);
      ctx2.textAlign = 'start';
    }

    render();
    setIsRendering(true);
  }, [layout, cameraStream, screenStream, overlayText, showWatermark, resolution, drawVideoCover, drawRoundedRect]);

  // Create composite MediaStream from canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    startRendering();

    // Capture canvas as video stream
    const videoStream = canvas.captureStream(fps);

    // Mix all audio tracks from both sources
    const audioTracks = [];
    if (cameraStream) {
      cameraStream.getAudioTracks().forEach(t => audioTracks.push(t));
    }
    if (screenStream) {
      screenStream.getAudioTracks().forEach(t => audioTracks.push(t));
    }

    // Create AudioContext to mix audio tracks
    let mixedStream;
    if (audioTracks.length > 0) {
      try {
        const audioCtx = new AudioContext();
        const destination = audioCtx.createMediaStreamDestination();

        audioTracks.forEach(track => {
          const source = audioCtx.createMediaStreamSource(new MediaStream([track]));
          source.connect(destination);
        });

        // Combine canvas video + mixed audio
        const combinedTracks = [
          ...videoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ];
        mixedStream = new MediaStream(combinedTracks);
      } catch {
        // Fallback: just add tracks directly
        audioTracks.forEach(t => videoStream.addTrack(t));
        mixedStream = videoStream;
      }
    } else {
      mixedStream = videoStream;
    }

    setCompositeStream(mixedStream);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsRendering(false);
    };
  }, [startRendering, cameraStream, screenStream, fps]);

  return { canvasRef, compositeStream, isRendering };
};

// ═══════════════════════════════════════════════════════════════
// Audio Analyser — Provides audio level data for volume meters
// ═══════════════════════════════════════════════════════════════
export const useAudioLevel = (stream) => {
  const [level, setLevel] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!stream) { setLevel(0); return; }
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) { setLevel(0); return; }

    let audioCtx, analyser, source;
    try {
      audioCtx = new AudioContext();
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setLevel(Math.min(100, Math.round(avg / 1.28)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setLevel(0);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      try { source?.disconnect(); audioCtx?.close(); } catch {}
    };
  }, [stream]);

  return level;
};

// ═══════════════════════════════════════════════════════════════
// MediaRecorder — Local recording
// ═══════════════════════════════════════════════════════════════
export const useLocalRecorder = (stream) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = useCallback(() => {
    if (!stream || isRecording) return;
    chunksRef.current = [];
    setRecordedBlob(null);
    setDuration(0);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm';

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setIsRecording(true);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, [stream, isRecording]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  }, []);

  const downloadRecording = useCallback(() => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carpes-live-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  }, [recordedBlob]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { isRecording, recordedBlob, duration, startRecording, stopRecording, downloadRecording };
};
