import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import {
  Users,
  Star,
  MessageSquare,
  Phone,
  Video,
  Trash2,
  Search,
  UserPlus,
  UserCheck,
  Check,
  X,
  Clock,
  Loader2,
  UserMinus,
  Sparkles,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Contact, FriendRequest, UserProfile } from '../../types';
import {
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  unfriendUser,
} from '../../services/friendService';

interface ContactsScreenProps {
  onStartChat: (otherUserId: string, otherProfile: UserProfile) => void;
  onNavigateSearch: () => void;
  onViewProfile: (userId: string) => void;
}

type ContactsTab = 'friends' | 'requests' | 'all';

export const ContactsScreen: React.FC<ContactsScreenProps> = ({
  onStartChat,
  onNavigateSearch,
  onViewProfile,
}) => {
  const { user, userProfile } = useAuth();
  const { startCall } = useCall();

  const [activeTab, setActiveTab] = useState<ContactsTab>('friends');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Listen to user contacts
  useEffect(() => {
    if (!user) return;

    const contactsRef = collection(db, 'users', user.uid, 'contacts');
    const unsubscribe = onSnapshot(contactsRef, async (snapshot) => {
      const promises = snapshot.docs.map(async (docSnap) => {
        const contactData = { id: docSnap.id, ...(docSnap.data() as any) } as Contact;
        try {
          const userSnap = await getDoc(doc(db, 'users', contactData.contactUserId));
          if (userSnap.exists()) {
            contactData.userProfile = userSnap.data() as UserProfile;
          }
        } catch {
          // Ignore
        }
        return contactData;
      });

      const resolved = await Promise.all(promises);
      setContacts(resolved);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Listen to received friend requests
  useEffect(() => {
    if (!user) return;

    const receivedQuery = query(
      collection(db, 'friendRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(receivedQuery, (snapshot) => {
      const list: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setReceivedRequests(list);
    });

    return () => unsubscribe();
  }, [user]);

  // 3. Listen to sent friend requests
  useEffect(() => {
    if (!user) return;

    const sentQuery = query(
      collection(db, 'friendRequests'),
      where('senderId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(sentQuery, (snapshot) => {
      const list: FriendRequest[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setSentRequests(list);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle Accept
  const handleAccept = async (req: FriendRequest) => {
    if (!user) return;
    try {
      await acceptFriendRequest(req.id, user, userProfile);
    } catch (err: any) {
      alert(err.message || 'Failed to accept friend request.');
    }
  };

  // Handle Reject
  const handleReject = async (reqId: string) => {
    try {
      await rejectFriendRequest(reqId);
    } catch (err: any) {
      alert(err.message || 'Failed to reject friend request.');
    }
  };

  // Handle Cancel Sent
  const handleCancel = async (reqId: string) => {
    try {
      await cancelFriendRequest(reqId);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request.');
    }
  };

  // Toggle Favorite
  const toggleFavorite = async (contactId: string, current: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'contacts', contactId), {
        isFavorite: !current,
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Remove / Unfriend
  const handleUnfriend = async (contactUserId: string) => {
    if (!user || !window.confirm('Are you sure you want to unfriend this user?')) return;
    try {
      await unfriendUser(user.uid, contactUserId);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered contacts
  const friendsList = contacts.filter((c) => c.isFriend !== false);
  const activeContactsList = activeTab === 'friends' ? friendsList : contacts;

  const displayedContacts = activeContactsList.filter((c) => {
    if (filterFavorites && !c.isFavorite) return false;
    if (!searchTerm.trim()) return true;
    const name = c.userProfile?.displayName?.toLowerCase() || '';
    const username = c.userProfile?.username?.toLowerCase() || '';
    return name.includes(searchTerm.toLowerCase()) || username.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-500" />
              <span>Friends & Contacts</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Connect with your friends, manage requests, and chat instantly
            </p>
          </div>

          <button
            onClick={onNavigateSearch}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-semibold hover:from-blue-500 hover:to-purple-500 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Find New Friends</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Friends</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
              {friendsList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Requests</span>
            {receivedRequests.length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Contacts ({contacts.length})</span>
          </button>
        </div>

        {/* Requests Tab View */}
        {activeTab === 'requests' ? (
          <div className="space-y-6">
            {/* Received Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Received Friend Requests</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono">
                    {receivedRequests.length}
                  </span>
                </h3>
              </div>

              {receivedRequests.length === 0 ? (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                  No pending friend requests received right now.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {receivedRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div
                        onClick={() => onViewProfile(req.senderId)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        {req.senderPhoto ? (
                          <img
                            src={req.senderPhoto}
                            alt={req.senderName}
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                            {req.senderName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {req.senderName}
                          </p>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono truncate">
                            @{req.senderUsername}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Sent you a friend request
                          </p>
                        </div>
                      </div>

                      {/* Accept / Reject Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleAccept(req)}
                          title="Accept Request"
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          title="Decline"
                          className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-rose-500/10 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Requests */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Sent Friend Requests</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                    {sentRequests.length}
                  </span>
                </h3>
              </div>

              {sentRequests.length === 0 ? (
                <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                  No sent friend requests pending.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sentRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div
                        onClick={() => onViewProfile(req.receiverId)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        {req.receiverPhoto ? (
                          <img
                            src={req.receiverPhoto}
                            alt={req.receiverName}
                            className="w-10 h-10 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                            {req.receiverName?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {req.receiverName}
                          </p>
                          <p className="text-xs text-slate-400 font-mono truncate">
                            @{req.receiverUsername}
                          </p>
                          <span className="text-[10px] text-amber-500 font-medium">
                            Pending confirmation...
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCancel(req.id)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Friends / All Contacts View */
          <>
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={`Search ${activeTab === 'friends' ? 'friends' : 'contacts'}...`}
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              <button
                onClick={() => setFilterFavorites(!filterFavorites)}
                className={`px-4 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                  filterFavorites
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Star className={`w-3.5 h-3.5 ${filterFavorites ? 'fill-current' : ''}`} />
                <span>Favorites Only</span>
              </button>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
                <span className="text-xs">Loading {activeTab}...</span>
              </div>
            ) : displayedContacts.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 mx-auto flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
                <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {filterFavorites
                    ? 'No favorite friends yet'
                    : activeTab === 'friends'
                    ? 'No friends yet'
                    : 'No contacts saved yet'}
                </h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Search for users by their RM CHAT handle to send friend requests!
                </p>
                {!filterFavorites && (
                  <button
                    onClick={onNavigateSearch}
                    className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer shadow-sm"
                  >
                    Find Friends Now
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayedContacts.map((c) => {
                  const prof = c.userProfile;
                  return (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs hover:border-indigo-500/50 transition-all"
                    >
                      <div
                        onClick={() => prof && onViewProfile(prof.uid)}
                        className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      >
                        <div className="relative shrink-0">
                          {prof?.photoURL ? (
                            <img
                              src={prof.photoURL}
                              alt={prof.displayName}
                              className="w-11 h-11 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                              {prof?.displayName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                          {prof?.isOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {prof?.displayName || 'User'}
                            </h2>
                            {c.isFriend && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
                                Friend
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono truncate">
                            @{prof?.username || 'handle'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {prof?.isOnline ? 'Online' : prof?.bio || 'RM CHAT User'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Favorite toggle */}
                        <button
                          onClick={() => toggleFavorite(c.id, c.isFavorite)}
                          title={c.isFavorite ? 'Remove Favorite' : 'Mark as Favorite'}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            c.isFavorite
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-amber-500'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${c.isFavorite ? 'fill-current' : ''}`} />
                        </button>

                        {/* Message button */}
                        {prof && (
                          <button
                            onClick={() => onStartChat(prof.uid, prof)}
                            title="Chat"
                            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xs cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}

                        {/* Call button */}
                        {prof && (
                          <button
                            onClick={() => startCall(prof.uid, prof.displayName, prof.photoURL, 'voice')}
                            title="Call"
                            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                        )}

                        {/* Unfriend / Remove button */}
                        <button
                          onClick={() => handleUnfriend(c.contactUserId)}
                          title="Unfriend"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
