import React, { useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  SwitchCamera,
  ShieldCheck,
  Maximize2,
} from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const ActiveVideoCallView: React.FC = () => {
  const {
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    endCall,
    toggleMute,
    toggleVideo,
    flipCamera,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((e) => console.warn('Remote video play error:', e));
    }
  }, [remoteStream]);

  if (!activeCall || activeCall.type !== 'video') return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const peerName = activeCall.receiverName || activeCall.callerName || 'RM Contact';

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Remote Video (Full Screen) */}
      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
        {remoteStream && remoteStream.getVideoTracks().length > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 text-white space-y-4">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-3xl font-extrabold shadow-2xl animate-pulse">
              {peerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold">{peerName}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeCall.status === 'accepted' ? 'Remote video loading...' : 'Connecting encrypted call...'}
              </p>
            </div>
          </div>
        )}

        {/* Local Video Inset (Picture in Picture) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-slate-900 z-20">
          {isVideoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white bg-slate-800 text-xs">
              Camera Off
            </div>
          )}
        </div>

        {/* Top Header info */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-medium border border-white/10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{peerName}</span>
            <span className="opacity-60">|</span>
            <span className="font-mono">
              {activeCall.status === 'accepted' ? formatDuration(callDuration) : 'Connecting'}
            </span>
          </div>
        </div>

        {/* Bottom Floating Control Bar */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-slate-900/80 backdrop-blur-xl px-6 py-3.5 rounded-full border border-white/10 shadow-2xl">
          {/* Mute Mic */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Turn camera off' : 'Turn camera on'}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              !isVideoEnabled ? 'bg-rose-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {!isVideoEnabled ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
          </button>

          {/* Flip Camera (Mobile) */}
          <button
            onClick={flipCamera}
            title="Switch front / rear camera"
            className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            <SwitchCamera className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            onClick={endCall}
            title="End call"
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
