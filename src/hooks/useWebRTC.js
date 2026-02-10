import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// ═══════════════════════════════════════════════════════════════
// WebRTC Configuration
// ═══════════════════════════════════════════════════════════════
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// ═══════════════════════════════════════════════════════════════
// BROADCASTER HOOK
// Manages multiple RTCPeerConnections (one per viewer).
// Sends the local mediaStream tracks to each connected viewer.
// Uses Supabase Realtime broadcast channel for signaling.
// ═══════════════════════════════════════════════════════════════
export const useBroadcaster = (streamId, mediaStream) => {
  const peersRef = useRef({});
  const channelRef = useRef(null);
  const mediaStreamRef = useRef(mediaStream);
  const [viewerCount, setViewerCount] = useState(0);

  // Keep media stream ref up to date
  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    if (!streamId || !mediaStream) return;

    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    // ─── Viewer wants to connect ───
    channel.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const { viewerId } = payload;
      console.log('[Broadcaster] Viewer joined:', viewerId);

      // Clean up old connection if exists
      if (peersRef.current[viewerId]) {
        peersRef.current[viewerId].close();
        delete peersRef.current[viewerId];
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current[viewerId] = pc;

      // Add all our media tracks
      const currentStream = mediaStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          pc.addTrack(track, currentStream);
        });
      }

      // Send ICE candidates to this specific viewer
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: e.candidate.toJSON(),
              targetId: viewerId,
              fromBroadcaster: true,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log(`[Broadcaster] Peer ${viewerId}: ${state}`);
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          pc.close();
          delete peersRef.current[viewerId];
          setViewerCount(Object.keys(peersRef.current).length);
        }
      };

      // Create and send offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            sdp: pc.localDescription.toJSON(),
            targetId: viewerId,
          },
        });
        setViewerCount(Object.keys(peersRef.current).length);
      } catch (err) {
        console.error('[Broadcaster] Error creating offer:', err);
      }
    });

    // ─── Viewer sent back an answer ───
    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const { viewerId, sdp } = payload;
      const pc = peersRef.current[viewerId];
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (err) {
          console.error('[Broadcaster] Error setting answer:', err);
        }
      }
    });

    // ─── ICE candidates from viewers ───
    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.fromBroadcaster) return; // Ignore our own
      const { viewerId, candidate } = payload;
      const pc = peersRef.current[viewerId];
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[Broadcaster] Error adding ICE candidate:', err);
        }
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      Object.values(peersRef.current).forEach((pc) => {
        try { pc.close(); } catch (_) {}
      });
      peersRef.current = {};
      setViewerCount(0);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [streamId, mediaStream]);

  // When the media stream changes (e.g., toggling camera/mic), replace tracks on all peers
  useEffect(() => {
    if (!mediaStream) return;
    Object.values(peersRef.current).forEach((pc) => {
      const senders = pc.getSenders();
      mediaStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(console.error);
        }
      });
    });
  }, [mediaStream]);

  return { viewerCount };
};

// ═══════════════════════════════════════════════════════════════
// VIEWER HOOK
// Connects to a broadcaster via WebRTC and receives the media stream.
// Uses the same Supabase Realtime broadcast channel for signaling.
// ═══════════════════════════════════════════════════════════════
export const useViewer = (streamId, active = true) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const viewerIdRef = useRef(generateId());
  const pendingCandidatesRef = useRef([]);

  useEffect(() => {
    if (!streamId || !active) return;

    const viewerId = viewerIdRef.current;
    let pc = null;

    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    // ─── Received offer from broadcaster ───
    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.targetId !== viewerId) return;
      console.log('[Viewer] Received offer from broadcaster');

      // Close old connection if any
      if (pcRef.current) {
        pcRef.current.close();
      }

      pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      setConnectionState('connecting');

      // Handle incoming media tracks
      pc.ontrack = (e) => {
        console.log('[Viewer] Received track:', e.track.kind);
        if (e.streams && e.streams[0]) {
          setRemoteStream(e.streams[0]);
        } else {
          const stream = new MediaStream();
          stream.addTrack(e.track);
          setRemoteStream(stream);
        }
        setConnectionState('connected');
      };

      // Send our ICE candidates to broadcaster
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: {
              candidate: e.candidate.toJSON(),
              viewerId,
              fromBroadcaster: false,
            },
          });
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[Viewer] Connection state:', state);
        setConnectionState(state);
        if (state === 'failed') {
          // Try to reconnect after a short delay
          setTimeout(() => {
            channel.send({
              type: 'broadcast',
              event: 'viewer-join',
              payload: { viewerId },
            });
          }, 2000);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        // Apply any pending ICE candidates
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { sdp: pc.localDescription.toJSON(), viewerId },
        });
      } catch (err) {
        console.error('[Viewer] Error handling offer:', err);
        setConnectionState('failed');
      }
    });

    // ─── ICE candidates from broadcaster ───
    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (!payload.fromBroadcaster || payload.targetId !== viewerId) return;
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('[Viewer] Error adding ICE candidate:', err);
        }
      } else {
        // Buffer candidates until we have the remote description
        pendingCandidatesRef.current.push(payload.candidate);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // Announce to broadcaster that we want to connect
        setConnectionState('waiting');
        setTimeout(() => {
          channel.send({
            type: 'broadcast',
            event: 'viewer-join',
            payload: { viewerId },
          });
        }, 500);
      }
    });

    channelRef.current = channel;

    return () => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      pendingCandidatesRef.current = [];
      supabase.removeChannel(channel);
      channelRef.current = null;
      setRemoteStream(null);
      setConnectionState('new');
    };
  }, [streamId, active]);

  return { remoteStream, connectionState };
};
