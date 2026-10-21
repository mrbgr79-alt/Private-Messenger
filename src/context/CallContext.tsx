import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  addDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { CallSession, IceCandidatePayload } from '../types';
import { soundManager } from '../services/soundEffects';

interface CallContextType {
  activeCall: CallSession | null;
  incomingCall: CallSession | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isCameraFront: boolean;
  callDuration: number;
  callError: string | null;
  startCall: (targetUserId: string, targetName: string, targetPhoto?: string, type?: 'voice' | 'video') => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  flipCamera: () => Promise<void>;
  dismissError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userProfile } = useAuth();
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isCameraFront, setIsCameraFront] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const timerRef = useRef<number | null>(null);
  const activeCallRef = useRef<CallSession | null>(null);
  const remoteAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const candidateQueueRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Persistent audio playback element for calls
  useEffect(() => {
    if (!remoteAudioElementRef.current && typeof document !== 'undefined') {
      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      remoteAudioElementRef.current = audio;
      document.body.appendChild(audio);
    }

    return () => {
      if (remoteAudioElementRef.current) {
        remoteAudioElementRef.current.remove();
        remoteAudioElementRef.current = null;
      }
    };
  }, []);

  // Helper to add or queue ICE candidates safely
  const addOrQueueCandidate = async (pc: RTCPeerConnection, candInit: RTCIceCandidateInit) => {
    if (pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candInit));
      } catch (err) {
        console.warn('addIceCandidate error:', err);
      }
    } else {
      candidateQueueRef.current.push(candInit);
    }
  };

  const flushCandidateQueue = async (pc: RTCPeerConnection) => {
    while (candidateQueueRef.current.length > 0) {
      const candInit = candidateQueueRef.current.shift();
      if (candInit) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candInit));
        } catch (err) {
          console.warn('flush candidate error:', err);
        }
      }
    }
  };

  // Listen for incoming calls
  useEffect(() => {
    if (!user) return;

    // Listen for calls where receiverId == user.uid and status == 'ringing'
    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        if (incomingCall) {
          soundManager.stopRingtone();
          setIncomingCall(null);
        }
        return;
      }

      // If already in active call, ignore or auto reject second call
      const callData = snapshot.docs[0].data() as CallSession;
      callData.id = snapshot.docs[0].id;

      if (activeCallRef.current && activeCallRef.current.id !== callData.id) {
        // Busy
        updateDoc(doc(db, 'calls', callData.id), { status: 'rejected' }).catch(() => {});
        return;
      }

      if (!activeCallRef.current) {
        setIncomingCall(callData);
        soundManager.startRingtone();
      }
    });

    return () => {
      unsubscribe();
      soundManager.stopRingtone();
    };
  }, [user]);

  // Call duration counter
  useEffect(() => {
    if (activeCall && activeCall.status === 'accepted') {
      if (!timerRef.current) {
        setCallDuration(0);
        timerRef.current = window.setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activeCall?.status]);

  // Acquire User Media
  const getMedia = async (video: boolean, facingMode: 'user' | 'environment' = 'user') => {
    try {
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: video
          ? {
              facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      setIsVideoEnabled(video);
      setIsMuted(false);
      return stream;
    } catch (err: any) {
      console.error('[RM CHAT] Media device error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new Error('Camera/Microphone permission denied. Please allow access in browser or app settings.');
      } else if (err.name === 'NotFoundError') {
        throw new Error('No camera or microphone found on this device.');
      }
      throw new Error(`Media access error: ${err.message || 'Check permissions'}`);
    }
  };

  // Clean up streams & peer connection
  const cleanupCallState = () => {
    soundManager.stopRingtone();
    soundManager.playCallEnd();

    candidateQueueRef.current = [];

    if (remoteAudioElementRef.current) {
      remoteAudioElementRef.current.srcObject = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setActiveCall(null);
    setIncomingCall(null);
    setCallDuration(0);
  };

  // Start Outgoing Call
  const startCall = async (
    targetUserId: string,
    targetName: string,
    targetPhoto?: string,
    type: 'voice' | 'video' = 'voice'
  ) => {
    if (!user || !userProfile) return;

    try {
      candidateQueueRef.current = [];
      const stream = await getMedia(type === 'video');
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote incoming tracks with persistent audio player
      pc.ontrack = (event) => {
        const inboundStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        setRemoteStream(inboundStream);
        if (remoteAudioElementRef.current) {
          remoteAudioElementRef.current.srcObject = inboundStream;
          remoteAudioElementRef.current.play().catch(console.warn);
        }
      };

      // Create new call document in Firestore
      const callDocRef = doc(collection(db, 'calls'));
      const callId = callDocRef.id;

      // ICE Candidates collection
      const candidatesCol = collection(db, 'calls', callId, 'candidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCol, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            senderId: user.uid,
            createdAt: new Date().toISOString(),
          }).catch(console.warn);
        }
      };

      // Create SDP Offer
      const offerDescription = await pc.createOffer();
      await pc.setLocalDescription(offerDescription);

      const newCall: CallSession = {
        id: callId,
        callerId: user.uid,
        callerName: userProfile.displayName || 'RM CHAT User',
        callerPhoto: userProfile.photoURL,
        receiverId: targetUserId,
        receiverName: targetName,
        receiverPhoto: targetPhoto,
        type,
        status: 'ringing',
        offer: {
          type: offerDescription.type,
          sdp: offerDescription.sdp,
        },
        createdAt: new Date().toISOString(),
      };

      await setDoc(callDocRef, newCall);
      setActiveCall(newCall);

      // Listen for answer and status changes
      const unsubscribeCall = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data() as CallSession;
        if (!data) return;

        setActiveCall((prev) => (prev ? { ...prev, ...data } : data));

        if (data.status === 'accepted' && data.answer && !pc.currentRemoteDescription) {
          const answerDesc = new RTCSessionDescription(data.answer);
          await pc.setRemoteDescription(answerDesc);
          await flushCandidateQueue(pc);
        } else if (data.status === 'rejected' || data.status === 'ended') {
          unsubscribeCall();
          cleanupCallState();
        }
      });

      // Listen for remote ICE candidates (safely queued until answer is set)
      const unsubscribeCandidates = onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data() as IceCandidatePayload;
            if (candidateData.senderId !== user.uid && candidateData.candidate) {
              await addOrQueueCandidate(pc, {
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex,
              });
            }
          }
        });
      });
    } catch (err: any) {
      cleanupCallState();
      setCallError(err.message || 'Failed to start call');
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    if (!incomingCall || !user) return;
    soundManager.stopRingtone();

    try {
      candidateQueueRef.current = [];
      const stream = await getMedia(incomingCall.type === 'video');
      const pc = new RTCPeerConnection(rtcConfig);
      pcRef.current = pc;

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      pc.ontrack = (event) => {
        const inboundStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        setRemoteStream(inboundStream);
        if (remoteAudioElementRef.current) {
          remoteAudioElementRef.current.srcObject = inboundStream;
          remoteAudioElementRef.current.play().catch(console.warn);
        }
      };

      const callDocRef = doc(db, 'calls', incomingCall.id);
      const candidatesCol = collection(db, 'calls', incomingCall.id, 'candidates');

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          addDoc(candidatesCol, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            senderId: user.uid,
            createdAt: new Date().toISOString(),
          }).catch(console.warn);
        }
      };

      // Set Remote Offer and flush any queued candidates
      if (incomingCall.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
        await flushCandidateQueue(pc);
      }

      // Create Answer
      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      await updateDoc(callDocRef, {
        status: 'accepted',
        answer: {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        },
        startedAt: new Date().toISOString(),
      });

      setActiveCall({
        ...incomingCall,
        status: 'accepted',
        startedAt: new Date().toISOString(),
      });
      setIncomingCall(null);

      // Listen for updates (e.g. ended by other peer)
      const unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
        const data = snapshot.data() as CallSession;
        if (!data || data.status === 'ended') {
          unsubscribeCall();
          cleanupCallState();
        }
      });

      // Listen for remote candidates
      onSnapshot(candidatesCol, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidateData = change.doc.data() as IceCandidatePayload;
            if (candidateData.senderId !== user.uid && candidateData.candidate) {
              await addOrQueueCandidate(pc, {
                candidate: candidateData.candidate,
                sdpMid: candidateData.sdpMid,
                sdpMLineIndex: candidateData.sdpMLineIndex,
              });
            }
          }
        });
      });
    } catch (err: any) {
      soundManager.stopRingtone();
      cleanupCallState();
      setCallError(err.message || 'Could not connect call');
    }
  };

  // Reject Incoming Call
  const rejectCall = async () => {
    if (!incomingCall) return;
    soundManager.stopRingtone();
    try {
      await updateDoc(doc(db, 'calls', incomingCall.id), {
        status: 'rejected',
        endedAt: new Date().toISOString(),
      });
    } catch {
      // Ignored
    }
    setIncomingCall(null);
  };

  // End Active Call
  const endCall = async () => {
    if (activeCall) {
      try {
        await updateDoc(doc(db, 'calls', activeCall.id), {
          status: 'ended',
          endedAt: new Date().toISOString(),
          duration: callDuration,
        });
      } catch {
        // Ignored
      }
    }
    cleanupCallState();
  };

  // Microphone toggle
  const toggleMute = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!audioTracks[0]?.enabled);
    }
  };

  // Camera toggle
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(videoTracks[0]?.enabled ?? false);
    }
  };

  // Camera flip for mobile
  const flipCamera = async () => {
    if (!activeCall || activeCall.type !== 'video' || !localStream) return;
    const nextMode = isCameraFront ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextMode },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      // Replace in local stream
      const oldVideoTrack = localStream.getVideoTracks()[0];
      if (oldVideoTrack) {
        localStream.removeTrack(oldVideoTrack);
        oldVideoTrack.stop();
      }
      localStream.addTrack(newVideoTrack);
      setIsCameraFront(!isCameraFront);
    } catch (e: any) {
      console.warn('Could not switch camera:', e);
    }
  };

  const dismissError = () => setCallError(null);

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incomingCall,
        localStream,
        remoteStream,
        isMuted,
        isVideoEnabled,
        isCameraFront,
        callDuration,
        callError,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        flipCamera,
        dismissError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
