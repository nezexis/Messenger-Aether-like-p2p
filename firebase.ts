import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Chat, Message } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
});

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Returns current authenticated user or null for guest mode (rules allow guest read/write for cloudMessages).
 */
export const ensureAuth = async (): Promise<FirebaseUser | null> => {
  return auth.currentUser;
};

export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          displayName: user.displayName || 'Пользователь',
          email: user.email || '',
          photoURL: user.photoURL || '',
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }
    return user;
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      return null;
    }
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('Всплывающее окно авторизации заблокировано браузером. Разрешите всплывающие окна в настройках браузера.');
    }
    throw error;
  }
};

export const logout = async () => {
  await signOut(auth);
};

/**
 * Publish message to Firestore for guaranteed cross-network / 1000km delivery.
 */
export const publishCloudMessage = async (chatId: string, msg: Message): Promise<void> => {
  try {
    await ensureAuth();
    await setDoc(doc(db, 'cloudMessages', msg.id), {
      id: msg.id,
      chatId,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderAvatarColor: msg.senderAvatarColor || '#0ea5e9',
      text: msg.text,
      type: msg.type || 'text',
      attachments: msg.attachments || [],
      timestamp: msg.timestamp || Date.now(),
      status: 'delivered',
      isAI: Boolean(msg.isAI),
      replyTo: msg.replyTo || null,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn('Failed to publish cloud message relay:', err);
  }
};

/**
 * Subscribe in real-time to cloud messages for a shared chat / direct rendezvous.
 */
export const subscribeToCloudMessages = (
  chatId: string,
  onMessage: (msg: Message) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'cloudMessages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc'),
      limit(100)
    );

    return onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const data = change.doc.data() as Message;
            onMessage(data);
          }
        });
      },
      (error) => {
        console.warn(`Cloud messages subscription warning [${chatId}]:`, error.message);
      }
    );
  } catch (err) {
    console.warn('subscribeToCloudMessages error:', err);
    return () => {};
  }
};

/**
 * Save or update cloud chat metadata for room / contact discovery.
 */
export const publishCloudChat = async (chat: Chat, members: string[]): Promise<void> => {
  try {
    await ensureAuth();
    await setDoc(
      doc(db, 'cloudChats', chat.id),
      {
        id: chat.id,
        name: chat.name,
        ownerId: auth.currentUser?.uid || 'guest',
        lastMessage: chat.lastMessage || '',
        lastMessageTime: chat.lastMessageTime || Date.now(),
        members,
        createdAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Failed to publish cloud chat:', err);
  }
};

export type { FirebaseUser };
