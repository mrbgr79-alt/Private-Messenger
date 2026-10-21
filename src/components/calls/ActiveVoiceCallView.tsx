import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, PhoneOff, ShieldCheck, Volume2 } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const ActiveVoiceCallView: React.FC = () => {
  const {
    activeCall,
    remoteStream,
    isMuted,
    callDuration,
    endCall,
    toggleMute,
  } = useCall();

  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Bind remote audio stream
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.warn('Audio play:', e));
    }
  }, [remoteStream]);

  if (!activeCall || activeCall.type !== 'voice') return null;

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const peerName = activeCall.receiverName || activeCall.callerName || 'RM Contact';
  const peerPhoto = activeCall.receiverPhoto || activeCall.callerPhoto;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl relative overflow-hidden flex flex-col items-center">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full flex flex-col items-center space-y-6">
          {/* Header Tag */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>P2P WebRTC Voice Call</span>
          </div>

          {/* Avatar with pulse ring */}
          <div className="relative w-28 h-28 my-2">
            <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-pulse" />
            {peerPhoto ? (
              <img
                src={peerPhoto}
                alt={peerName}
                className="w-28 h-28 rounded-3xl object-cover border-2 border-blue-500/50 shadow-2xl relative z-10"
              />
            ) : (
              <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-2xl border-2 border-blue-500/50 relative z-10">
                {peerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight">{peerName}</h2>
            <p className="text-sm text-slate-400 font-mono mt-1">
              {activeCall.status === 'accepted' ? formatDuration(callDuration) : 'Calling...'}
            </p>
          </div>

          {/* Audio Visualizer Waves Simulation */}
          <div className="flex items-center gap-1.5 h-8">
            {[40, 70, 30, 90, 60, 100, 45, 80, 50, 65].map((height, idx) => (
              <div
                key={idx}
                className="w-1.5 bg-gradient-to-t from-blue-500 to-indigo-400 rounded-full animate-pulse"
                style={{
                  height: activeCall.status === 'accepted' ? `${height}%` : '20%',
                  animationDelay: `${idx * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Action Controls */}
          <div className="flex items-center justify-center gap-6 pt-6">
            {/* Mic Mute */}
            <button
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* End Call */}
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
