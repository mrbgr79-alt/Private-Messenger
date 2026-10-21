import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import {
  Sparkles,
  Heart,
  Smile,
  ThumbsUp,
  MessageCircle,
  Share2,
  Trash2,
  Image as ImageIcon,
  Send,
  X,
  Copy,
  Check,
  MoreVertical,
  ExternalLink,
  Flame,
  Plus,
  Loader2,
} from 'lucide-react';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { StatusPost, StatusComment, ReactionType, UserProfile } from '../../types';
import {
  createStatusPost,
  toggleReaction,
  addComment,
  deleteComment,
  deleteStatusPost,
  recordShare,
} from '../../services/statusService';

const GRADIENT_PRESETS = [
  { id: '', label: 'Classic', class: '' },
  { id: 'from-blue-600 via-indigo-600 to-purple-600', label: 'Indigo Wave', class: 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white' },
  { id: 'from-purple-600 via-pink-600 to-rose-500', label: 'Sunset Glow', class: 'bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 text-white' },
  { id: 'from-emerald-600 via-teal-600 to-cyan-600', label: 'Emerald Sea', class: 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white' },
  { id: 'from-amber-500 via-orange-600 to-red-600', label: 'Fiery Amber', class: 'bg-gradient-to-tr from-amber-500 via-orange-600 to-red-600 text-white' },
  { id: 'from-slate-900 via-purple-950 to-slate-900', label: 'Midnight', class: 'bg-gradient-to-tr from-slate-900 via-purple-950 to-slate-900 text-white border border-purple-500/20' },
];

const MOOD_PRESETS = [
  '😊 Happy',
  '🔥 Excited',
  '🥰 Blessed',
  '🎉 Celebrating',
  '💡 Inspired',
  '🎧 Vibing',
  '☕ Relaxed',
  '🤔 Thinking',
  '💪 Motivated',
];

const REACTIONS_MAP: Record<ReactionType, { label: string; emoji: string; color: string }> = {
  like: { label: 'Like', emoji: '👍', color: 'text-blue-500' },
  love: { label: 'Love', emoji: '❤️', color: 'text-rose-500' },
  laugh: { label: 'Haha', emoji: '😂', color: 'text-amber-500' },
  wow: { label: 'Wow', emoji: '😮', color: 'text-yellow-500' },
  sad: { label: 'Sad', emoji: '😢', color: 'text-blue-400' },
};

function formatTimeAgo(isoString: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch {
    return 'Recently';
  }
}

interface ForYouScreenProps {
  onViewProfile?: (userId: string) => void;
  onStartChat?: (userId: string, profile: UserProfile) => void;
}

export const ForYouScreen: React.FC<ForYouScreenProps> = ({ onViewProfile }) => {
  const { user, userProfile } = useAuth();
  const [posts, setPosts] = useState<StatusPost[]>([]);
  const [loading, setLoading] = useState(true);

  // New post form state
  const [isPosting, setIsPosting] = useState(false);
  const [postText, setPostText] = useState('');
  const [selectedGradient, setSelectedGradient] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submittingPost, setSubmittingPost] = useState(false);

  // Active share modal
  const [sharingPost, setSharingPost] = useState<StatusPost | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Active comments drawer
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);

  // Subscribe to real-time status posts
  useEffect(() => {
    const postsQuery = query(
      collection(db, 'statusPosts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      postsQuery,
      (snapshot) => {
        const list: StatusPost[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as any),
        }));
        setPosts(list);
        setLoading(false);
      },
      (error) => {
        console.warn('[For You] Posts listener issue:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle image upload from file input
  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('Photo must be under 4MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit new status
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!postText.trim() && !imageUrl)) return;

    setSubmittingPost(true);
    try {
      await createStatusPost(user, userProfile, postText, {
        imageUrl: imageUrl.trim() || undefined,
        bgGradient: selectedGradient || undefined,
        mood: selectedMood || undefined,
      });

      // Reset form
      setPostText('');
      setSelectedGradient('');
      setSelectedMood('');
      setImageUrl('');
      setImagePreview(null);
      setIsPosting(false);
    } catch (err: any) {
      alert(err.message || 'Failed to share status.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Open sharing modal
  const handleShareClick = (post: StatusPost) => {
    setSharingPost(post);
    setCopiedLink(false);
  };

  // Share actions
  const shareToPlatform = async (platform: 'whatsapp' | 'messenger' | 'telegram' | 'facebook' | 'twitter' | 'native') => {
    if (!sharingPost) return;
    const postUrl = window.location.origin;
    const shareText = `Check out ${sharingPost.authorName}'s status on RM CHAT: "${sharingPost.content.slice(0, 100)}"`;
    const fullShare = `${shareText}\n${postUrl}`;

    recordShare(sharingPost.id);

    if (platform === 'native' && navigator.share) {
      try {
        await navigator.share({
          title: `RM CHAT - ${sharingPost.authorName}`,
          text: shareText,
          url: postUrl,
        });
        setSharingPost(null);
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShare)}`;
        break;
      case 'messenger':
        url = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(postUrl)}&app_id=29507255&redirect_uri=${encodeURIComponent(postUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    setSharingPost(null);
  };

  const copyPostLink = () => {
    if (!sharingPost) return;
    const shareText = `"${sharingPost.content}" - ${sharingPost.authorName} on RM CHAT: ${window.location.origin}`;
    navigator.clipboard.writeText(shareText);
    setCopiedLink(true);
    recordShare(sharingPost.id);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors overflow-y-auto">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>For You</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                Feed
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Explore public status updates, reactions & community thoughts
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsPosting(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Write Status</span>
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Quick Post Prompt Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            {userProfile?.photoURL ? (
              <img
                src={userProfile.photoURL}
                alt={userProfile.displayName}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <button
              onClick={() => setIsPosting(true)}
              className="flex-1 text-left px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs sm:text-sm hover:bg-slate-200/70 dark:hover:bg-slate-750 transition-colors cursor-pointer"
            >
              What's on your mind today, {userProfile?.displayName?.split(' ')[0] || 'friend'}?
            </button>
          </div>
        </div>

        {/* Create Status Modal */}
        {isPosting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Create Status Update</span>
                </h3>
                <button
                  onClick={() => setIsPosting(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="space-y-4">
                {/* Author Preview & Mood */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {userProfile?.photoURL ? (
                      <img
                        src={userProfile.photoURL}
                        alt="You"
                        className="w-9 h-9 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                        {userProfile?.displayName?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {userProfile?.displayName || 'You'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        @{userProfile?.username || 'user'}
                      </p>
                    </div>
                  </div>

                  {selectedMood && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                      {selectedMood}
                    </span>
                  )}
                </div>

                {/* Status Content Input with gradient preview */}
                <div
                  className={`rounded-2xl p-4 transition-all ${
                    selectedGradient
                      ? `${GRADIENT_PRESETS.find((g) => g.id === selectedGradient)?.class} min-h-[140px] flex items-center justify-center shadow-inner`
                      : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750'
                  }`}
                >
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder="Write something cool, inspiring or fun for your friends..."
                    rows={selectedGradient ? 3 : 4}
                    maxLength={1000}
                    required={!imageUrl}
                    className={`w-full bg-transparent focus:outline-hidden resize-none transition-all ${
                      selectedGradient
                        ? 'text-white font-bold text-center text-lg placeholder-white/70'
                        : 'text-sm text-slate-900 dark:text-white placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Attached Image Preview */}
                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-48">
                    <img
                      src={imagePreview}
                      alt="Uploaded preview"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setImageUrl('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Background Gradient Palette */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Background Style
                  </label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {GRADIENT_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedGradient(preset.id)}
                        className={`w-8 h-8 rounded-xl shrink-0 cursor-pointer transition-all ${
                          preset.id
                            ? preset.class
                            : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'
                        } ${
                          selectedGradient === preset.id
                            ? 'ring-2 ring-indigo-500 scale-110 shadow-md'
                            : 'opacity-80 hover:opacity-100'
                        }`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                {/* Mood & Feeling Selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                    Mood / Feeling
                  </label>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {MOOD_PRESETS.map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setSelectedMood(selectedMood === mood ? '' : mood)}
                        className={`text-xs px-2.5 py-1 rounded-xl shrink-0 transition-all cursor-pointer ${
                          selectedMood === mood
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {mood}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Media Attachment Options */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline">
                    <ImageIcon className="w-4 h-4" />
                    <span>Attach Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFile}
                      className="hidden"
                    />
                  </label>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {postText.length}/1000
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submittingPost || (!postText.trim() && !imageUrl)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {submittingPost ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Share to For You</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            <p className="text-xs">Loading latest For You feed...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              No status posts yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Be the first to share an inspiring thought, status or photo with your RM CHAT community!
            </p>
            <button
              onClick={() => setIsPosting(true)}
              className="mt-4 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 cursor-pointer shadow-md"
            >
              Write First Status
            </button>
          </div>
        )}

        {/* Feed Posts */}
        {!loading &&
          posts.map((post) => (
            <StatusCard
              key={post.id}
              post={post}
              currentUserId={user?.uid}
              onShare={() => handleShareClick(post)}
              onToggleComments={() =>
                setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)
              }
              showComments={activeCommentsPostId === post.id}
              onViewProfile={onViewProfile}
            />
          ))}
      </div>

      {/* Share Modal Dialog */}
      {sharingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-500" />
                <span>Share Status Update</span>
              </h3>
              <button
                onClick={() => setSharingPost(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share {sharingPost.authorName}'s status update directly to your favorite messengers and social platforms:
            </p>

            {/* Social Share Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => shareToPlatform('whatsapp')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <span className="text-xl mb-1">💬</span>
                <span>WhatsApp</span>
              </button>

              <button
                onClick={() => shareToPlatform('messenger')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <span className="text-xl mb-1">⚡</span>
                <span>Messenger</span>
              </button>

              <button
                onClick={() => shareToPlatform('telegram')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <span className="text-xl mb-1">✈️</span>
                <span>Telegram</span>
              </button>

              <button
                onClick={() => shareToPlatform('facebook')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs transition-colors cursor-pointer"
              >
                <span className="text-xl mb-1">📘</span>
                <span>Facebook</span>
              </button>

              <button
                onClick={() => shareToPlatform('twitter')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                <span className="text-xl mb-1">𝕏</span>
                <span>Twitter / X</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => shareToPlatform('native')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-semibold text-xs transition-colors cursor-pointer"
                >
                  <span className="text-xl mb-1">📲</span>
                  <span>More Apps</span>
                </button>
              )}
            </div>

            {/* Copy Link Row */}
            <div className="pt-2">
              <button
                onClick={copyPostLink}
                className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-750 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-500 font-bold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Post Text & Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* Single Status Card Component */
interface StatusCardProps {
  post: StatusPost;
  currentUserId?: string;
  onShare: () => void;
  onToggleComments: () => void;
  showComments: boolean;
  onViewProfile?: (userId: string) => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  post,
  currentUserId,
  onShare,
  onToggleComments,
  showComments,
  onViewProfile,
}) => {
  const { user, userProfile } = useAuth();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [comments, setComments] = useState<StatusComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const myReaction: ReactionType | undefined = currentUserId
    ? post.reactions?.[currentUserId]
    : undefined;

  // Subscribe to comments when drawer is opened
  useEffect(() => {
    if (!showComments) return;
    setLoadingComments(true);

    const commentsQuery = query(
      collection(db, 'statusPosts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const list: StatusComment[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
      }));
      setComments(list);
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [showComments, post.id]);

  const handleSelectReaction = async (type: ReactionType) => {
    if (!currentUserId) return;
    setShowReactionPicker(false);
    try {
      await toggleReaction(post.id, currentUserId, type);
    } catch (err) {
      console.warn('Reaction error:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !commentInput.trim()) return;

    setSubmittingComment(true);
    try {
      await addComment(post.id, user, userProfile, commentInput.trim());
      setCommentInput('');
    } catch (err) {
      console.warn('Add comment error:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    try {
      await deleteStatusPost(post.id);
    } catch (err) {
      console.warn('Delete post error:', err);
    }
  };

  // Compute breakdown of top reactions
  const totalReactions =
    post.reactionCounts?.total ?? Object.keys(post.reactions || {}).length;

  const topReactions: ReactionType[] = (['love', 'like', 'laugh', 'wow', 'sad'] as ReactionType[])
    .filter((type) => (post.reactionCounts?.[type] || 0) > 0)
    .slice(0, 3);

  return (
    <article className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-all">
      {/* Post Header */}
      <div className="p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onViewProfile && onViewProfile(post.authorId)}
            className="cursor-pointer hover:opacity-85 transition-opacity"
          >
            {post.authorPhoto ? (
              <img
                src={post.authorPhoto}
                alt={post.authorName}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/20"
              />
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-sm flex items-center justify-center">
                {post.authorName?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewProfile && onViewProfile(post.authorId)}
                className="font-bold text-sm text-slate-900 dark:text-white hover:underline cursor-pointer"
              >
                {post.authorName}
              </button>

              {post.mood && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                  {post.mood}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono text-[11px]">@{post.authorUsername}</span>
              <span>•</span>
              <time dateTime={post.createdAt}>{formatTimeAgo(post.createdAt)}</time>
            </div>
          </div>
        </div>

        {/* Options dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showOptions && (
            <div className="absolute right-0 top-8 z-30 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1 animate-in fade-in">
              {currentUserId === post.authorId && (
                <button
                  onClick={handleDeletePost}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Post</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowOptions(false);
                  onShare();
                }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Post</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Body */}
      {post.bgGradient ? (
        <div
          className={`px-6 py-12 text-center text-lg sm:text-xl font-bold ${
            GRADIENT_PRESETS.find((g) => g.id === post.bgGradient)?.class ||
            'bg-gradient-to-tr from-blue-600 to-purple-600 text-white'
          }`}
        >
          <p className="leading-relaxed drop-shadow-xs max-w-lg mx-auto">
            {post.content}
          </p>
        </div>
      ) : (
        <div className="px-5 pb-3">
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
            {post.content}
          </p>
        </div>
      )}

      {/* Image attachment if provided */}
      {post.imageUrl && (
        <div className="mt-2 bg-slate-100 dark:bg-slate-950">
          <img
            src={post.imageUrl}
            alt="Status media"
            className="w-full max-h-[500px] object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Reaction & Counts Stats Bar */}
      {(totalReactions > 0 || (post.commentsCount || 0) > 0 || (post.sharesCount || 0) > 0) && (
        <div className="px-5 py-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5">
            {topReactions.length > 0 && (
              <div className="flex items-center -space-x-1">
                {topReactions.map((type) => (
                  <span
                    key={type}
                    className="w-5 h-5 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-xs shadow-xs"
                  >
                    {REACTIONS_MAP[type].emoji}
                  </span>
                ))}
              </div>
            )}
            {totalReactions > 0 && (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {totalReactions}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {(post.commentsCount || 0) > 0 && (
              <button
                onClick={onToggleComments}
                className="hover:underline cursor-pointer"
              >
                {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
            {(post.sharesCount || 0) > 0 && (
              <span>
                {post.sharesCount} {post.sharesCount === 1 ? 'share' : 'shares'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons Row with Interactive Reactions */}
      <div className="px-3 py-2 flex items-center justify-around relative border-t border-slate-100 dark:border-slate-800">
        {/* Reaction Trigger Button with Hover/Long-press popover */}
        <div
          className="relative flex-1"
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
        >
          {/* Reaction Picker Bar */}
          {showReactionPicker && (
            <div className="absolute -top-13 left-2 z-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-2.5 py-1.5 shadow-2xl flex items-center gap-2 animate-in zoom-in-95 duration-150">
              {(Object.keys(REACTIONS_MAP) as ReactionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelectReaction(type)}
                  className="w-8 h-8 rounded-full hover:scale-125 transition-transform flex items-center justify-center text-lg active:scale-95 cursor-pointer"
                  title={REACTIONS_MAP[type].label}
                >
                  {REACTIONS_MAP[type].emoji}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => handleSelectReaction(myReaction || 'like')}
            className={`w-full py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
              myReaction
                ? `${REACTIONS_MAP[myReaction].color} font-bold`
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            {myReaction ? (
              <>
                <span className="text-base">{REACTIONS_MAP[myReaction].emoji}</span>
                <span>{REACTIONS_MAP[myReaction].label}</span>
              </>
            ) : (
              <>
                <ThumbsUp className="w-4 h-4" />
                <span>Like</span>
              </>
            )}
          </button>
        </div>

        {/* Comment Button */}
        <button
          onClick={onToggleComments}
          className="flex-1 py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Comment</span>
        </button>

        {/* Share Button */}
        <button
          onClick={onShare}
          className="flex-1 py-2 rounded-2xl flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>
      </div>

      {/* Expandable Comments Section */}
      {showComments && (
        <div className="bg-slate-50/70 dark:bg-slate-950/60 p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 animate-in fade-in">
          {/* Comments List */}
          {loadingComments ? (
            <div className="flex items-center justify-center py-4 text-slate-400 text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span>Loading comments...</span>
            </div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-center text-slate-400 py-3">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 group">
                  {c.authorPhoto ? (
                    <img
                      src={c.authorPhoto}
                      alt={c.authorName}
                      className="w-7 h-7 rounded-xl object-cover shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {c.authorName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}

                  <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {c.authorName}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">
                          {formatTimeAgo(c.createdAt)}
                        </span>
                        {currentUserId === c.authorId && (
                          <button
                            onClick={() => deleteComment(post.id, c.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-500 text-slate-400 transition-opacity cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Comment Input */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Write a comment..."
              maxLength={400}
              className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={submittingComment || !commentInput.trim()}
              className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
