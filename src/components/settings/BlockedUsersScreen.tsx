import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { UserX, ArrowLeft, ShieldAlert, Loader2, Check } from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { BlockedUser } from '../../types';

interface BlockedUsersScreenProps {
  onBack: () => void;
}

export const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [blockedList, setBlockedList] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const blockedRef = collection(db, 'users', user.uid, 'blocked');
    const unsubscribe = onSnapshot(blockedRef, (snapshot) => {
      const list: BlockedUser[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      setBlockedList(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleUnblock = async (blockedUserId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'blocked', blockedUserId));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Blocked Users
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Blocked accounts cannot message, call, or see your online status.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading blocked accounts...</span>
          </div>
        ) : blockedList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
              <UserX className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No blocked users
            </h2>
            <p className="text-xs text-slate-400">
              You haven't blocked anyone yet.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            {blockedList.map((b) => (
              <div
                key={b.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    {b.displayName || 'User'}
                  </h2>
                  <p className="text-xs text-indigo-500 font-mono">@{b.username}</p>
                </div>

                <button
                  onClick={() => handleUnblock(b.blockedUserId || b.id)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
