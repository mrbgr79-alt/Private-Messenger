import React, { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  MessageSquare,
  Search,
  UserPlus,
  Clock,
  CheckCheck,
  Check,
  Image,
  FileText,
  Loader2,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Conversation } from '../../types';

interface ChatListScreenProps {
  onSelectConversation: (conversationId: string, otherUserId: string) => void;
  onNavigateSearch: () => void;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({
  onSelectConversation,
  onNavigateSearch,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    if (!user) return;

    const convsRef = collection(db, 'conversations');
    const q = query(
      convsRef,
      where('participantIds', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Conversation[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setConversations(list);
        setLoading(false);
      },
      (error) => {
        console.error('[RM CHAT] Conversation list error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!user) return false;
    const otherId = conv.participantIds.find((id) => id !== user.uid);
    const otherParticipant = otherId ? conv.participants?.[otherId] : null;
    const nameMatch = otherParticipant?.displayName?.toLowerCase().includes(searchFilter.toLowerCase());
    const usernameMatch = otherParticipant?.username?.toLowerCase().includes(searchFilter.toLowerCase());
    const textMatch = conv.lastMessage?.text?.toLowerCase().includes(searchFilter.toLowerCase());
    return nameMatch || usernameMatch || textMatch;
  });

  const formatTimestamp = (isoDate?: string) => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return date.toLocaleDateString([], { weekday: 'short' });
      } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Header & Search */}
      <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onNavigateSearch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-semibold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-all"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center h-64 text-slate-400">
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-500 mb-3">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
              {searchFilter ? 'No matching conversations' : 'No conversations yet'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">
              {searchFilter
                ? 'Try searching with a different name or keyword'
                : 'Discover users or invite friends by their unique RM CHAT handle to start messaging privately.'}
            </p>
            {!searchFilter && (
              <button
                onClick={onNavigateSearch}
                className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                Find Users to Chat
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            if (!user) return null;
            const otherId = conv.participantIds.find((id) => id !== user.uid) || '';
            const other = conv.participants?.[otherId] || {
              uid: otherId,
              displayName: 'User',
              username: 'handle',
            };
            const unread = conv.unreadCount?.[user.uid] || 0;
            const isTyping = conv.typing?.[otherId];

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id, otherId)}
                className="flex items-center gap-3.5 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {other.photoURL ? (
                    <img
                      src={other.photoURL}
                      alt={other.displayName}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                      {other.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {other.displayName}
                    </h2>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2">
                      {formatTimestamp(conv.lastMessage?.timestamp || conv.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {isTyping ? (
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                        typing...
                      </span>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 truncate">
                        {conv.lastMessage?.senderId === user.uid && (
                          <span className="shrink-0 text-slate-400">
                            {conv.lastMessage?.read ? (
                              <CheckCheck className="w-3.5 h-3.5 text-blue-500 inline" />
                            ) : (
                              <Check className="w-3.5 h-3.5 inline" />
                            )}
                          </span>
                        )}
                        {conv.lastMessage?.type === 'image' && (
                          <Image className="w-3.5 h-3.5 inline text-indigo-500 shrink-0" />
                        )}
                        {conv.lastMessage?.type === 'file' && (
                          <FileText className="w-3.5 h-3.5 inline text-indigo-500 shrink-0" />
                        )}
                        <span className="truncate">
                          {conv.lastMessage?.text || 'Started a conversation'}
                        </span>
                      </div>
                    )}

                    {unread > 0 && (
                      <span className="shrink-0 ml-2 w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shadow-sm">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
