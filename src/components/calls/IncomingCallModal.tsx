import React from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { useCall } from '../../context/CallContext';

export const IncomingCallModal: React.FC = () => {
  const { incomingCall, acceptCall, rejectCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-white shadow-2xl relative overflow-hidden">
        {/* Glow rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            {incomingCall.type === 'video' ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            <span>Incoming {incomingCall.type === 'video' ? 'Video' : 'Voice'} Call</span>
          </div>

          {/* Caller avatar */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500 animate-ping opacity-25" />
            {incomingCall.callerPhoto ? (
              <img
                src={incomingCall.callerPhoto}
                alt={incomingCall.callerName}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-indigo-500 shadow-xl relative z-10"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-3xl shadow-xl border-2 border-indigo-500 relative z-10">
                {incomingCall.callerName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight">{incomingCall.callerName}</h2>
            <p className="text-xs text-slate-400 mt-1">RM CHAT Secure Calling</p>
          </div>

          {/* Accept / Reject Action Buttons */}
          <div className="flex items-center justify-center gap-8 pt-4">
            {/* Reject */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={rejectCall}
                title="Decline"
                className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <span className="text-xs text-slate-400 font-medium">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={acceptCall}
                title="Accept"
                className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer animate-bounce"
              >
                <Phone className="w-7 h-7" />
              </button>
              <span className="text-xs text-emerald-400 font-semibold">Accept</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
