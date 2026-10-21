export interface UserSettings {
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  theme: 'light' | 'dark' | 'system';
  enableSound: boolean;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  usernameLower: string;
  email?: string;
  photoURL?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
  settings?: UserSettings;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  username: string;
  photoURL?: string;
}

export interface LastMessageInfo {
  text: string;
  senderId: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  read?: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participants: Record<string, ConversationParticipant>;
  lastMessage?: LastMessageInfo;
  unreadCount?: Record<string, number>;
  typing?: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface ReplyInfo {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: 'text' | 'image' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyTo?: ReplyInfo;
  status: 'sent' | 'delivered' | 'read';
  edited?: boolean;
  deleted?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Contact {
  id: string;
  ownerId: string;
  contactUserId: string;
  isFavorite: boolean;
  isFriend?: boolean;
  createdAt: string;
  userProfile?: UserProfile;
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected' | 'canceled';

export interface FriendRequest {
  id: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverUsername: string;
  receiverPhoto?: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad';

export interface StatusComment {
  id: string;
  statusId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto?: string;
  text: string;
  createdAt: string;
}

export interface StatusPost {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto?: string;
  content: string;
  imageUrl?: string;
  bgGradient?: string;
  mood?: string;
  reactions?: Record<string, ReactionType>;
  reactionCounts?: {
    like?: number;
    love?: number;
    laugh?: number;
    wow?: number;
    sad?: number;
    total?: number;
  };
  commentsCount?: number;
  sharesCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto?: string;
  type: 'voice' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  duration?: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  senderId: string;
  createdAt: string;
}

export interface BlockedUser {
  id: string;
  ownerId: string;
  blockedUserId: string;
  displayName: string;
  username: string;
  createdAt: string;
}

export interface UserReport {
  id?: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: 'message' | 'call' | 'contact' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}
