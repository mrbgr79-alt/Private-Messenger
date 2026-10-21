import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import {
  ArrowLeft,
  Phone,
  Video,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  CornerUpLeft,
  X,
  Edit2,
  Trash2,
  Search,
  ShieldAlert,
  UserX,
  UserCheck,
  Download,
  Loader2,
} from 'lucide-react';
import { db, storage } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { soundManager } from '../../services/soundEffects';
import { Message, UserProfile, ReplyInfo } from '../../types';

interface ConversationViewProps {
  conversationId: string;
  otherUserId: string;
  onBack: () => void;
  onViewProfile: (userId: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '👏', '🙏', '💯', '✨', '🚀'];

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId,
  otherUserId,
  onBack,
  onViewProfile,
}) => {
  const { user, userProfile } = useAuth();
  const { startCall } = useCall();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Interaction states
  const [replyingTo, setReplyingTo] = useState<ReplyInfo | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [messageLimit, setMessageLimit] = useState(50);
  const [hasMore, setHasMore] = useState(false);

  // Moderation state
  const [isBlocked, setIsBlocked] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Other User profile & listen for presence
  useEffect(() => {
    if (!otherUserId) return;
    const userRef = doc(db, 'users', otherUserId);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setOtherUser(docSnap.data() as UserProfile);
      }
    });

    // Check if blocked
    if (user) {
      const blockedRef = doc(db, 'users', user.uid, 'blocked', otherUserId);
      getDoc(blockedRef).then((bSnap) => {
        setIsBlocked(bSnap.exists());
      });
    }

    return () => unsubscribe();
  }, [otherUserId, user]);

  // Listen to Conversation doc (for typing indicator & unread status)
  useEffect(() => {
    if (!conversationId || !user) return;
    const convRef = doc(db, 'conversations', conversationId);

    const unsubscribe = onSnapshot(convRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.typing) {
          setOtherIsTyping(!!data.typing[otherUserId]);
        }
        // Mark unread count as 0 for current user if > 0
        if (data.unreadCount && data.unreadCount[user.uid] > 0) {
          updateDoc(convRef, {
            [`unreadCount.${user.uid}`]: 0,
          }).catch(console.warn);
        }
      } else {
        // Initialize conversation container in Firestore
        try {
          await setDoc(convRef, {
            id: conversationId,
            participantIds: [user.uid, otherUserId],
            participants: {
              [user.uid]: {
                uid: user.uid,
                displayName: userProfile?.displayName || 'User',
                username: userProfile?.username || 'handle',
                photoURL: userProfile?.photoURL || '',
              },
              [otherUserId]: {
                uid: otherUserId,
                displayName: otherUser?.displayName || 'User',
                username: otherUser?.username || 'handle',
                photoURL: otherUser?.photoURL || '',
              },
            },
            unreadCount: {
              [user.uid]: 0,
              [otherUserId]: 0,
            },
            typing: {
              [user.uid]: false,
              [otherUserId]: false,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (e) {
          console.warn('Initial conversation shell creation:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [conversationId, user, otherUserId, userProfile, otherUser]);

  // Real-time messages listener
  useEffect(() => {
    if (!conversationId) return;

    const msgsRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(msgsRef, orderBy('createdAt', 'asc'), limit(messageLimit));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Message[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        setMessages(list);
        setHasMore(snapshot.docs.length >= messageLimit);
        setLoading(false);

        // Mark incoming unread messages as read
        if (user) {
          snapshot.docs.forEach((d) => {
            const m = d.data() as Message;
            if (m.senderId === otherUserId && m.status !== 'read') {
              updateDoc(doc(db, 'conversations', conversationId, 'messages', d.id), {
                status: 'read',
              }).catch(() => {});
            }
          });
        }
      },
      (err) => {
        console.error('[RM CHAT] Message fetch error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [conversationId, messageLimit, otherUserId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!isSearching) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isSearching]);

  // Typing debounce
  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!user || !conversationId) return;

    if (!isTyping) {
      setIsTyping(true);
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${user.uid}`]: true,
      }).catch(() => {});
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      updateDoc(doc(db, 'conversations', conversationId), {
        [`typing.${user.uid}`]: false,
      }).catch(() => {});
    }, 2000);
  };

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !userProfile || !conversationId) return;

    const textToSend = inputText.trim();
    setInputText('');
    soundManager.playMessagePop();

    // If Editing message
    if (editingMessage) {
      try {
        await updateDoc(
          doc(db, 'conversations', conversationId, 'messages', editingMessage.id),
          {
            text: textToSend,
            edited: true,
            updatedAt: new Date().toISOString(),
          }
        );
        setEditingMessage(null);
      } catch (err) {
        console.error('Failed to edit message:', err);
      }
      return;
    }

    try {
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);

      // Ensure conversation document exists first
      if (!convSnap.exists()) {
        await setDoc(convRef, {
          id: conversationId,
          participantIds: [user.uid, otherUserId],
          participants: {
            [user.uid]: {
              uid: user.uid,
              displayName: userProfile.displayName || 'User',
              username: userProfile.username || 'handle',
              photoURL: userProfile.photoURL || '',
            },
            [otherUserId]: {
              uid: otherUserId,
              displayName: otherUser?.displayName || 'User',
              username: otherUser?.username || 'handle',
              photoURL: otherUser?.photoURL || '',
            },
          },
          lastMessage: {
            text: textToSend,
            senderId: user.uid,
            timestamp: new Date().toISOString(),
            type: 'text',
            read: false,
          },
          unreadCount: {
            [user.uid]: 0,
            [otherUserId]: 1,
          },
          typing: {
            [user.uid]: false,
            [otherUserId]: false,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        const prevUnread = convSnap.data()?.unreadCount?.[otherUserId] || 0;
        await updateDoc(convRef, {
          lastMessage: {
            text: textToSend,
            senderId: user.uid,
            timestamp: new Date().toISOString(),
            type: 'text',
            read: false,
          },
          [`unreadCount.${otherUserId}`]: prevUnread + 1,
          updatedAt: new Date().toISOString(),
          [`typing.${user.uid}`]: false,
        });
      }

      // Add message to subcollection
      const msgsRef = collection(db, 'conversations', conversationId, 'messages');
      const newMsgData: Omit<Message, 'id'> = {
        conversationId,
        senderId: user.uid,
        text: textToSend,
        type: 'text',
        status: 'sent',
        createdAt: new Date().toISOString(),
        ...(replyingTo ? { replyTo: replyingTo } : {}),
      };

      await addDoc(msgsRef, newMsgData);
      setReplyingTo(null);
    } catch (err: any) {
      console.error('[RM CHAT] Send message error:', err);
    }
  };

  // Upload file or image
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !userProfile || !conversationId) return;

    // Check size limit (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      alert('File size exceeds the 25MB limit.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const isImg = file.type.startsWith('image/');
    const fileExt = file.name.split('.').pop() || 'dat';
    const storagePath = `conversations/${conversationId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const fileRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('[RM CHAT] File upload error:', error);
        alert('File upload failed: ' + error.message);
        setUploading(false);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const convRef = doc(db, 'conversations', conversationId);
          const convSnap = await getDoc(convRef);

          if (!convSnap.exists()) {
            await setDoc(convRef, {
              id: conversationId,
              participantIds: [user.uid, otherUserId],
              participants: {
                [user.uid]: {
                  uid: user.uid,
                  displayName: userProfile.displayName || 'User',
                  username: userProfile.username || 'handle',
                  photoURL: userProfile.photoURL || '',
                },
                [otherUserId]: {
                  uid: otherUserId,
                  displayName: otherUser?.displayName || 'User',
                  username: otherUser?.username || 'handle',
                  photoURL: otherUser?.photoURL || '',
                },
              },
              lastMessage: {
                text: isImg ? 'Photo' : file.name,
                senderId: user.uid,
                timestamp: new Date().toISOString(),
                type: isImg ? 'image' : 'file',
                read: false,
              },
              unreadCount: {
                [user.uid]: 0,
                [otherUserId]: 1,
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          } else {
            const prevUnread = convSnap.data()?.unreadCount?.[otherUserId] || 0;
            await updateDoc(convRef, {
              lastMessage: {
                text: isImg ? 'Photo' : file.name,
                senderId: user.uid,
                timestamp: new Date().toISOString(),
                type: isImg ? 'image' : 'file',
                read: false,
              },
              [`unreadCount.${otherUserId}`]: prevUnread + 1,
              updatedAt: new Date().toISOString(),
            });
          }

          const msgsRef = collection(db, 'conversations', conversationId, 'messages');
          const messageData: Omit<Message, 'id'> = {
            conversationId,
            senderId: user.uid,
            text: isImg ? 'Shared an image' : file.name,
            type: isImg ? 'image' : 'file',
            fileUrl: downloadUrl,
            fileName: file.name,
            fileSize: file.size,
            status: 'sent',
            createdAt: new Date().toISOString(),
          };

          await addDoc(msgsRef, messageData);
          soundManager.playMessagePop();
        } catch (uploadErr) {
          console.error('Failed to complete upload message:', uploadErr);
        } finally {
          setUploading(false);
        }
      }
    );
  };

  // Delete Own Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await updateDoc(doc(db, 'conversations', conversationId, 'messages', msgId), {
        text: 'This message was deleted',
        deleted: true,
        fileUrl: '',
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Block/Unblock User
  const toggleBlockUser = async () => {
    if (!user || !otherUser) return;
    const blockRef = doc(db, 'users', user.uid, 'blocked', otherUserId);
    try {
      if (isBlocked) {
        await deleteDoc(blockRef);
        setIsBlocked(false);
      } else {
        await setDoc(blockRef, {
          ownerId: user.uid,
          blockedUserId: otherUserId,
          displayName: otherUser.displayName,
          username: otherUser.username,
          createdAt: new Date().toISOString(),
        });
        setIsBlocked(true);
      }
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Report User
  const handleSubmitReport = async () => {
    if (!user || !reportReason.trim()) return;
    try {
      const reportsRef = collection(db, 'reports');
      await addDoc(reportsRef, {
        reporterId: user.uid,
        reportedUserId: otherUserId,
        reason: reportReason.trim(),
        createdAt: new Date().toISOString(),
      });
      alert('Thank you. User report submitted for review.');
      setReportModalOpen(false);
      setReportReason('');
      setShowMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Filter messages if search is active
  const displayedMessages = searchQuery.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden">
      {/* Conversation Top Header */}
      <header className="h-16 px-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* User info clickable to open profile */}
          <div
            onClick={() => onViewProfile(otherUserId)}
            className="flex items-center gap-3 cursor-pointer group min-w-0"
          >
            <div className="relative shrink-0">
              {otherUser?.photoURL ? (
                <img
                  src={otherUser.photoURL}
                  alt={otherUser.displayName}
                  className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {otherUser?.displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              {otherUser?.isOnline && (
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              )}
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {otherUser?.displayName || 'Loading...'}
              </h2>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                {otherIsTyping ? (
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                    typing...
                  </span>
                ) : otherUser?.isOnline ? (
                  <span className="text-emerald-500 font-medium">Online</span>
                ) : (
                  <span>@{otherUser?.username || 'user'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Voice Call */}
          <button
            onClick={() =>
              startCall(
                otherUserId,
                otherUser?.displayName || 'User',
                otherUser?.photoURL,
                'voice'
              )
            }
            title="Start Voice Call"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Video Call */}
          <button
            onClick={() =>
              startCall(
                otherUserId,
                otherUser?.displayName || 'User',
                otherUser?.photoURL,
                'video'
              )
            }
            title="Start Video Call"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Video className="w-5 h-5" />
          </button>

          {/* Search in Conversation */}
          <button
            onClick={() => setIsSearching(!isSearching)}
            title="Search inside conversation"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isSearching
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Options Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-30">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onViewProfile(otherUserId);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-indigo-500" />
                  <span>View Full Profile</span>
                </button>

                <button
                  onClick={toggleBlockUser}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <UserX className="w-4 h-4 text-amber-500" />
                  <span>{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>

                <button
                  onClick={() => {
                    setReportModalOpen(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Report User</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* In-Chat Search Bar */}
      {isSearching && (
        <div className="px-4 py-2 bg-indigo-50/70 dark:bg-slate-900 border-b border-indigo-100 dark:border-slate-800 flex items-center gap-2 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-indigo-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords in this chat..."
            className="flex-1 bg-transparent border-none text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
            }}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasMore && (
          <div className="text-center py-2">
            <button
              onClick={() => setMessageLimit((prev) => prev + 50)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-300 cursor-pointer"
            >
              Load Older Messages
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mb-2" />
            <span className="text-xs">Decrypting messages...</span>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 flex items-center justify-center mb-2">
              <Smile className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery ? 'No messages matching search' : 'Say hello to ' + (otherUser?.displayName || 'User')}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Messages are real-time, encrypted, and private.
            </p>
          </div>
        ) : (
          displayedMessages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
              >
                {/* Replying quote badge if available */}
                {msg.replyTo && (
                  <div
                    className={`max-w-xs sm:max-w-md px-3 py-1 rounded-t-xl text-[11px] bg-slate-200/80 dark:bg-slate-800/80 border-b border-white/10 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 mb-0.5 ${
                      isMe ? 'rounded-tl-2xl' : 'rounded-tr-2xl'
                    }`}
                  >
                    <CornerUpLeft className="w-3 h-3 text-indigo-500" />
                    <span className="font-semibold">{msg.replyTo.senderName}:</span>
                    <span className="truncate">{msg.replyTo.text}</span>
                  </div>
                )}

                {/* Main bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-md px-4 py-2.5 rounded-3xl shadow-xs transition-all relative ${
                    isMe
                      ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 rounded-bl-xs'
                  }`}
                >
                  {/* Image attachment */}
                  {msg.type === 'image' && msg.fileUrl && (
                    <div className="mb-2 rounded-2xl overflow-hidden max-w-sm">
                      <img
                        src={msg.fileUrl}
                        alt="Shared media"
                        className="w-full h-auto max-h-72 object-cover rounded-2xl hover:opacity-95 transition-opacity"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* File attachment */}
                  {msg.type === 'file' && msg.fileUrl && (
                    <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-black/10 dark:bg-white/10 mb-2">
                      <FileText className="w-8 h-8 shrink-0 text-indigo-300" />
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold truncate">{msg.fileName || 'Attachment'}</p>
                        <p className="text-[10px] opacity-75">
                          {msg.fileSize ? Math.round(msg.fileSize / 1024) + ' KB' : 'File'}
                        </p>
                      </div>
                      <a
                        href={msg.fileUrl}
                        download={msg.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  )}

                  {/* Text content */}
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.deleted ? 'italic opacity-60' : ''}`}>
                    {msg.text}
                  </p>

                  {/* Metadata (time, edited status, ticks) */}
                  <div
                    className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${
                      isMe ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.edited && <span className="italic">edited</span>}
                    <span>
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isMe && (
                      <span className="ml-0.5">
                        {msg.status === 'read' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-cyan-200 inline" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 inline" />
                        ) : (
                          <Check className="w-3.5 h-3.5 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Inline Message Action Toolbar (hover/tap) */}
                <div
                  className={`flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ${
                    isMe ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <button
                    onClick={() =>
                      setReplyingTo({
                        id: msg.id,
                        text: msg.text,
                        senderId: msg.senderId,
                        senderName: isMe ? 'You' : otherUser?.displayName || 'User',
                      })
                    }
                    title="Reply"
                    className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>

                  {isMe && !msg.deleted && (
                    <>
                      <button
                        onClick={() => {
                          setEditingMessage(msg);
                          setInputText(msg.text);
                        }}
                        title="Edit"
                        className="p-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete"
                        className="p-1 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Uploading progress banner */}
      {uploading && (
        <div className="px-4 py-2 bg-indigo-600 text-white text-xs flex items-center justify-between">
          <span>Uploading media attachment... {uploadProgress}%</span>
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs truncate">
            <CornerUpLeft className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Replying to {replyingTo.senderName}:
            </span>
            <span className="text-slate-500 truncate">{replyingTo.text}</span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing banner */}
      {editingMessage && (
        <div className="px-4 py-2 bg-amber-500/10 border-t border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-between text-xs font-medium">
          <span>Editing your message</span>
          <button
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            className="p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick emoji drawer */}
      {showEmojiPicker && (
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setInputText((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              className="text-xl p-1.5 hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Bottom Input Area */}
      <footer className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shrink-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* File input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or file"
            className="p-2.5 rounded-2xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
            className="p-2.5 rounded-2xl text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={isBlocked ? 'You have blocked this user' : 'Type a message...'}
            disabled={isBlocked}
            className="flex-1 py-2.5 px-4 bg-slate-100 dark:bg-slate-800/80 border border-transparent focus:border-indigo-500 rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden transition-all disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isBlocked}
            className="p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all shadow-md shadow-indigo-600/25 disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>

      {/* Report User Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Report User
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Please describe why you are reporting this account (e.g. spam, harassment, inappropriate content).
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Reason for report..."
              rows={3}
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={!reportReason.trim()}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 cursor-pointer"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
