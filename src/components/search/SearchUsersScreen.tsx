import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Search,
  MessageSquare,
  UserCheck,
  UserPlus,
  Loader2,
  Users,
  Eye,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, FriendRequest } from '../../types';
import {
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
} from '../../services/friendService';

interface SearchUsersScreenProps {
  onStartChat: (otherUserId: string, otherProfile: UserProfile) => void;
  onViewProfile: (userId: string) => void;
}

export const SearchUsersScreen: React.FC<SearchUsersScreenProps> = ({
  onStartChat,
  onViewProfile,
}) => {
  const { user, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  // Maps for friendship state
  const [friendsMap, setFriendsMap] = useState<Record<string, boolean>>({});
  const [sentRequestsMap, setSentRequestsMap] = useState<Record<string, string>>({}); // targetUid -> reqId
  const [receivedRequestsMap, setReceivedRequestsMap] = useState<Record<string, FriendRequest>>({}); // senderUid -> req

  // 1. Listen to contacts to know who is already a friend
  useEffect(() => {
    if (!user) return;
    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const unsub = onSnapshot(contactsRef, (snap) => {
      const map: Record<string, boolean> = {};
      snap.forEach((d) => {
        map[d.data().contactUserId] = true;
      });
      setFriendsMap(map);
    });
    return () => unsub();
  }, [user]);

  // 2. Listen to sent pending requests
  useEffect(() => {
    if (!user) return;
    const sentQ = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(sentQ, (snap) => {
      const map: Record<string, string> = {};
      snap.forEach((d) => {
        map[d.data().receiverId] = d.id;
      });
      setSentRequestsMap(map);
    });
    return () => unsub();
  }, [user]);

  // 3. Listen to received pending requests
  useEffect(() => {
    if (!user) return;
    const recQ = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
    const unsub = onSnapshot(recQ, (snap) => {
      const map: Record<string, FriendRequest> = {};
      snap.forEach((d) => {
        map[d.data().senderId] = { id: d.id, ...(d.data() as any) };
      });
      setReceivedRequestsMap(map);
    });
    return () => unsub();
  }, [user]);

  // Execute user search
  const handleSearch = async (term: string) => {
    const clean = term.trim();
    if (!clean || !user) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const cleanLower = clean.toLowerCase();
      const usersRef = collection(db, 'users');

      // 1. Search by normalized username
      const usernameQuery = query(
        usersRef,
        where('usernameLower', '>=', cleanLower),
        where('usernameLower', '<=', cleanLower + '\uf8ff'),
        limit(20)
      );

      const usernameSnap = await getDocs(usernameQuery);
      const list: UserProfile[] = [];
      const seenUids = new Set<string>();

      usernameSnap.forEach((docSnap) => {
        const u = docSnap.data() as UserProfile;
        if (u.uid !== user.uid && !seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          list.push({ ...u, email: undefined });
        }
      });

      // 2. Also search by displayName if few results
      if (list.length < 5) {
        const nameQuery = query(
          usersRef,
          where('displayName', '>=', clean),
          where('displayName', '<=', clean + '\uf8ff'),
          limit(20)
        );
        const nameSnap = await getDocs(nameQuery);
        nameSnap.forEach((docSnap) => {
          const u = docSnap.data() as UserProfile;
          if (u.uid !== user.uid && !seenUids.has(u.uid)) {
            seenUids.add(u.uid);
            list.push({ ...u, email: undefined });
          }
        });
      }

      setResults(list);
    } catch (err) {
      console.error('[RM CHAT] User search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Friend Request Actions
  const handleSendRequest = async (targetUser: UserProfile) => {
    if (!user) return;
    try {
      await sendFriendRequest(user, userProfile, targetUser);
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request.');
    }
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (!user) return;
    try {
      await acceptFriendRequest(req.id, user, userProfile);
    } catch (err: any) {
      alert(err.message || 'Failed to accept request.');
    }
  };

  const handleCancelRequest = async (reqId: string) => {
    try {
      await cancelFriendRequest(reqId);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Search className="w-6 h-6 text-indigo-500" />
            <span>Discover Users & Friends</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Search for people by exact handle (@username) or name, and send friend requests.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search username (e.g. alex) or display name..."
            className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 shadow-xs transition-all"
            autoFocus
          />
          {loading && (
            <Loader2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-indigo-500" />
          )}
        </div>

        {/* Results */}
        {searchTerm.trim() ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
              <span>Search Results ({results.length})</span>
            </div>

            {results.length === 0 && !loading ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No users found matching "{searchTerm}"
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Check the spelling or try searching by exact handle.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((targetUser) => {
                  const isFriend = !!friendsMap[targetUser.uid];
                  const sentReqId = sentRequestsMap[targetUser.uid];
                  const receivedReq = receivedRequestsMap[targetUser.uid];

                  return (
                    <div
                      key={targetUser.uid}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-500/50 transition-all"
                    >
                      <div
                        onClick={() => onViewProfile(targetUser.uid)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <div className="relative shrink-0">
                          {targetUser.photoURL ? (
                            <img
                              src={targetUser.photoURL}
                              alt={targetUser.displayName}
                              className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
                              {targetUser.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          {targetUser.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {targetUser.displayName}
                          </h3>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono truncate">
                            @{targetUser.username}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {targetUser.bio || 'Available on RM CHAT'}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {/* Direct Chat */}
                        <button
                          onClick={() => onStartChat(targetUser.uid, targetUser)}
                          title="Message user"
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Chat</span>
                        </button>

                        {/* Friend Status Action */}
                        {isFriend ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold text-center flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Friends</span>
                          </span>
                        ) : receivedReq ? (
                          <button
                            onClick={() => handleAcceptRequest(receivedReq)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold text-center flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Accept</span>
                          </button>
                        ) : sentReqId ? (
                          <button
                            onClick={() => handleCancelRequest(sentReqId)}
                            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-[11px] font-semibold text-center hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Click to cancel"
                          >
                            <Clock className="w-3 h-3 inline mr-1 text-amber-500" />
                            <span>Requested</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(targetUser)}
                            className="px-2.5 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Empty Search Screen State */
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Find Friends on RM CHAT
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Type any username or name above to find and connect with friends, send friend requests, or start private chats.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
