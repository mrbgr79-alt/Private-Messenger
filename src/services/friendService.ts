import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { FriendRequest, UserProfile } from '../types';

/**
 * Deterministic ID for a pair of users to prevent duplicate requests
 */
export const getFriendRequestId = (uidA: string, uidB: string) => {
  return [uidA, uidB].sort().join('_');
};

/**
 * Send a friend request to targetUser
 */
export const sendFriendRequest = async (
  currentUser: { uid: string; displayName?: string | null; photoURL?: string | null },
  currentProfile: UserProfile | null,
  targetUser: UserProfile
) => {
  if (!currentUser || currentUser.uid === targetUser.uid) {
    throw new Error('Cannot send friend request to yourself.');
  }

  const requestId = getFriendRequestId(currentUser.uid, targetUser.uid);
  const reqRef = doc(db, 'friendRequests', requestId);

  // Check existing request
  const existingSnap = await getDoc(reqRef);
  if (existingSnap.exists()) {
    const data = existingSnap.data() as FriendRequest;
    if (data.status === 'accepted') {
      throw new Error('You are already friends with this user.');
    }
    if (data.status === 'pending') {
      if (data.senderId === currentUser.uid) {
        throw new Error('Friend request already sent.');
      } else {
        // The other user had already sent a request, auto-accept it!
        return acceptFriendRequest(requestId, currentUser, currentProfile, targetUser);
      }
    }
  }

  const newRequest: FriendRequest = {
    id: requestId,
    senderId: currentUser.uid,
    senderName: currentProfile?.displayName || currentUser.displayName || 'RM User',
    senderUsername: currentProfile?.username || 'user',
    senderPhoto: currentProfile?.photoURL || currentUser.photoURL || undefined,
    receiverId: targetUser.uid,
    receiverName: targetUser.displayName,
    receiverUsername: targetUser.username,
    receiverPhoto: targetUser.photoURL,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(reqRef, newRequest, { merge: true });

  // Optional: create notification for receiver
  try {
    const notifRef = doc(collection(db, 'users', targetUser.uid, 'notifications'));
    await setDoc(notifRef, {
      userId: targetUser.uid,
      title: 'New Friend Request 🤝',
      body: `${newRequest.senderName} (@${newRequest.senderUsername}) sent you a friend request.`,
      type: 'contact',
      link: '/contacts',
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Friend request notification error:', err);
  }

  return { success: true };
};

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (
  requestId: string,
  currentUser: { uid: string; displayName?: string | null; photoURL?: string | null },
  currentProfile: UserProfile | null,
  otherUser?: UserProfile
) => {
  const reqRef = doc(db, 'friendRequests', requestId);
  const reqSnap = await getDoc(reqRef);

  let senderId = '';
  let receiverId = '';

  if (reqSnap.exists()) {
    const data = reqSnap.data() as FriendRequest;
    senderId = data.senderId;
    receiverId = data.receiverId;
  } else if (otherUser) {
    senderId = otherUser.uid;
    receiverId = currentUser.uid;
  }

  const otherUid = senderId === currentUser.uid ? receiverId : senderId;

  // 1. Mark request as accepted
  await setDoc(
    reqRef,
    {
      status: 'accepted',
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // 2. Add each other to contacts as friends
  const now = new Date().toISOString();
  await setDoc(
    doc(db, 'users', currentUser.uid, 'contacts', otherUid),
    {
      ownerId: currentUser.uid,
      contactUserId: otherUid,
      isFavorite: false,
      isFriend: true,
      createdAt: now,
    },
    { merge: true }
  );

  await setDoc(
    doc(db, 'users', otherUid, 'contacts', currentUser.uid),
    {
      ownerId: otherUid,
      contactUserId: currentUser.uid,
      isFavorite: false,
      isFriend: true,
      createdAt: now,
    },
    { merge: true }
  );

  // 3. Notify the original sender
  try {
    const notifRef = doc(collection(db, 'users', otherUid, 'notifications'));
    const myName = currentProfile?.displayName || currentUser.displayName || 'Your friend';
    await setDoc(notifRef, {
      userId: otherUid,
      title: 'Friend Request Accepted! 🎉',
      body: `${myName} accepted your friend request. You can now chat anytime!`,
      type: 'contact',
      link: '/contacts',
      read: false,
      createdAt: now,
    });
  } catch (err) {
    console.warn('Accept friend request notification error:', err);
  }

  return { success: true };
};

/**
 * Reject a friend request
 */
export const rejectFriendRequest = async (requestId: string) => {
  const reqRef = doc(db, 'friendRequests', requestId);
  await deleteDoc(reqRef);
  return { success: true };
};

/**
 * Cancel a pending friend request sent by user
 */
export const cancelFriendRequest = async (requestId: string) => {
  const reqRef = doc(db, 'friendRequests', requestId);
  await deleteDoc(reqRef);
  return { success: true };
};

/**
 * Unfriend a user
 */
export const unfriendUser = async (currentUid: string, targetUid: string) => {
  const requestId = getFriendRequestId(currentUid, targetUid);
  await deleteDoc(doc(db, 'friendRequests', requestId)).catch(() => {});
  await deleteDoc(doc(db, 'users', currentUid, 'contacts', targetUid)).catch(() => {});
  await deleteDoc(doc(db, 'users', targetUid, 'contacts', currentUid)).catch(() => {});
  return { success: true };
};
