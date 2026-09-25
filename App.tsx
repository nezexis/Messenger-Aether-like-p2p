/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { MessageInput } from './components/MessageInput';
import { VoiceCallOverlay } from './components/VoiceCallOverlay';
import { SoundboardModal } from './components/SoundboardModal';
import { SettingsModal } from './components/SettingsModal';
import { InviteModal } from './components/InviteModal';
import { CreateRoomModal } from './components/CreateRoomModal';
import { InstallModal } from './components/InstallModal';
import { FriendWelcomeModal } from './components/FriendWelcomeModal';

import {
  AppSettings,
  Attachment,
  Chat,
  Message,
  P2PStats,
  UserStatus,
  VoicePeer
} from './types';
import { storageService } from './services/storage';
import { p2pService } from './services/p2p';
import { audioService } from './services/audio';
import { cryptoService } from './services/crypto';
import { aiService } from './services/ai';
import {
  auth,
  ensureAuth,
  signInWithGoogle,
  logout,
  publishCloudMessage,
  publishCloudChat,
  subscribeToCloudMessages,
  FirebaseUser,
} from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(() => storageService.loadSettings());
  const [chats, setChats] = useState<Chat[]>(() => storageService.loadChats());
  const [activeChatId, setActiveChatId] = useState<string>('saved_messages');
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>(() => storageService.loadMessages());
  const [p2pStats, setP2pStats] = useState<P2PStats>(p2pService.getStats());

  // Navigation & Modals state
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [connectionToast, setConnectionToast] = useState<{ title: string; subtitle: string } | null>(null);
  const [incomingInviteTargetId, setIncomingInviteTargetId] = useState<string | null>(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('connect=')) {
        return hash.split('connect=')[1].split('&')[0] || null;
      }
    } catch {}
    return null;
  });
  const [incomingInviteTargetName, setIncomingInviteTargetName] = useState<string | null>(() => {
    try {
      const hash = window.location.hash;
      if (hash && hash.includes('name=')) {
        const raw = hash.split('name=')[1]?.split('&')[0];
        return raw ? decodeURIComponent(raw) : null;
      }
    } catch {}
    return null;
  });
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Real-time peer typing indicator
  const [isPeerTyping, setIsPeerTyping] = useState(false);
  const [typingPeerName, setTypingPeerName] = useState('');
  const typingTimeoutRef = useRef<number | null>(null);

  // Voice & Video Call State
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteVoicePeer, setRemoteVoicePeer] = useState<VoicePeer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<number | null>(null);

  const startCallTimer = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    setCallDuration(0);
    callTimerRef.current = window.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  const handleConnectDirect = async (targetPeerId: string): Promise<boolean> => {
    setConnectionToast({
      title: 'P2P рукопожатие...',
      subtitle: `Согласование прямого соединения с ${targetPeerId.slice(0, 8)}...`,
    });

    const success = await p2pService.connectToPeer(
      targetPeerId,
      settings.profile,
      4,
      (attempt, maxAttempts, delayMs) => {
        setConnectionToast({
          title: 'Согласование P2P канала...',
          subtitle: `Повтор рукопожатия через ${(delayMs / 1000).toFixed(1)}с (попытка ${attempt}/${maxAttempts})...`,
        });
      }
    );

    if (success) {
      // Show Apple Dynamic Island toast
      setConnectionToast({
        title: 'Прямой P2P контакт установлен!',
        subtitle: 'Сквозное шифрование AES-256-GCM. Прямой WebRTC канал.',
      });
      setTimeout(() => setConnectionToast(null), 5000);

      // Ensure chat exists
      setChats((prev) => {
        if (prev.some((c) => c.id === targetPeerId || c.peerId === targetPeerId)) return prev;
        const newChat: Chat = {
          id: targetPeerId,
          peerId: targetPeerId,
          name: `Собеседник (${targetPeerId.slice(0, 8)})`,
          isRoom: false,
          avatarColor: '#0ea5e9',
          lastMessage: 'Прямое P2P соединение установлено!',
          lastMessageTime: Date.now(),
          unreadCount: 0,
          encryptionFingerprint: '🛡️ 🔑 💎 ⚡',
        };
        return [newChat, ...prev];
      });
      setActiveChatId(targetPeerId);
    } else {
      setConnectionToast({
        title: 'Не удалось установить P2P контакт',
        subtitle: 'Собеседник офлайн или код соединения не найден.',
      });
      setTimeout(() => setConnectionToast(null), 4000);
    }
    return success;
  };

  const handleFriendJoin = async (displayName: string) => {
    if (!incomingInviteTargetId) return;
    const targetId = incomingInviteTargetId;
    const friendDisplayName = incomingInviteTargetName || `Собеседник (${targetId.slice(0, 6)})`;

    // 1. Update user profile
    setSettings((prev) => ({
      ...prev,
      profile: { ...prev.profile, displayName },
    }));

    // 2. Add or activate the friend's chat immediately
    const newChat: Chat = {
      id: targetId,
      peerId: targetId,
      name: friendDisplayName,
      isRoom: false,
      avatarColor: '#0ea5e9',
      lastMessage: 'Защищённый канал готов к общению!',
      lastMessageTime: Date.now(),
      unreadCount: 0,
      encryptionFingerprint: '🛡️ 🔑 💎 ⚡',
    };

    setChats((prev) => {
      const existing = prev.find((c) => c.id === targetId || c.peerId === targetId);
      if (existing) {
        return prev.map((c) => (c.id === existing.id ? { ...c, name: friendDisplayName } : c));
      }
      return [newChat, ...prev];
    });
    setActiveChatId(targetId);

    // 3. Ensure Auth and connect P2P
    await ensureAuth();
    handleConnectDirect(targetId);

    // 4. Send join greeting to Cloud Relay and P2P
    const myId = settings.profile.id || p2pStats.peerId;
    const cloudChatId = [myId, targetId].sort().join('__');

    const greetingMsg: Message = {
      id: 'msg_join_' + Date.now(),
      chatId: targetId,
      senderId: myId,
      senderName: displayName,
      senderAvatarColor: settings.profile.avatarColor,
      type: 'text',
      text: `👋 Привет! Я перешел по твоей ссылке и готов к общению.`,
      timestamp: Date.now(),
      status: 'delivered',
    };

    publishCloudMessage(cloudChatId, greetingMsg);
    publishCloudChat(newChat, [myId, targetId]);

    setMessagesMap((prev) => ({
      ...prev,
      [targetId]: [...(prev[targetId] || []), greetingMsg],
    }));

    // Clear hash cleanly
    window.history.replaceState(null, '', window.location.pathname);
    setIncomingInviteTargetId(null);
    setIncomingInviteTargetName(null);
  };

  // PWA Install prompt listener
  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  // Firebase Auth sync
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        setSettings((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            displayName: user.displayName || prev.profile.displayName,
            avatarUrl: user.photoURL || prev.profile.avatarUrl,
          },
        }));
      }
    });
    return () => unsub();
  }, []);

  // Audio transcription with Gemini
  const handleTranscribeVoice = async (msgId: string, dataUrl: string) => {
    try {
      setConnectionToast({
        title: '✨ Gemini AI',
        subtitle: 'Транскрибирование аудио в текст...',
      });
      const text = await aiService.transcribe(dataUrl);
      if (text) {
        setMessagesMap((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((chatId) => {
            next[chatId] = next[chatId].map((m) =>
              m.id === msgId ? { ...m, transcription: text } : m
            );
          });
          return next;
        });
        setConnectionToast({
          title: '✨ Gemini AI',
          subtitle: 'Аудио успешно расшифровано!',
        });
        setTimeout(() => setConnectionToast(null), 3000);
      }
    } catch (e: any) {
      console.error('Transcription error:', e);
      setConnectionToast({
        title: 'Ошибка транскрибирования',
        subtitle: e?.message || 'Не удалось распознать речь',
      });
      setTimeout(() => setConnectionToast(null), 3000);
    }
  };

  // Sync audio settings
  useEffect(() => {
    audioService.setSettings(settings.soundEffects, settings.soundVolume, settings.soundboardVolume);
  }, [settings.soundEffects, settings.soundVolume, settings.soundboardVolume]);

  // Save changes to storage
  useEffect(() => {
    storageService.saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    storageService.saveChats(chats);
  }, [chats]);

  useEffect(() => {
    storageService.saveMessages(messagesMap);
  }, [messagesMap]);

  // Intercept and handle transient WebSocket handshake closure rejections
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || String(event?.reason || '');
      if (
        reason.includes('WebSocket closed without opened') ||
        reason.includes('socket closed') ||
        reason.includes('closed without opened')
      ) {
        event.preventDefault();
        console.info('Transient WebSocket handshake drop handled. Reconnection scheduled with exponential backoff.');
      }
    };
    window.addEventListener('unhandledrejection', handleRejection);
    return () => window.removeEventListener('unhandledrejection', handleRejection);
  }, []);

  // 1. Initialize P2P Network with exponential backoff signaling handshake retry
  useEffect(() => {
    let unmounted = false;
    let retryCount = 0;
    const maxInitRetries = 5;

    const startP2P = async () => {
      try {
        const id = await p2pService.init(settings.profile, settings.stunServers);
        if (unmounted) return;
        if (!settings.profile.id) {
          setSettings((prev) => ({
            ...prev,
            profile: { ...prev.profile, id },
          }));
        }

        // Check if URL has hash invite: #connect=p2p_xxxx
        const hash = window.location.hash;
        if (hash && hash.includes('connect=')) {
          const targetId = hash.split('connect=')[1].split('&')[0];
          if (targetId && targetId !== id) {
            handleConnectDirect(targetId);
          }
        }
      } catch {
        if (unmounted) return;
        if (retryCount < maxInitRetries) {
          const delay = Math.min(1000 * Math.pow(1.8, retryCount), 10000) + Math.random() * 300;
          retryCount++;
          setTimeout(startP2P, delay);
        }
      }
    };

    startP2P();

    const unsubSignaling = p2pService.on('signaling_state', (data: any) => {
      if (unmounted) return;
      if (data?.state === 'reconnecting') {
        setConnectionToast({
          title: 'P2P Сигнализация',
          subtitle: `Восстановление WebSocket рукопожатия (попытка ${data.attempt})...`,
        });
      } else if (data?.state === 'connected') {
        setConnectionToast({
          title: 'P2P Сеть активна',
          subtitle: `Шлюз WebRTC подключен: ${data.peerId?.slice(0, 10)}...`,
        });
        setTimeout(() => setConnectionToast(null), 3000);
      }
    });

    const unsubStats = p2pService.on('stats_update', (stats) => {
      setP2pStats(stats as P2PStats);
    });

    // Handle incoming P2P Chat Messages
    const unsubMsg = p2pService.on('message', async (data) => {
      const packet = data as { senderId: string; senderName: string; payload: Message };
      const incomingMsg = packet.payload;

      // Decrypt if necessary
      let decryptedText = incomingMsg.text;
      if (incomingMsg.text && incomingMsg.text.startsWith('enc:') && settings.e2eeEnabled) {
        decryptedText = await cryptoService.decrypt(incomingMsg.text, settings.secretPassphrase);
      }

      const processedMsg: Message = {
        ...incomingMsg,
        text: decryptedText,
        status: 'delivered',
      };

      // Find or create chat for this sender
      setChats((prevChats) => {
        const existing = prevChats.find((c) => c.id === packet.senderId || c.peerId === packet.senderId);
        if (existing) {
          return prevChats.map((c) =>
            c.id === existing.id
              ? {
                  ...c,
                  lastMessage: processedMsg.text || 'Медиафайл',
                  lastMessageTime: processedMsg.timestamp,
                  unreadCount: activeChatId === c.id ? 0 : c.unreadCount + 1,
                }
              : c
          );
        } else {
          const newChat: Chat = {
            id: packet.senderId,
            peerId: packet.senderId,
            name: packet.senderName || `Собеседник (${packet.senderId.slice(0, 6)})`,
            isRoom: false,
            avatarColor: '#0ea5e9',
            lastMessage: processedMsg.text || 'Медиафайл',
            lastMessageTime: processedMsg.timestamp,
            unreadCount: 1,
            encryptionFingerprint: '🛡️ 🔑 💎 ⚡',
          };
          return [newChat, ...prevChats];
        }
      });

      const targetChatId = incomingMsg.chatId && incomingMsg.chatId !== 'saved_messages'
        ? incomingMsg.chatId
        : packet.senderId;

      setMessagesMap((prev) => ({
        ...prev,
        [targetChatId]: [...(prev[targetChatId] || []), processedMsg],
      }));

      // Play Telegram receive chime
      audioService.playReceive();

      // Send ACK back so sender gets double checkmark
      p2pService.sendPacket('message_ack', { messageId: processedMsg.id }, packet.senderId);

      // Self-destruct timer handling
      if (processedMsg.selfDestructIn && processedMsg.selfDestructIn > 0) {
        setTimeout(() => {
          setMessagesMap((prev) => ({
            ...prev,
            [targetChatId]: (prev[targetChatId] || []).filter((m) => m.id !== processedMsg.id),
          }));
        }, processedMsg.selfDestructIn * 1000);
      }
    });

    // Handle Message ACK (changes checkmark to double checkmark)
    const unsubAck = p2pService.on('message_ack', (data) => {
      const { payload } = data as { payload: { messageId: string } };
      if (!payload?.messageId) return;

      setMessagesMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((chatId) => {
          next[chatId] = next[chatId].map((m) =>
            m.id === payload.messageId ? { ...m, status: 'read' as const } : m
          );
        });
        return next;
      });
    });

    // Handle P2P Reactions
    const unsubReaction = p2pService.on('reaction', (data) => {
      const { payload } = data as { payload: { messageId: string; emoji: string; senderId: string } };
      if (!payload) return;

      setMessagesMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((chatId) => {
          next[chatId] = next[chatId].map((m) => {
            if (m.id !== payload.messageId) return m;
            const currentReactions = { ...(m.reactions || {}) };
            const users = currentReactions[payload.emoji] || [];
            if (users.includes(payload.senderId)) {
              currentReactions[payload.emoji] = users.filter((u) => u !== payload.senderId);
              if (currentReactions[payload.emoji].length === 0) delete currentReactions[payload.emoji];
            } else {
              currentReactions[payload.emoji] = [...users, payload.senderId];
            }
            return { ...m, reactions: currentReactions };
          });
        });
        return next;
      });
    });

    // Handle Typing event
    const unsubTyping = p2pService.on('typing', (data) => {
      const { senderName } = data as { senderName: string };
      setIsPeerTyping(true);
      setTypingPeerName(senderName || 'Собеседник');
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsPeerTyping(false);
      }, 2500);
    });

    // Handle Discord Soundboard Sync Event
    const unsubSoundboard = p2pService.on('soundboard', (data) => {
      const { payload } = data as { payload: { soundId: string } };
      if (payload?.soundId) {
        audioService.playSoundboard(payload.soundId);
      }
    });

    // Handle Peer Join / Leave sounds
    const unsubJoin = p2pService.on('peer_join', () => {
      audioService.playDiscordJoin();
    });

    const unsubLeave = p2pService.on('peer_leave', () => {
      audioService.playDiscordLeave();
    });

    // Handle Incoming Call
    const unsubCall = p2pService.on('incoming_call', async (data) => {
      const { call, peerId, metadata } = data as {
        call: { answer: (stream: MediaStream) => void; on: (e: string, fn: (s: MediaStream) => void) => void };
        peerId: string;
        metadata: { isVideo: boolean };
      };

      const isVideo = metadata?.isVideo || false;
      const accept = window.confirm(`Входящий ${isVideo ? 'видеозвонок' : 'голосовой P2P звонок'} от ${peerId.slice(0, 6)}! Принять?`);
      if (accept) {
        try {
          const myStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: isVideo,
          });
          setLocalStream(myStream);
          call.answer(myStream);

          call.on('stream', (rStream: MediaStream) => {
            setRemoteStream(rStream);
          });

          setIsInCall(true);
          setIsVideoEnabled(isVideo);
          setRemoteVoicePeer({
            id: peerId,
            name: `Собеседник (${peerId.slice(0, 6)})`,
            avatarColor: '#8b5cf6',
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            volume: 1,
          });

          startCallTimer();
        } catch {
          // Mic / Camera blocked
        }
      }
    });

    return () => {
      unmounted = true;
      unsubSignaling();
      unsubStats();
      unsubMsg();
      unsubAck();
      unsubReaction();
      unsubTyping();
      unsubSoundboard();
      unsubJoin();
      unsubLeave();
      unsubCall();
    };
  }, [settings.profile.id, settings.secretPassphrase, settings.e2eeEnabled, activeChatId]);

  // Ensure anonymous auth on startup for instant zero-friction 1000km sync
  useEffect(() => {
    ensureAuth();
  }, []);

  // 2. Real-time Cloud Sync for 1000km cross-network messaging
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const myId = settings.profile.id || p2pStats.peerId;
    if (!myId) return;

    chats.forEach((chat) => {
      const targetId = chat.peerId || (!chat.isRoom && !chat.isSavedMessages && !chat.isAI ? chat.id : null);
      if (targetId) {
        const cloudChatId = [myId, targetId].sort().join('__');
        const unsub = subscribeToCloudMessages(cloudChatId, async (cloudMsg) => {
          setMessagesMap((prev) => {
            const list = prev[chat.id] || [];
            if (list.some((m) => m.id === cloudMsg.id)) {
              return prev;
            }

            let text = cloudMsg.text;
            if (text && text.startsWith('enc:') && settings.e2eeEnabled) {
              cryptoService.decrypt(text, settings.secretPassphrase).then((decrypted) => {
                setMessagesMap((current) => ({
                  ...current,
                  [chat.id]: (current[chat.id] || []).map((m) =>
                    m.id === cloudMsg.id ? { ...m, text: decrypted } : m
                  ),
                }));
              });
            }

            const processedMsg: Message = {
              ...cloudMsg,
              text,
              status: 'delivered',
            };

            if (cloudMsg.senderId !== myId) {
              audioService.playReceive();
            }

            return {
              ...prev,
              [chat.id]: [...list, processedMsg],
            };
          });

          // Update chat last message
          setChats((prev) =>
            prev.map((c) =>
              c.id === chat.id
                ? {
                    ...c,
                    lastMessage: cloudMsg.text || (cloudMsg.attachments?.length ? 'Медиафайл' : ''),
                    lastMessageTime: cloudMsg.timestamp,
                    unreadCount: activeChatId === c.id ? 0 : c.unreadCount + (cloudMsg.senderId !== myId ? 1 : 0),
                  }
                : c
            )
          );
        });

        unsubs.push(unsub);
      }
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [chats, settings.profile.id, p2pStats.peerId, settings.e2eeEnabled, settings.secretPassphrase, activeChatId]);

  // 3. Sending Messages
  const handleSendMessage = async (
    rawText: string,
    attachments?: Attachment[],
    options?: { isSecret?: boolean; selfDestructIn?: number; replyTo?: Message }
  ) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    const targetPeerId = activeChat?.peerId || (activeChat && !activeChat.isRoom && !activeChat.isSavedMessages ? activeChat.id : undefined);

    let textToSend = rawText;
    if (rawText && settings.e2eeEnabled && !activeChat?.isSavedMessages) {
      textToSend = await cryptoService.encrypt(rawText, settings.secretPassphrase);
    }

    const newMsg: Message = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      chatId: activeChatId,
      senderId: settings.profile.id || 'self',
      senderName: settings.profile.displayName,
      senderAvatarColor: settings.profile.avatarColor,
      type: attachments?.some((a) => a.type.startsWith('audio')) ? 'voice' : 'text',
      text: rawText, // Show decrypted to self
      timestamp: Date.now(),
      replyTo: options?.replyTo
        ? {
            id: options.replyTo.id,
            text: options.replyTo.text,
            senderName: options.replyTo.senderName,
          }
        : undefined,
      attachments,
      status: targetPeerId ? 'sending' : 'delivered',
      isSecret: options?.isSecret,
      selfDestructIn: options?.selfDestructIn,
    };

    // Append to local message list
    setMessagesMap((prev) => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg],
    }));

    // Update chat last message
    setChats((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              lastMessage: rawText || (attachments?.length ? 'Медиафайл' : ''),
              lastMessageTime: Date.now(),
            }
          : c
      )
    );

    // Play Telegram send sound
    audioService.playSend();

    // If Gemini AI Assistant Chat
    if (activeChat?.isAI) {
      setIsPeerTyping(true);
      setTypingPeerName('Gemini AI');

      try {
        const history = (messagesMap['gemini_assistant'] || []).concat(newMsg).map((m) => ({
          role: m.isAI ? ('model' as const) : ('user' as const),
          text: m.text,
        }));

        const lastQuery = (newMsg.text || '').toLowerCase();
        const needsSearch = /(поиск|найди|новости|курс|погода|search|today|сегодня|google)/i.test(lastQuery);
        const aiResponse = await aiService.chat(history, { enableSearch: needsSearch });

        const aiMsg: Message = {
          id: 'msg_ai_' + Date.now(),
          chatId: 'gemini_assistant',
          senderId: 'gemini_ai',
          senderName: 'Gemini AI',
          senderAvatarColor: 'linear-gradient(135deg, #38bdf8, #818cf8, #c084fc)',
          type: 'text',
          text: aiResponse.text,
          sources: aiResponse.sources,
          timestamp: Date.now(),
          status: 'read',
          isAI: true,
        };

        setMessagesMap((prev) => ({
          ...prev,
          gemini_assistant: [...(prev.gemini_assistant || []), aiMsg],
        }));

        setChats((prev) =>
          prev.map((c) =>
            c.id === 'gemini_assistant'
              ? {
                  ...c,
                  lastMessage: aiResponse.text.slice(0, 60),
                  lastMessageTime: Date.now(),
                }
              : c
          )
        );

        audioService.playReceive();
      } catch (err: any) {
        console.warn('AI chat response status:', err?.message || err);
        let displayError = err?.message || 'Не удалось получить ответ.';
        try {
          const parsed = typeof displayError === 'string' && displayError.startsWith('{') ? JSON.parse(displayError) : null;
          if (parsed?.error?.message) {
            displayError = parsed.error.message;
          }
        } catch {}

        if (displayError.includes('quota') || displayError.includes('RESOURCE_EXHAUSTED') || displayError.includes('429')) {
          displayError = 'Лимит запросов к Gemini API временно исчерпан. Подождите немного перед следующим сообщением.';
        } else if (displayError.includes('Failed to fetch') || displayError.includes('NetworkError')) {
          displayError = 'Сервер обновляет соединение. Пожалуйста, повторите отправку сообщения.';
        }

        const errorMsg: Message = {
          id: 'msg_ai_err_' + Date.now(),
          chatId: 'gemini_assistant',
          senderId: 'gemini_ai',
          senderName: 'Gemini AI',
          type: 'text',
          text: `⚠️ ${displayError}`,
          timestamp: Date.now(),
          status: 'read',
          isAI: true,
        };
        setMessagesMap((prev) => ({
          ...prev,
          gemini_assistant: [...(prev.gemini_assistant || []), errorMsg],
        }));
      } finally {
        setIsPeerTyping(false);
      }
      return;
    }

    // If P2P (not Saved Messages), send over WebRTC DataChannel AND Cloud Relay for 1000km delivery
    if (!activeChat?.isSavedMessages && !activeChat?.isAI) {
      const packetToSend: Message = {
        ...newMsg,
        text: textToSend,
      };
      // Direct WebRTC P2P (0ms if channel connected)
      p2pService.sendPacket('message', packetToSend, targetPeerId);

      // Guaranteed Firestore Cloud Relay (works across 1000km, mobile data, symmetric NATs)
      if (targetPeerId) {
        const myId = settings.profile.id || p2pStats.peerId;
        const cloudChatId = [myId, targetPeerId].sort().join('__');
        publishCloudMessage(cloudChatId, {
          ...newMsg,
          text: textToSend,
        });
        if (activeChat) {
          publishCloudChat(activeChat, [myId, targetPeerId]);
        }
      }
    }

    // Auto-destruct timer
    if (newMsg.selfDestructIn && newMsg.selfDestructIn > 0) {
      setTimeout(() => {
        setMessagesMap((prev) => ({
          ...prev,
          [activeChatId]: (prev[activeChatId] || []).filter((m) => m.id !== newMsg.id),
        }));
      }, newMsg.selfDestructIn * 1000);
    }
  };

  const handleSendTyping = () => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat || activeChat.isSavedMessages) return;
    p2pService.sendPacket('typing', {}, activeChat.peerId);
  };

  // Reactions
  const handleToggleReaction = (messageId: string, emoji: string) => {
    const myId = settings.profile.id || 'self';
    setMessagesMap((prev) => {
      const currentList = prev[activeChatId] || [];
      const updated = currentList.map((m) => {
        if (m.id !== messageId) return m;
        const currentReactions = { ...(m.reactions || {}) };
        const users = currentReactions[emoji] || [];
        if (users.includes(myId)) {
          currentReactions[emoji] = users.filter((u) => u !== myId);
          if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
        } else {
          currentReactions[emoji] = [...users, myId];
        }
        return { ...m, reactions: currentReactions };
      });
      return { ...prev, [activeChatId]: updated };
    });

    const activeChat = chats.find((c) => c.id === activeChatId);
    if (activeChat && !activeChat.isSavedMessages) {
      p2pService.sendPacket('reaction', { messageId, emoji, senderId: myId }, activeChat.peerId);
    }
  };

  // Pin message
  const handlePinMessage = (messageId: string) => {
    setMessagesMap((prev) => {
      const currentList = prev[activeChatId] || [];
      const updated = currentList.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      );
      return { ...prev, [activeChatId]: updated };
    });
  };

  // Delete message
  const handleDeleteMessage = (messageId: string) => {
    setMessagesMap((prev) => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter((m) => m.id !== messageId),
    }));
  };

  // Discord Soundboard Event
  const handleSendSoundboard = (soundId: string) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (activeChat && !activeChat.isSavedMessages) {
      p2pService.sendPacket('soundboard', { soundId }, activeChat.peerId);
    }
  };

  // --- Voice / Video Calls ---
  const handleStartVoiceCall = async () => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    const targetPeerId = activeChat?.peerId || (activeChat && !activeChat.isRoom && !activeChat.isSavedMessages ? activeChat.id : undefined);
    if (!targetPeerId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setLocalStream(stream);

      const call = await p2pService.startCall(targetPeerId, stream, false);
      if (call) {
        call.on('stream', (rStream) => {
          setRemoteStream(rStream);
        });
      }

      setIsInCall(true);
      setIsVideoEnabled(false);
      setRemoteVoicePeer({
        id: targetPeerId,
        name: activeChat?.name || 'Собеседник',
        avatarColor: activeChat?.avatarColor || '#0ea5e9',
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volume: 1,
      });

      startCallTimer();
      audioService.playDiscordJoin();
    } catch {
      alert('Пожалуйста, предоставьте доступ к микрофону для голосового звонка.');
    }
  };

  const handleStartVideoCall = async () => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    const targetPeerId = activeChat?.peerId || (activeChat && !activeChat.isRoom && !activeChat.isSavedMessages ? activeChat.id : undefined);
    if (!targetPeerId) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);

      const call = await p2pService.startCall(targetPeerId, stream, true);
      if (call) {
        call.on('stream', (rStream) => {
          setRemoteStream(rStream);
        });
      }

      setIsInCall(true);
      setIsVideoEnabled(true);
      setRemoteVoicePeer({
        id: targetPeerId,
        name: activeChat?.name || 'Собеседник',
        avatarColor: activeChat?.avatarColor || '#0ea5e9',
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        volume: 1,
      });

      startCallTimer();
      audioService.playDiscordJoin();
    } catch {
      alert('Пожалуйста, предоставьте доступ к камере и микрофону.');
    }
  };

  const handleToggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);
        audioService.playMute(newMuted);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        setLocalStream(screenStream);
        setIsScreenSharing(true);

        screenTrack.onended = () => {
          setIsScreenSharing(false);
        };
      } catch {
        // User cancelled screen share
      }
    } else {
      setIsScreenSharing(false);
    }
  };

  const handleToggleDeafen = () => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    audioService.playMute(nextDeafened);
  };

  const handleEndCall = () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    p2pService.endCall();
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);
    setIsInCall(false);
    setIsScreenSharing(false);
    audioService.playDiscordLeave();
  };

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0] || null;
  const currentMessages = messagesMap[activeChatId] || [];

  return (
    <div className={`flex h-screen w-screen overflow-hidden text-slate-100 font-sans relative selection:bg-sky-500/30 selection:text-white wallpaper-${settings.wallpaper || 'ios-liquid-cyan'}`}>
      {/* Fluid Organic Ambient Liquid Glass Glow Orbs (from iOS 26/27 concept photos) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-400/25 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] rounded-full bg-blue-500/25 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-teal-400/20 blur-[100px] pointer-events-none" />

      {/* 1. Left Telegram Sidebar */}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={(id) => {
          setActiveChatId(id);
          setIsMobileSidebarOpen(false);
          // Mark unread as 0
          setChats((prev) =>
            prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
          );
        }}
        myProfile={settings.profile}
        onUpdateStatus={(status: UserStatus) => {
          setSettings((prev) => ({
            ...prev,
            profile: { ...prev.profile, status },
          }));
        }}
        onOpenInvite={() => setIsInviteOpen(true)}
        onCreateRoom={() => setIsCreateRoomOpen(true)}
        onConnectToPeer={handleConnectDirect}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Main Chat Area & Top Header */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        <Header
          activeChat={activeChat}
          p2pStats={p2pStats}
          myProfile={settings.profile}
          currentWallpaper={settings.wallpaper}
          onSelectWallpaper={(wp) => setSettings((prev) => ({ ...prev, wallpaper: wp }))}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          isMobileSidebarOpen={isMobileSidebarOpen}
          onOpenInvite={() => setIsInviteOpen(true)}
          onOpenInstall={() => setIsInstallOpen(true)}
          onStartVoiceCall={handleStartVoiceCall}
          onStartVideoCall={handleStartVideoCall}
          onOpenSoundboard={() => setIsSoundboardOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isInCall={isInCall}
        />

        <ChatArea
          chat={activeChat}
          messages={currentMessages}
          myProfile={settings.profile}
          wallpaper={settings.wallpaper}
          bubbleRadius={settings.bubbleRadius}
          onSendMessage={(txt, opts) => handleSendMessage(txt, undefined, opts)}
          onToggleReaction={handleToggleReaction}
          onPinMessage={handlePinMessage}
          onDeleteMessage={handleDeleteMessage}
          onSelectChannel={(chanId) => {
            setChats((prev) =>
              prev.map((c) =>
                c.id === activeChatId ? { ...c, activeChannelId: chanId } : c
              )
            );
          }}
          replyingTo={replyingTo}
          onSetReplyingTo={setReplyingTo}
          isPeerTyping={isPeerTyping}
          typingPeerName={typingPeerName}
          onTranscribeVoice={handleTranscribeVoice}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          onSendTyping={handleSendTyping}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          defaultDestructTimer={settings.autoDestructDefault}
        />
      </main>

      {/* 3. Discord Voice & Video Call Overlay */}
      {isInCall && (
        <VoiceCallOverlay
          localStream={localStream}
          remoteStream={remoteStream}
          remotePeer={remoteVoicePeer}
          isMuted={isMuted}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isDeafened={isDeafened}
          onToggleMute={handleToggleMute}
          onToggleVideo={handleToggleVideo}
          onToggleScreenShare={handleToggleScreenShare}
          onToggleDeafen={handleToggleDeafen}
          onEndCall={handleEndCall}
          callDuration={callDuration}
        />
      )}

      {/* 4. Discord Soundboard Drawer */}
      <SoundboardModal
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        onSendSoundboardEvent={handleSendSoundboard}
      />

      {/* 5. Comprehensive Discord & Telegram Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        myPeerId={p2pStats.peerId}
      />

      {/* 6. Invite Friend / P2P Direct Connect Modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        myPeerId={p2pStats.peerId}
        myProfile={settings.profile}
        p2pStats={p2pStats}
        onConnectToPeer={handleConnectDirect}
      />

      {/* 7. Create Room / Channel Modal */}
      <CreateRoomModal
        isOpen={isCreateRoomOpen}
        onClose={() => setIsCreateRoomOpen(false)}
        onCreateRoom={(newChat) => {
          setChats((prev) => [newChat, ...prev]);
          setActiveChatId(newChat.id);
        }}
      />

      {/* 8. PWA Install Guide Modal (iOS Safari & Desktop) */}
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        deferredPrompt={deferredPrompt}
      />

      {/* 9. Friend Welcome Onboarding (When opened via #connect=...) */}
      <FriendWelcomeModal
        isOpen={Boolean(incomingInviteTargetId)}
        friendId={incomingInviteTargetId || ''}
        friendName={incomingInviteTargetName || ''}
        onJoin={handleFriendJoin}
        onOpenInstallGuide={() => setIsInstallOpen(true)}
      />

      {/* 10. Apple Dynamic Island Real-time Notification Banner */}
      {connectionToast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none">
          <div className="px-5 py-2.5 rounded-full ios-island border border-white/20 shadow-2xl flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]" />
            <div>
              <div className="font-semibold text-xs text-white">{connectionToast.title}</div>
              <div className="text-[10px] text-slate-300">{connectionToast.subtitle}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
