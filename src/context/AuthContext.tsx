import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  deleteUser,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserProfile, UserSettings } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsUsername: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, displayName: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  claimUsername: (username: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultSettings: UserSettings = {
  showOnlineStatus: true,
  showLastSeen: true,
  readReceipts: true,
  theme: 'dark',
  enableSound: true,
};

export const getEmailKey = (email?: string | null): string => {
  if (!email) return '';
  return email.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitor Auth State
  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (currentUser) {
        const emailKey = getEmailKey(currentUser.email);
        const userDocRef = doc(db, 'users', currentUser.uid);

        unsubscribeProfile = onSnapshot(
          userDocRef,
          async (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data() as UserProfile;

              // If username is already set on user document
              if (data.username && data.username.length >= 3) {
                localStorage.setItem(`rmchat_username_${currentUser.uid}`, data.username);
                if (emailKey) {
                  localStorage.setItem(`rmchat_email_${emailKey}`, data.username);
                  // Ensure emails index has the exact mapping
                  setDoc(
                    doc(db, 'emails', emailKey),
                    {
                      uid: currentUser.uid,
                      email: currentUser.email,
                      username: data.username,
                      usernameLower: data.usernameLower || data.username.toLowerCase(),
                      displayName: data.displayName,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  ).catch(console.warn);
                }
              } else {
                // Look up whether this Gmail was previously used to claim a username
                let savedUsername = '';
                let savedDisplayName = data.displayName || currentUser.displayName || '';

                if (emailKey) {
                  const cached = localStorage.getItem(`rmchat_email_${emailKey}`);
                  if (cached && cached.length >= 3) {
                    savedUsername = cached;
                  } else {
                    try {
                      const emailDoc = await getDoc(doc(db, 'emails', emailKey));
                      if (emailDoc.exists() && emailDoc.data()?.username) {
                        savedUsername = emailDoc.data()?.username;
                        if (emailDoc.data()?.displayName) {
                          savedDisplayName = emailDoc.data()?.displayName;
                        }
                      }
                    } catch (e) {
                      console.warn('[RM CHAT] Email index lookup:', e);
                    }
                  }
                }

                if (!savedUsername) {
                  const cachedUid = localStorage.getItem(`rmchat_username_${currentUser.uid}`);
                  if (cachedUid && cachedUid.length >= 3) {
                    savedUsername = cachedUid;
                  }
                }

                // If still no username, derive cleanly from Gmail prefix
                if (!savedUsername && currentUser.email) {
                  const prefix = currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                  if (prefix.length >= 3) {
                    savedUsername = prefix.slice(0, 25);
                  }
                }

                if (!savedUsername || savedUsername.length < 3) {
                  savedUsername = `user_${currentUser.uid.slice(0, 6).toLowerCase()}`;
                }

                const lower = savedUsername.toLowerCase();

                // Persist username to reservations
                try {
                  await setDoc(
                    doc(db, 'usernames', lower),
                    {
                      uid: currentUser.uid,
                      createdAt: new Date().toISOString(),
                    },
                    { merge: true }
                  );
                } catch (e) {
                  console.warn('[RM CHAT] Username reservation sync:', e);
                }

                // Update user profile document
                try {
                  await setDoc(
                    userDocRef,
                    {
                      username: savedUsername,
                      usernameLower: lower,
                      displayName: savedDisplayName,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  );
                } catch (e) {
                  console.warn('[RM CHAT] User profile username sync:', e);
                }

                // Update emails mapping
                if (emailKey) {
                  try {
                    await setDoc(
                      doc(db, 'emails', emailKey),
                      {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        username: savedUsername,
                        usernameLower: lower,
                        displayName: savedDisplayName,
                        updatedAt: new Date().toISOString(),
                      },
                      { merge: true }
                    );
                    localStorage.setItem(`rmchat_email_${emailKey}`, savedUsername);
                  } catch (e) {
                    console.warn('[RM CHAT] Email mapping sync:', e);
                  }
                }

                localStorage.setItem(`rmchat_username_${currentUser.uid}`, savedUsername);
                data.username = savedUsername;
                data.usernameLower = lower;
                data.displayName = savedDisplayName;
              }

              setUserProfile(data);
            } else {
              // Brand new user profile: first check if this Gmail already has an existing profile/username
              let initialUsername = '';
              let initialDisplayName = currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'RM User');

              if (emailKey) {
                const cachedEmailUsername = localStorage.getItem(`rmchat_email_${emailKey}`);
                if (cachedEmailUsername && cachedEmailUsername.length >= 3) {
                  initialUsername = cachedEmailUsername;
                } else {
                  try {
                    const emailDoc = await getDoc(doc(db, 'emails', emailKey));
                    if (emailDoc.exists() && emailDoc.data()?.username) {
                      initialUsername = emailDoc.data()?.username;
                      if (emailDoc.data()?.displayName) {
                        initialDisplayName = emailDoc.data()?.displayName;
                      }
                    }
                  } catch (e) {
                    console.warn('[RM CHAT] New user email lookup:', e);
                  }
                }
              }

              if (!initialUsername) {
                const cachedUid = localStorage.getItem(`rmchat_username_${currentUser.uid}`);
                if (cachedUid && cachedUid.length >= 3) {
                  initialUsername = cachedUid;
                }
              }

              if (!initialUsername && currentUser.email) {
                const prefix = currentUser.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                if (prefix.length >= 3) {
                  initialUsername = prefix.slice(0, 25);
                }
              }

              if (!initialUsername || initialUsername.length < 3) {
                initialUsername = `user_${currentUser.uid.slice(0, 6).toLowerCase()}`;
              }

              const initialLower = initialUsername.toLowerCase();

              // Reserve unique handle in /usernames/
              try {
                const uRef = doc(db, 'usernames', initialLower);
                await setDoc(
                  uRef,
                  {
                    uid: currentUser.uid,
                    createdAt: new Date().toISOString(),
                  },
                  { merge: true }
                );
              } catch (e) {
                console.warn('[RM CHAT] Auto username reservation:', e);
              }

              const initialProfile: UserProfile = {
                uid: currentUser.uid,
                displayName: initialDisplayName,
                username: initialUsername,
                usernameLower: initialLower,
                bio: 'Hey there! I am using RM CHAT.',
                isOnline: true,
                lastSeen: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                settings: defaultSettings,
                ...(currentUser.email ? { email: currentUser.email } : {}),
                ...(currentUser.photoURL ? { photoURL: currentUser.photoURL } : {}),
              };

              try {
                await setDoc(userDocRef, initialProfile, { merge: true });
                setUserProfile(initialProfile);
                localStorage.setItem(`rmchat_username_${currentUser.uid}`, initialUsername);
              } catch (err) {
                console.error('[RM CHAT] Failed to create initial user profile', err);
              }

              if (emailKey) {
                try {
                  await setDoc(
                    doc(db, 'emails', emailKey),
                    {
                      uid: currentUser.uid,
                      email: currentUser.email,
                      username: initialUsername,
                      usernameLower: initialLower,
                      displayName: initialDisplayName,
                      updatedAt: new Date().toISOString(),
                    },
                    { merge: true }
                  );
                  localStorage.setItem(`rmchat_email_${emailKey}`, initialUsername);
                } catch (e) {
                  console.warn('[RM CHAT] Initial email mapping write:', e);
                }
              }
            }
            setLoading(false);
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
            setLoading(false);
          }
        );

        // Update online status
        try {
          await updateDoc(userDocRef, {
            isOnline: true,
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // Document may not exist yet on initial sign up
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  // Presence Heartbeat & Window Unload
  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);

    const setOffline = () => {
      try {
        updateDoc(userDocRef, {
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      } catch {
        // Ignored on window exit
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setOffline();
      } else {
        updateDoc(userDocRef, {
          isOnline: true,
          updatedAt: new Date().toISOString(),
        }).catch(console.warn);
      }
    };

    window.addEventListener('beforeunload', setOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', setOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Google Sign In
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
  };

  // Email Sign In
  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password provider is not enabled in Firebase Authentication yet. Please use "Continue with Google" for instant sign-in, or enable Email/Password in Firebase Console > Authentication > Sign-in method.');
      }
      throw err;
    }
  };

  // Email Sign Up
  const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      if (cred.user) {
        await updateProfile(cred.user, { displayName });
        try {
          await sendEmailVerification(cred.user);
        } catch (e) {
          console.warn('Verification email send issue:', e);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password provider is not enabled in Firebase Authentication yet. Please use "Continue with Google" for instant sign-in, or enable Email/Password in Firebase Console > Authentication > Sign-in method.');
      }
      throw err;
    }
  };

  // Password Reset
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Resend Email Verification
  const resendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  // Sign Out
  const signOut = async () => {
    if (user) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: new Date().toISOString(),
        });
      } catch {
        // Continue logout
      }
    }
    await firebaseSignOut(auth);
    setUser(null);
    setUserProfile(null);
  };

  // Claim Unique Username
  const claimUsername = async (username: string, displayName?: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    const cleanUsername = username.trim();
    const cleanLower = cleanUsername.toLowerCase();

    // Validate format: 3-30 chars, alphanumeric or underscore
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      return {
        success: false,
        error: 'Username must be 3-30 characters with letters, numbers, or underscores only.',
      };
    }

    try {
      const usernameDocRef = doc(db, 'usernames', cleanLower);
      const userDocRef = doc(db, 'users', user.uid);
      const emailKey = getEmailKey(user.email);

      // Check if username is already taken by someone else
      const usernameSnapshot = await getDoc(usernameDocRef);
      if (usernameSnapshot.exists()) {
        const currentOwner = usernameSnapshot.data()?.uid;
        if (currentOwner && currentOwner !== user.uid) {
          return { success: false, error: 'That username is already taken. Try another!' };
        }
      }

      // Release old username reservation if changing handle
      if (userProfile?.usernameLower && userProfile.usernameLower !== cleanLower) {
        try {
          const oldRef = doc(db, 'usernames', userProfile.usernameLower);
          await deleteDoc(oldRef);
        } catch {
          // Ignored
        }
      }

      // Reserve new username
      await setDoc(
        usernameDocRef,
        {
          uid: user.uid,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update user profile with merge to avoid doc existence errors
      await setDoc(
        userDocRef,
        {
          uid: user.uid,
          username: cleanUsername,
          usernameLower: cleanLower,
          ...(displayName ? { displayName: displayName.trim() } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Permanently bind username to this Gmail address
      if (emailKey) {
        try {
          await setDoc(
            doc(db, 'emails', emailKey),
            {
              uid: user.uid,
              email: user.email,
              username: cleanUsername,
              usernameLower: cleanLower,
              displayName: (displayName || userProfile?.displayName || user.displayName || 'RM User').trim(),
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
          localStorage.setItem(`rmchat_email_${emailKey}`, cleanUsername);
        } catch (e) {
          console.warn('[RM CHAT] Email index update on claim:', e);
        }
      }

      // Permanently save to localStorage for instant recognition across sessions
      localStorage.setItem(`rmchat_username_${user.uid}`, cleanUsername);

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              username: cleanUsername,
              usernameLower: cleanLower,
              ...(displayName ? { displayName: displayName.trim() } : {}),
            }
          : ({
              uid: user.uid,
              username: cleanUsername,
              usernameLower: cleanLower,
              displayName: (displayName || user.displayName || 'RM User').trim(),
              bio: 'Hey there! I am using RM CHAT.',
              isOnline: true,
              lastSeen: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              settings: defaultSettings,
            } as UserProfile)
      );

      return { success: true };
    } catch (err: any) {
      if (err.code === 'permission-denied' || err.message === 'USERNAME_TAKEN') {
        return { success: false, error: 'That username is already taken. Try another!' };
      }
      return { success: false, error: err.message || 'Failed to reserve username.' };
    }
  };

  // Update User Profile
  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const emailKey = getEmailKey(user.email);
    try {
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString(),
      });
      if (data.username) {
        localStorage.setItem(`rmchat_username_${user.uid}`, data.username);
        if (emailKey) {
          localStorage.setItem(`rmchat_email_${emailKey}`, data.username);
        }
      }
      if (emailKey && (data.username || data.displayName)) {
        setDoc(
          doc(db, 'emails', emailKey),
          {
            uid: user.uid,
            ...(data.username ? { username: data.username, usernameLower: data.username.toLowerCase() } : {}),
            ...(data.displayName ? { displayName: data.displayName } : {}),
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(console.warn);
      }
      if (data.displayName && auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: data.displayName });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Update Settings
  const updateSettings = async (settings: Partial<UserSettings>) => {
    if (!user || !userProfile) return;
    const userDocRef = doc(db, 'users', user.uid);
    const updated = {
      ...defaultSettings,
      ...(userProfile.settings || {}),
      ...settings,
    };
    try {
      await updateDoc(userDocRef, {
        settings: updated,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  // Delete Account
  const deleteAccount = async () => {
    if (!user) return;
    const uid = user.uid;
    const emailKey = getEmailKey(user.email);

    try {
      localStorage.removeItem(`rmchat_username_${uid}`);
      if (emailKey) localStorage.removeItem(`rmchat_email_${emailKey}`);
      // Release username reservation
      if (userProfile?.usernameLower) {
        await deleteDoc(doc(db, 'usernames', userProfile.usernameLower));
      }
      if (emailKey) {
        await deleteDoc(doc(db, 'emails', emailKey)).catch(console.warn);
      }
      // Delete user profile
      await deleteDoc(doc(db, 'users', uid));
      // Delete Firebase Auth user
      await deleteUser(user);
      setUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('[RM CHAT] Error deleting account:', error);
      throw error;
    }
  };

  const emailKey = getEmailKey(user?.email);
  const cachedUsername =
    (user && localStorage.getItem(`rmchat_username_${user.uid}`)) ||
    (emailKey ? localStorage.getItem(`rmchat_email_${emailKey}`) : null);

  const needsUsername =
    !loading &&
    !!user &&
    (!userProfile?.username || userProfile.username.length < 3) &&
    !cachedUsername;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        needsUsername,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        resetPassword,
        resendVerificationEmail,
        signOut,
        deleteAccount,
        claimUsername,
        updateUserProfile,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
