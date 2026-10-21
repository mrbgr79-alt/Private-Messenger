import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  Bell,
  CheckCheck,
  Trash2,
  MessageSquare,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { AppNotification } from '../../types';

interface NotificationsScreenProps {
  onOpenConversation?: (conversationId: string) => void;
}

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  onOpenConversation,
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushStatus, setPushStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  useEffect(() => {
    if (!user) return;
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: AppNotification[] = [];
        snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setNotifications(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Notifications fetch:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Request browser push notification permission
  const requestPushPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Push notifications not supported in this browser.');
      return;
    }
    const result = await Notification.requestPermission();
    setPushStatus(result);
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user) return;
    notifications.forEach((n) => {
      if (!n.read) {
        updateDoc(doc(db, 'users', user.uid, 'notifications', n.id), {
          read: true,
        }).catch(() => {});
      }
    });
  };

  // Clear single notification
  const deleteNotification = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Notifications
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Alerts for incoming calls, messages, and mentions
            </p>
          </div>

          {notifications.length > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}
        </div>

        {/* Push notifications permission status banner */}
        {pushStatus !== 'granted' && (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-500 shrink-0" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  Enable Browser & Device Push Notifications
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Receive alerts when RM CHAT is running in the background.
                </p>
              </div>
            </div>
            <button
              onClick={requestPushPermission}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-xs shrink-0 cursor-pointer"
            >
              Enable
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 mx-auto flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No notifications
            </h2>
            <p className="text-xs text-slate-400">
              You are all caught up! New messages and call alerts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  n.read
                    ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    : 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-slate-900 dark:text-white shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 shrink-0 mt-0.5">
                    {n.type === 'call' ? (
                      <Phone className="w-4 h-4" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold leading-tight">{n.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {n.body}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block">
                      {new Date(n.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteNotification(n.id)}
                  title="Dismiss notification"
                  className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
