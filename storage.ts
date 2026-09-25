import { AppSettings, Chat, Message, UserProfile } from '../types';

const SETTINGS_KEY = 'aether_settings_v1';
const CHATS_KEY = 'aether_chats_v1';
const MESSAGES_KEY = 'aether_messages_v1';

const DEFAULT_PROFILE: UserProfile = {
  id: '', // Will be assigned on initial launch
  username: 'cyber_traveler',
  displayName: 'Alex Cyber',
  avatarColor: '#0ea5e9',
  bio: 'P2P Decentralized Node | No Central Servers',
  status: 'online',
  customStatusText: '🛰️ Прямое P2P соединение',
  customStatusEmoji: '⚡',
  badges: ['founder', 'nitro', 'e2ee'],
};

export const DEFAULT_SETTINGS: AppSettings = {
  profile: DEFAULT_PROFILE,
  theme: 'ios-liquid',
  accent: 'telegram-cyan',
  wallpaper: 'ios-liquid-cyan',
  bubbleRadius: 18,
  fontSize: 15,
  soundEffects: true,
  soundVolume: 0.8,
  soundboardVolume: 0.85,
  voiceInputMode: 'activity',
  pushToTalkKey: 'Space',
  micSensitivity: 25,
  noiseSuppression: true,
  echoCancellation: true,
  autoDestructDefault: 0,
  e2eeEnabled: true,
  secretPassphrase: 'aether-secure-p2p-mesh',
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun.cloudflare.com:3478'
  ],
};

const DEFAULT_SAVED_MESSAGES_CHAT: Chat = {
  id: 'saved_messages',
  name: 'Избранное',
  isRoom: false,
  isSavedMessages: true,
  avatarColor: '#0ea5e9',
  lastMessage: 'Добро пожаловать в персональное P2P хранилище!',
  lastMessageTime: Date.now() - 3600000,
  unreadCount: 0,
  isPinned: true,
  encryptionFingerprint: '🛡️ 🔑 💎 ⚡'
};

const DEFAULT_GEMINI_AI_CHAT: Chat = {
  id: 'gemini_assistant',
  name: '✨ Gemini AI',
  isRoom: false,
  isAI: true,
  avatarColor: 'linear-gradient(135deg, #38bdf8, #818cf8, #c084fc)',
  lastMessage: 'Привет! Я встроенный Gemini AI. Чем могу помочь?',
  lastMessageTime: Date.now() - 1800000,
  unreadCount: 0,
  isPinned: true,
  encryptionFingerprint: '🤖 🧠 ⚡ 🌐'
};

const INITIAL_GEMINI_MESSAGE: Message = {
  id: 'init_gemini_msg_1',
  chatId: 'gemini_assistant',
  senderId: 'gemini_ai',
  senderName: 'Gemini AI',
  type: 'text',
  text: `👋 **Привет! Я ваш персональный нейросетевой помощник Gemini.**\n\n🔹 **Что я умею:**\n• 💬 Отвечать на любые вопросы с сохранением контекста беседы\n• 🔍 Искать актуальную информацию в Google (Google Search Grounding)\n• 🎙️ Транскрибировать голосовые сообщения в текст\n• ⚡ Помогать с кодом, переводом, идеями и задачами\n\nНапишите мне любой вопрос прямо в этот чат!`,
  timestamp: Date.now() - 1800000,
  status: 'read',
  isAI: true,
};

const INITIAL_SAVED_MESSAGE: Message = {
  id: 'init_saved_msg_1',
  chatId: 'saved_messages',
  senderId: 'self',
  senderName: 'Избранное',
  type: 'text',
  text: `👋 **Добро пожаловать в Aether P2P!**\n\nЗдесь нет центрального сервера, базы данных и слежки. Ваши сообщения передаются **напрямую между устройствами** (Peer-to-Peer по WebRTC DataChannel) со сквозным шифрованием (E2EE).\n\n🔹 **Как связаться с другом на расстоянии 1000 км:**\n1. Нажмите вверху **«Поделиться ссылкой»** или откройте меню приглашения.\n2. Отправьте ссылку другу.\n3. Как только друг перейдет по ссылке — между вашими браузерами установится прямое соединение с нулевым пингом и без потерь пакетов!\n\n🔹 **Доступные возможности:**\n• Текстовые чаты, каналы в стиле Discord (#general, #voice)\n• Голосовые сообщения в стиле Telegram с ускорением 1.5x / 2x\n• Прямые аудио- и видеозвонки без серверов\n• Демонстрация экрана (Screen Sharing)\n• Discord Саундборд со звуковыми эффектами\n• Секретные самоуничтожающиеся сообщения\n• Отправка любых файлов и изображений`,
  timestamp: Date.now() - 3600000,
  status: 'read',
  isPinned: true
};

class StorageService {
  public loadSettings(): AppSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const wallpaper = parsed.wallpaper === 'aurora' || !parsed.wallpaper ? 'ios-liquid-cyan' : parsed.wallpaper;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          wallpaper,
          profile: { ...DEFAULT_PROFILE, ...parsed.profile },
        };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  }

  public saveSettings(settings: AppSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {}
  }

  public loadChats(): Chat[] {
    try {
      const stored = localStorage.getItem(CHATS_KEY);
      if (stored) {
        const parsed: Chat[] = JSON.parse(stored);
        if (!parsed.some(c => c.id === 'saved_messages')) {
          parsed.unshift(DEFAULT_SAVED_MESSAGES_CHAT);
        }
        if (!parsed.some(c => c.id === 'gemini_assistant')) {
          parsed.splice(1, 0, DEFAULT_GEMINI_AI_CHAT);
        }
        return parsed;
      }
    } catch {}
    return [DEFAULT_SAVED_MESSAGES_CHAT, DEFAULT_GEMINI_AI_CHAT];
  }

  public saveChats(chats: Chat[]): void {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch {}
  }

  public loadMessages(): Record<string, Message[]> {
    try {
      const stored = localStorage.getItem(MESSAGES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (!parsed['saved_messages']) {
          parsed['saved_messages'] = [INITIAL_SAVED_MESSAGE];
        }
        if (!parsed['gemini_assistant']) {
          parsed['gemini_assistant'] = [INITIAL_GEMINI_MESSAGE];
        }
        return parsed;
      }
    } catch {}
    return {
      saved_messages: [INITIAL_SAVED_MESSAGE],
      gemini_assistant: [INITIAL_GEMINI_MESSAGE],
    };
  }

  public saveMessages(messages: Record<string, Message[]>): void {
    try {
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch {}
  }

  public exportBackup(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings: this.loadSettings(),
      chats: this.loadChats(),
      messages: this.loadMessages()
    };
    return JSON.stringify(data, null, 2);
  }

  public importBackup(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.saveSettings(data.settings);
      if (data.chats) this.saveChats(data.chats);
      if (data.messages) this.saveMessages(data.messages);
      return true;
    } catch {
      return false;
    }
  }

  public clearAll(): void {
    localStorage.removeItem(CHATS_KEY);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }
}

export const storageService = new StorageService();
