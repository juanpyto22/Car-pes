import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
};

const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

const createAndSendOffer = async (viewerId, pc, channel) => {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: {
        sdp: pc.localDescription.toJSON(),
        targetId: viewerId,
      },
    });
  } catch (err) {
    console.error('[Broadcaster] Error creating/sending offer:', err);
  }
};

export const useBroadcaster = (streamId, mediaStream) => {
  const peersRef = useRef({});
  const channelRef = useRef(null);
  const mediaStreamRef = useRef(mediaStream);
  const statsIntervalRef = useRef(null);

  const [viewerCount, setViewerCount] = useState(0);
  const [signalQuality, setSignalQuality] = useState({ level: 'checking', label: 'Comprobando...' });

  const computeSignalQuality = async () => {
    const peers = Object.values(peersRef.current);
    const connectedPeers = peers.filter((pc) => pc.connectionState === 'connected');

    const currentStream = mediaStreamRef.current;
    const videoTrack = currentStream?.getVideoTracks?.()[0];

    if (!videoTrack || videoTrack.readyState !== 'live') {
      setSignalQuality({ level: 'offline', label: 'Sin senal' });
      return;
    }

    if (connectedPeers.length === 0) {
      setSignalQuality({ level: 'broadcasting', label: 'Emitiendo' });
      return;
    }

    const peerLevels = await Promise.all(
      connectedPeers.map(async (pc) => {
        try {
          const stats = await pc.getStats();
          let rtt = null;
          let fps = null;

          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
              rtt = report.currentRoundTripTime;
            }
            if (report.type === 'outbound-rtp' && report.kind === 'video' && typeof report.framesPerSecond === 'number') {
              fps = report.framesPerSecond;
            }
          });

          if (rtt != null && rtt > 0.45) return 'weak';
          if (fps != null && fps < 12) return 'weak';
          if ((rtt != null && rtt > 0.22) || (fps != null && fps < 20)) return 'good';
          return 'excellent';
        } catch (err) {
          console.error('[Broadcaster] Error computing quality stats:', err);
          return 'good';
        }
      })
    );

    if (peerLevels.includes('weak')) {
      setSignalQuality({ level: 'weak', label: 'Senal debil' });
      return;
    }

    if (peerLevels.includes('good')) {
      setSignalQuality({ level: 'good', label: 'Senal media' });
      return;
    }

    setSignalQuality({ level: 'excellent', label: 'Senal estable' });
  };

  useEffect(() => {
    mediaStreamRef.current = mediaStream;
  }, [mediaStream]);

  useEffect(() => {
    if (!streamId) return;

    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'viewer-join' }, async ({ payload }) => {
      const { viewerId } = payload;
      if (!viewerId) return;

      if (peersRef.current[viewerId]) {
        peersRef.current[viewerId].close();
        delete peersRef.current[viewerId];
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      peersRef.current[viewerId] = pc;

      const currentStream = mediaStreamRef.current;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          pc.addTrack(track, currentStream);
        });
      }

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            targetId: viewerId,
            fromBroadcaster: true,
          },
        });
      };

      pc.onnegotiationneeded = async () => {
        await createAndSendOffer(viewerId, pc, channel);
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          try {
            pc.close();
          } catch {
            // noop
          }
          delete peersRef.current[viewerId];
          setViewerCount(Object.keys(peersRef.current).length);
        }
        computeSignalQuality();
      };

      await createAndSendOffer(viewerId, pc, channel);
      setViewerCount(Object.keys(peersRef.current).length);
      computeSignalQuality();
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const { viewerId, sdp } = payload || {};
      const pc = peersRef.current[viewerId];
      if (!pc || !sdp) return;

      try {
        if (pc.signalingState !== 'closed') {
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        }
      } catch (err) {
        console.error('[Broadcaster] Error setting answer:', err);
      }
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (!payload || payload.fromBroadcaster) return;
      const { viewerId, candidate } = payload;
      const pc = peersRef.current[viewerId];
      if (!pc || !candidate) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('[Broadcaster] Error adding ICE candidate:', err);
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    computeSignalQuality();
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    statsIntervalRef.current = setInterval(() => {
      computeSignalQuality();
    }, 2500);

    return () => {
      Object.values(peersRef.current).forEach((pc) => {
        try {
          pc.close();
        } catch {
          // noop
        }
      });

      peersRef.current = {};
      setViewerCount(0);
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      setSignalQuality({ level: 'checking', label: 'Comprobando...' });

      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [streamId]);

  useEffect(() => {
    if (!mediaStream) return;

    const channel = channelRef.current;
    if (!channel) return;

    Object.entries(peersRef.current).forEach(([viewerId, pc]) => {
      const senders = pc.getSenders();
      let needsRenegotiation = false;

      mediaStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track?.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch(console.error);
        } else {
          try {
            pc.addTrack(track, mediaStream);
            needsRenegotiation = true;
          } catch (err) {
            console.error('[Broadcaster] Error adding late track:', err);
          }
        }
      });

      if (needsRenegotiation || pc.signalingState === 'stable') {
        createAndSendOffer(viewerId, pc, channel);
      }
    });

    computeSignalQuality();
  }, [mediaStream]);

  return { viewerCount, signalQuality };
};

export const useViewer = (streamId, active = true) => {
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');

  const pcRef = useRef(null);
  const channelRef = useRef(null);
  const viewerIdRef = useRef(generateId());
  const pendingCandidatesRef = useRef([]);
  const joinRetryIntervalRef = useRef(null);

  useEffect(() => {
    if (!streamId || !active) return;

    const viewerId = viewerIdRef.current;
    const channel = supabase.channel(`webrtc-${streamId}`, {
      config: { broadcast: { self: false } },
    });

    const requestJoin = () => {
      channel.send({
        type: 'broadcast',
        event: 'viewer-join',
        payload: { viewerId },
      });
    };

    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (!payload || payload.targetId !== viewerId) return;

      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {
          // noop
        }
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);
      pcRef.current = pc;
      setConnectionState('connecting');

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        } else {
          const stream = new MediaStream();
          stream.addTrack(event.track);
          setRemoteStream(stream);
        }
        setConnectionState('connected');
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate.toJSON(),
            viewerId,
            fromBroadcaster: false,
          },
        });
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        setConnectionState(state);
        if (state === 'failed') {
          setTimeout(() => {
            requestJoin();
          }, 1500);
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

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

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (!payload || !payload.fromBroadcaster || payload.targetId !== viewerId) return;

      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('[Viewer] Error adding ICE candidate:', err);
        }
      } else {
        pendingCandidatesRef.current.push(payload.candidate);
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionState('waiting');
        setTimeout(() => {
          requestJoin();
        }, 300);

        if (joinRetryIntervalRef.current) clearInterval(joinRetryIntervalRef.current);
        joinRetryIntervalRef.current = setInterval(() => {
          const pcState = pcRef.current?.connectionState;
          if (pcState === 'connected') {
            clearInterval(joinRetryIntervalRef.current);
            joinRetryIntervalRef.current = null;
            return;
          }
          requestJoin();
        }, 2000);
      }
    });

    channelRef.current = channel;

    return () => {
      if (pcRef.current) {
        try {
          pcRef.current.close();
        } catch {
          // noop
        }
        pcRef.current = null;
      }

      if (joinRetryIntervalRef.current) {
        clearInterval(joinRetryIntervalRef.current);
        joinRetryIntervalRef.current = null;
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
