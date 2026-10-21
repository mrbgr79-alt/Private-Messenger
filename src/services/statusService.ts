import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { StatusPost, StatusComment, ReactionType, UserProfile } from '../types';

/**
 * Create a new status post in For You feed
 */
export const createStatusPost = async (
  currentUser: { uid: string; displayName?: string | null; photoURL?: string | null },
  currentProfile: UserProfile | null,
  content: string,
  options?: {
    imageUrl?: string;
    bgGradient?: string;
    mood?: string;
  }
) => {
  if (!content.trim() && !options?.imageUrl) {
    throw new Error('Status content cannot be empty.');
  }

  const postsRef = collection(db, 'statusPosts');
  const now = new Date().toISOString();

  const newPostData: Omit<StatusPost, 'id'> = {
    authorId: currentUser.uid,
    authorName: currentProfile?.displayName || currentUser.displayName || 'RM User',
    authorUsername: currentProfile?.username || 'user',
    authorPhoto: currentProfile?.photoURL || currentUser.photoURL || undefined,
    content: content.trim(),
    imageUrl: options?.imageUrl || undefined,
    bgGradient: options?.bgGradient || undefined,
    mood: options?.mood || undefined,
    reactions: {},
    reactionCounts: {
      like: 0,
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      total: 0,
    },
    commentsCount: 0,
    sharesCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await addDoc(postsRef, newPostData);
  return { id: docRef.id, ...newPostData };
};

/**
 * Toggle or set interactive reaction (like, love, laugh, wow, sad) on a status post
 */
export const toggleReaction = async (
  postId: string,
  userId: string,
  reactionType: ReactionType
) => {
  const postRef = doc(db, 'statusPosts', postId);
  const snap = await getDoc(postRef);

  if (!snap.exists()) {
    throw new Error('Post does not exist.');
  }

  const data = snap.data() as StatusPost;
  const currentReactions: Record<string, ReactionType> = { ...(data.reactions || {}) };
  const existingReaction = currentReactions[userId];

  const counts = {
    like: data.reactionCounts?.like || 0,
    love: data.reactionCounts?.love || 0,
    laugh: data.reactionCounts?.laugh || 0,
    wow: data.reactionCounts?.wow || 0,
    sad: data.reactionCounts?.sad || 0,
    total: data.reactionCounts?.total || 0,
  };

  if (existingReaction === reactionType) {
    // User tapped the exact same reaction -> Remove it (unlike)
    delete currentReactions[userId];
    if (counts[reactionType] > 0) counts[reactionType]--;
    if (counts.total > 0) counts.total--;
  } else {
    // If they had an existing reaction, decrement old one
    if (existingReaction && counts[existingReaction] > 0) {
      counts[existingReaction]--;
    } else {
      counts.total++;
    }
    // Set new reaction
    currentReactions[userId] = reactionType;
    counts[reactionType] = (counts[reactionType] || 0) + 1;
  }

  await updateDoc(postRef, {
    reactions: currentReactions,
    reactionCounts: counts,
    updatedAt: new Date().toISOString(),
  });

  return { reactions: currentReactions, reactionCounts: counts };
};

/**
 * Add a comment to a status post
 */
export const addComment = async (
  postId: string,
  currentUser: { uid: string; displayName?: string | null; photoURL?: string | null },
  currentProfile: UserProfile | null,
  text: string
) => {
  if (!text.trim()) {
    throw new Error('Comment cannot be empty.');
  }

  const commentsRef = collection(db, 'statusPosts', postId, 'comments');
  const now = new Date().toISOString();

  const commentData: Omit<StatusComment, 'id'> = {
    statusId: postId,
    authorId: currentUser.uid,
    authorName: currentProfile?.displayName || currentUser.displayName || 'RM User',
    authorUsername: currentProfile?.username || 'user',
    authorPhoto: currentProfile?.photoURL || currentUser.photoURL || undefined,
    text: text.trim(),
    createdAt: now,
  };

  const docRef = await addDoc(commentsRef, commentData);

  // Increment comments count on post
  await updateDoc(doc(db, 'statusPosts', postId), {
    commentsCount: increment(1),
    updatedAt: now,
  }).catch(() => {});

  return { id: docRef.id, ...commentData };
};

/**
 * Delete a comment from a status post
 */
export const deleteComment = async (postId: string, commentId: string) => {
  await deleteDoc(doc(db, 'statusPosts', postId, 'comments', commentId));
  await updateDoc(doc(db, 'statusPosts', postId), {
    commentsCount: increment(-1),
  }).catch(() => {});
};

/**
 * Delete own status post
 */
export const deleteStatusPost = async (postId: string) => {
  await deleteDoc(doc(db, 'statusPosts', postId));
};

/**
 * Record a share on a post
 */
export const recordShare = async (postId: string) => {
  await updateDoc(doc(db, 'statusPosts', postId), {
    sharesCount: increment(1),
  }).catch(() => {});
};
