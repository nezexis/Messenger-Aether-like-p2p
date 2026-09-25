export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

export interface UserProfile {
  id: string; // Peer ID
  username: string;
  displayName: string;
  avatarColor: string;
  avatarUrl?: string;
  bio: string;
  status: UserStatus;
  customStatusText: string;
  customStatusEmoji: string;
  badges: string[]; // e.g., 'founder', 'host', 'nitro', 'e2ee', 'verified'
}

export type MessageType = 'text' | 'voice' | 'image' | 'file' | 'system' | 'call_event';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string; // mime type
  dataUrl?: string; // base64 or blob URL
  duration?: number; // for audio in seconds
  waveform?: number[]; // normalized waveform bars [0..1]
}

export interface Reaction {
  emoji: string;
  users: string[]; // peer IDs
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatarColor?: string;
  type: MessageType;
  text: string;
  timestamp: number;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  attachments?: Attachment[];
  reactions?: Record<string, string[]>; // emoji -> array of senderIds
  status: 'sending' | 'sent' | 'delivered' | 'read';
  isSecret?: boolean;
  selfDestructIn?: number; // in seconds
  destructAt?: number; // timestamp when it should disappear
  isPinned?: boolean;
  isEdited?: boolean;
  isAI?: boolean;
  sources?: string[];
  transcription?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description?: string;
}

export interface Chat {
  id: string; // peer ID or room ID
  name: string;
  isRoom: boolean; // true if multi-peer room / server, false if direct 1-on-1 P2P
  isSavedMessages?: boolean; // Telegram "Избранное"
  isAI?: boolean; // Gemini AI Assistant
  peerId?: string; // if direct chat
  avatarColor: string;
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
  isPinned?: boolean;
  channels?: Channel[]; // Discord style channels
  activeChannelId?: string;
  encryptionFingerprint?: string; // Telegram secret chat 4 emoji visual key
}

export interface P2PStats {
  peerId: string;
  connected: boolean;
  iceState: string;
  rtt: number; // round trip time in ms
  packetLoss: number; // percentage
  bytesSent: number;
  bytesReceived: number;
  connectionType: 'webrtc-direct' | 'broadcast-channel' | 'local' | 'disconnected';
  candidateType: 'host' | 'srflx' | 'relay' | 'unknown';
}

export interface VoicePeer {
  id: string;
  name: string;
  avatarColor: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0..1
  stream?: MediaStream;
}

export type ThemeType = 'ios-liquid' | 'telegram-midnight' | 'discord-dark' | 'cyberpunk-oled' | 'arctic-light';
export type AccentColor = 'telegram-cyan' | 'discord-blurple' | 'neon-green' | 'apple-rose' | 'sunset-amber' | 'violet-glow';
export type WallpaperType =
  | 'ios-liquid-cyan'
  | 'ios-liquid-sunset'
  | 'ios-frost-silver'
  | 'ios-dark-glass'
  | 'aurora'
  | 'stars'
  | 'neon-grid'
  | 'clean-mesh'
  | 'glass-dark';

export interface AppSettings {
  profile: UserProfile;
  theme: ThemeType;
  accent: AccentColor;
  wallpaper: WallpaperType;
  bubbleRadius: number; // 8..24
  fontSize: number; // 13..18
  soundEffects: boolean;
  soundVolume: number; // 0..1
  soundboardVolume: number; // 0..1
  voiceInputMode: 'activity' | 'push-to-talk';
  pushToTalkKey: string;
  micSensitivity: number; // 0..100
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoDestructDefault: number; // 0 = off, 5, 15, 30, 60, etc.
  e2eeEnabled: boolean;
  secretPassphrase: string;
  stunServers: string[];
}
