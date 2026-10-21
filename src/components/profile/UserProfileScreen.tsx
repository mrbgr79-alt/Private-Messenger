import React, { useEffect, useState, useRef } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  User,
  AtSign,
  Camera,
  Edit3,
  Calendar,
  ShieldCheck,
  Check,
  Loader2,
  MessageSquare,
  Phone,
  Video,
  ArrowLeft,
  UserPlus,
  UserCheck,
  Clock,
  UserMinus,
} from 'lucide-react';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { UserProfile, FriendRequest } from '../../types';
import {
  sendFriendRequest,
  acceptFriendRequest,
  cancelFriendRequest,
  unfriendUser,
  getFriendRequestId,
} from '../../services/friendService';

interface UserProfileScreenProps {
  viewingUserId?: string;
  onBack?: () => void;
  onStartChat?: (userId: string, profile: UserProfile) => void;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({
  viewingUserId,
  onBack,
  onStartChat,
}) => {
  const { user, userProfile, updateUserProfile, claimUsername } = useAuth();
  const { startCall } = useCall();

  const isOwnProfile = !viewingUserId || viewingUserId === user?.uid;
  const [profile, setProfile] = useState<UserProfile | null>(isOwnProfile ? userProfile : null);
  const [loading, setLoading] = useState(!isOwnProfile);

  // Friendship states
  const [isFriend, setIsFriend] = useState(false);
  const [friendReq, setFriendReq] = useState<FriendRequest | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOwnProfile) {
      setProfile(userProfile);
      if (userProfile) {
        setDisplayName(userProfile.displayName || '');
        setUsername(userProfile.username || '');
        setBio(userProfile.bio || '');
      }
      setLoading(false);
    } else if (viewingUserId) {
      setLoading(true);
      getDoc(doc(db, 'users', viewingUserId))
        .then((snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [viewingUserId, isOwnProfile, userProfile]);

  // Listen to friendship and friend request state
  useEffect(() => {
    if (!user || isOwnProfile || !viewingUserId) return;

    // Contact / Friend check
    const contactRef = doc(db, 'users', user.uid, 'contacts', viewingUserId);
    const unsubContact = onSnapshot(contactRef, (snap) => {
      setIsFriend(snap.exists());
    });

    // Friend request check
    const reqId = getFriendRequestId(user.uid, viewingUserId);
    const reqRef = doc(db, 'friendRequests', reqId);
    const unsubReq = onSnapshot(reqRef, (snap) => {
      if (snap.exists()) {
        setFriendReq({ id: snap.id, ...(snap.data() as any) });
      } else {
        setFriendReq(null);
      }
    });

    return () => {
      unsubContact();
      unsubReq();
    };
  }, [user, isOwnProfile, viewingUserId]);

  const handleSendFriendReq = async () => {
    if (!user || !profile) return;
    try {
      await sendFriendRequest(user, userProfile, profile);
    } catch (err: any) {
      alert(err.message || 'Failed to send friend request.');
    }
  };

  const handleAcceptFriendReq = async () => {
    if (!user || !friendReq) return;
    try {
      await acceptFriendRequest(friendReq.id, user, userProfile, profile || undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to accept friend request.');
    }
  };

  const handleCancelFriendReq = async () => {
    if (!friendReq) return;
    try {
      await cancelFriendRequest(friendReq.id);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request.');
    }
  };

  const handleUnfriendClick = async () => {
    if (!user || !profile || !window.confirm('Unfriend this user?')) return;
    try {
      await unfriendUser(user.uid, profile.uid);
    } catch (err) {
      console.warn(err);
    }
  };

  // Handle Save Profile
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile || !user) return;
    setSaving(true);
    setEditError(null);
    try {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (cleanUsername && cleanUsername !== userProfile?.usernameLower) {
        const claimRes = await claimUsername(cleanUsername, displayName.trim());
        if (!claimRes.success) {
          setEditError(claimRes.error || 'Failed to update username.');
          setSaving(false);
          return;
        }
      }
      await updateUserProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setEditError(err.message || 'Error updating profile.');
    } finally {
      setSaving(false);
    }
  };

  // Upload Avatar
  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Avatar image must be under 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const storagePath = `users/${user.uid}/avatar`;
      const fileRef = ref(storage, storagePath);
      const uploadTask = await uploadBytesResumable(fileRef, file);
      const downloadUrl = await getDownloadURL(uploadTask.ref);

      await updateUserProfile({ photoURL: downloadUrl });
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      alert('Failed to upload avatar: ' + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
        <span className="text-xs">Loading profile...</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p className="text-sm">User profile not found.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors p-4 sm:p-6 overflow-y-auto">
      <div className="max-w-xl mx-auto w-full space-y-6">
        {/* Top Header if viewing another user */}
        {onBack && (
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">Profile</h1>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-500/5 relative overflow-hidden">
          {/* Banner decoration */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 opacity-90" />

          {/* Avatar & Edit button */}
          <div className="relative pt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div className="relative inline-block">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-3xl border-4 border-white dark:border-slate-900 shadow-lg">
                  {profile.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}

              {/* Online status indicator */}
              {profile.isOnline && (
                <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-3 border-white dark:border-slate-900" />
              )}

              {/* Change avatar button */}
              {isOwnProfile && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Upload profile photo"
                  className="absolute bottom-0 -right-2 p-2 rounded-2xl bg-indigo-600 text-white shadow-md hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* Actions */}
            {isOwnProfile ? (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2.5 rounded-2xl font-semibold text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-end"
              >
                <Edit3 className="w-4 h-4" />
                <span>{isEditing ? 'Cancel Editing' : 'Edit Profile'}</span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
                {/* Friend Status Action Button */}
                {isFriend ? (
                  <button
                    onClick={handleUnfriendClick}
                    className="px-3 py-2 rounded-2xl bg-emerald-500/10 hover:bg-rose-500/10 border border-emerald-500/20 hover:border-rose-500/30 text-emerald-600 dark:text-emerald-400 hover:text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer group"
                    title="Click to unfriend"
                  >
                    <Check className="w-3.5 h-3.5 group-hover:hidden" />
                    <UserMinus className="w-3.5 h-3.5 hidden group-hover:inline" />
                    <span className="group-hover:hidden">Friends</span>
                    <span className="hidden group-hover:inline">Unfriend</span>
                  </button>
                ) : friendReq?.status === 'pending' && friendReq.receiverId === user?.uid ? (
                  <button
                    onClick={handleAcceptFriendReq}
                    className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Request</span>
                  </button>
                ) : friendReq?.status === 'pending' && friendReq.senderId === user?.uid ? (
                  <button
                    onClick={handleCancelFriendReq}
                    className="px-3.5 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Cancel Request</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSendFriendReq}
                    className="px-3.5 py-2 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Friend</span>
                  </button>
                )}

                {onStartChat && (
                  <button
                    onClick={() => onStartChat(profile.uid, profile)}
                    className="px-4 py-2 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                )}
                <button
                  onClick={() => startCall(profile.uid, profile.displayName, profile.photoURL, 'voice')}
                  title="Voice Call"
                  className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-600 transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => startCall(profile.uid, profile.displayName, profile.photoURL, 'video')}
                  title="Video Call"
                  className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-600 transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Details / Editing Form */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              {editError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={50}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Username Handle
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    required
                    minLength={3}
                    maxLength={30}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-1">
                  Unique handle (3–30 characters, lowercase letters, numbers, and underscores).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Bio / Status
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={300}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={saving || !displayName.trim()}
                className="w-full py-3 rounded-2xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm shadow-md"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {profile.displayName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                  <AtSign className="w-3.5 h-3.5" />
                  <span>{profile.username || 'unknown'}</span>
                </div>
              </div>

              {profile.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                  {profile.bio}
                </p>
              )}

              {/* Status & Metadata */}
              <div className="pt-2 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Status</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    {profile.isOnline ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-500">Active Now</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span>Offline</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Member Since</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    <span>
                      {profile.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString([], {
                            month: 'short',
                            year: 'numeric',
                          })
                        : '2026'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security / Verification Badge */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-indigo-500/20 text-xs flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
          <div className="text-slate-600 dark:text-slate-300">
            <span className="font-bold">Verified Account ID:</span> {profile.uid}
          </div>
        </div>
      </div>
    </div>
  );
};
