import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Video,
  Clock,
  Loader2,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { CallSession } from '../../types';

export const CallHistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const { startCall } = useCall();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Listen for calls involving current user
    const callsRef = collection(db, 'calls');
    const q = query(
      callsRef,
      where('callerId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const qRecv = query(
      callsRef,
      where('receiverId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubCaller = onSnapshot(q, (snapCaller) => {
      const listCaller: CallSession[] = [];
      snapCaller.forEach((d) => listCaller.push({ id: d.id, ...(d.data() as any) }));

      // Also fetch receiver side
      const unsubRecv = onSnapshot(qRecv, (snapRecv) => {
        const listRecv: CallSession[] = [];
        snapRecv.forEach((d) => listRecv.push({ id: d.id, ...(d.data() as any) }));

        // Merge & sort
        const combined = [...listCaller, ...listRecv].sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        // Deduplicate
        const unique = Array.from(new Map(combined.map((c) => [c.id, c])).values());
        setCalls(unique);
        setLoading(false);
      });

      return () => unsubRecv();
    });

    return () => unsubCaller();
  }, [user]);

  const formatSeconds = (sec?: number) => {
    if (!sec || sec === 0) return 'Missed / Unanswered';
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${mins}m ${rem}s`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Call History
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logs of your incoming, outgoing, and missed WebRTC voice & video calls.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading call records...</span>
          </div>
        ) : calls.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 mx-auto flex items-center justify-center">
              <Phone className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No calls yet
            </h2>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Start an encrypted voice or video call with any contact from their private chat.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {calls.map((call) => {
              const isOutgoing = call.callerId === user?.uid;
              const otherName = isOutgoing ? call.receiverName : call.callerName;
              const otherPhoto = isOutgoing ? call.receiverPhoto : call.callerPhoto;
              const otherUid = isOutgoing ? call.receiverId : call.callerId;
              const isMissed = call.status === 'rejected' || (!call.duration && !isOutgoing);

              return (
                <div
                  key={call.id}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      {otherPhoto ? (
                        <img
                          src={otherPhoto}
                          alt={otherName}
                          className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {otherName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {otherName || 'RM User'}
                        </h2>
                        {call.type === 'video' ? (
                          <Video className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        ) : (
                          <Phone className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs mt-0.5">
                        {isMissed ? (
                          <span className="text-rose-500 font-medium flex items-center gap-1">
                            <PhoneMissed className="w-3 h-3" />
                            <span>Missed</span>
                          </span>
                        ) : isOutgoing ? (
                          <span className="text-indigo-500 font-medium flex items-center gap-1">
                            <PhoneOutgoing className="w-3 h-3" />
                            <span>Outgoing</span>
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-medium flex items-center gap-1">
                            <PhoneIncoming className="w-3 h-3" />
                            <span>Incoming</span>
                          </span>
                        )}

                        <span className="text-slate-400">•</span>
                        <span className="text-slate-400 text-[11px]">
                          {formatSeconds(call.duration)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">
                      {new Date(call.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {/* Quick Call Back Button */}
                    <button
                      onClick={() =>
                        startCall(
                          otherUid,
                          otherName || 'User',
                          otherPhoto,
                          call.type
                        )
                      }
                      title={`Call back with ${call.type}`}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                    >
                      {call.type === 'video' ? (
                        <Video className="w-4 h-4" />
                      ) : (
                        <Phone className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
