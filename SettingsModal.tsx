import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Radio,
  Shield,
  Mic,
  Palette,
  Bell,
  HardDrive,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  Download,
  Upload,
  Volume2,
  Database,
  LogIn,
  LogOut,
  Sparkles,
  Cloud
} from 'lucide-react';
import { AccentColor, AppSettings, ThemeType, WallpaperType } from '../types';
import { cryptoService } from '../services/crypto';
import { storageService } from '../services/storage';
import { auth, signInWithGoogle, logout, FirebaseUser } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
  myPeerId: string;
}

type TabId = 'profile' | 'firebase' | 'network' | 'privacy' | 'voice' | 'appearance' | 'notifications' | 'storage';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  myPeerId,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [visualFingerprint, setVisualFingerprint] = useState('🛡️ 🔑 💎 ⚡');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const micTestStreamRef = useRef<MediaStream | null>(null);
  const micAnimRef = useRef<number | null>(null);
  const fileImportRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  const stopMicTest = () => {
    if (micTestStreamRef.current) {
      micTestStreamRef.current.getTracks().forEach((t) => t.stop());
      micTestStreamRef.current = null;
    }
    if (micAnimRef.current) {
      cancelAnimationFrame(micAnimRef.current);
    }
    setIsTestingMic(false);
    setMicLevel(0);
  };

  const toggleMicTest = async () => {
    if (isTestingMic) {
      stopMicTest();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micTestStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        src.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length / 255;
          setMicLevel(Math.min(100, Math.round(avg * 180)));
          micAnimRef.current = requestAnimationFrame(checkLevel);
        };

        micAnimRef.current = requestAnimationFrame(checkLevel);
        setIsTestingMic(true);
      } catch {
        // Mic access failed
      }
    }
  };

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Update visual fingerprint whenever secret changes
  useEffect(() => {
    cryptoService.generateVisualFingerprint(localSettings.secretPassphrase).then(setVisualFingerprint);
  }, [localSettings.secretPassphrase]);

  // Cleanup mic test on tab change or modal close
  useEffect(() => {
    return () => {
      stopMicTest();
    };
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const handleUpdate = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  const handleProfileUpdate = (field: string, value: unknown) => {
    const updated = {
      ...localSettings,
      profile: {
        ...localSettings.profile,
        [field]: value,
      },
    };
    setLocalSettings(updated);
    onUpdateSettings(updated);
  };

  // --- Export / Import ---
  const handleExport = () => {
    const json = storageService.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether_p2p_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = storageService.importBackup(content);
      if (success) {
        setImportStatus('Резервная копия успешно восстановлена!');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setImportStatus('Ошибка при чтении файла');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl h-[85vh] rounded-3xl ios-glass-card border border-white/15 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/2 shrink-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-base text-white">
              Настройки Aether P2P (Discord & Telegram)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body: Left Tab Sidebar + Right Content Pane */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tab Navigation */}
          <div className="w-52 border-r border-white/10 p-3 space-y-1 bg-white/2 shrink-0 overflow-y-auto">
            {[
              { id: 'profile', label: 'Мой профиль', icon: User },
              { id: 'firebase', label: 'Firebase & Google', icon: Database },
              { id: 'network', label: 'Сеть и STUN', icon: Radio },
              { id: 'privacy', label: 'Конфиденциальность', icon: Shield },
              { id: 'voice', label: 'Голос и Видео', icon: Mic },
              { id: 'appearance', label: 'Оформление', icon: Palette },
              { id: 'notifications', label: 'Звуки', icon: Bell },
              { id: 'storage', label: 'Данные и Бэкап', icon: HardDrive },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabId)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${
                    isActive
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {/* 1. Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Профиль пользователя & Роли Discord
                </h4>

                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shrink-0"
                    style={{ background: localSettings.profile.avatarColor }}
                  >
                    {localSettings.profile.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Цвет аватара:</label>
                    <div className="flex items-center gap-1.5">
                      {['#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'].map((color) => (
                        <button
                          key={color}
                          onClick={() => handleProfileUpdate('avatarColor', color)}
                          className="w-6 h-6 rounded-full border border-white/20 transition-transform hover:scale-115"
                          style={{ background: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Отображаемое имя:</label>
                    <input
                      type="text"
                      value={localSettings.profile.displayName}
                      onChange={(e) => handleProfileUpdate('displayName', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Username (@handle):</label>
                    <input
                      type="text"
                      value={localSettings.profile.username}
                      onChange={(e) => handleProfileUpdate('username', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Кастомный статус Discord:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localSettings.profile.customStatusEmoji}
                      onChange={(e) => handleProfileUpdate('customStatusEmoji', e.target.value)}
                      className="w-12 text-center bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white focus:outline-none"
                    />
                    <input
                      type="text"
                      value={localSettings.profile.customStatusText}
                      onChange={(e) => handleProfileUpdate('customStatusText', e.target.value)}
                      placeholder="Например: 🎧 В наушниках | Прямое соединение"
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">О себе (Bio):</label>
                  <textarea
                    rows={2}
                    value={localSettings.profile.bio}
                    onChange={(e) => handleProfileUpdate('bio', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
                  />
                </div>
              </div>
            )}

            {/* Firebase & Google Cloud Tab */}
            {activeTab === 'firebase' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2 flex items-center justify-between">
                  <span>Firebase Аутентификация & Облачная База Данных</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Firestore Active
                  </span>
                </h4>

                {/* Google Sign-in Card */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {firebaseUser?.photoURL ? (
                        <img
                          src={firebaseUser.photoURL}
                          alt="Google Avatar"
                          className="w-12 h-12 rounded-2xl border border-white/20 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {firebaseUser ? (firebaseUser.displayName?.charAt(0) || 'G') : 'G'}
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{firebaseUser ? (firebaseUser.displayName || 'Google Пользователь') : 'Гостевой P2P профиль'}</span>
                          {firebaseUser && (
                            <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                              В сети Google
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {firebaseUser ? firebaseUser.email : 'Локальный режим без привязки к аккаунту'}
                        </p>
                      </div>
                    </div>

                    {firebaseUser ? (
                      <button
                        onClick={async () => {
                          await logout();
                          setFirebaseUser(null);
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Выйти</span>
                      </button>
                    ) : (
                      <button
                        onClick={async () => {
                          setIsSigningIn(true);
                          setAuthError(null);
                          try {
                            const user = await signInWithGoogle();
                            if (user) {
                              setFirebaseUser(user);
                              handleProfileUpdate('displayName', user.displayName || localSettings.profile.displayName);
                              if (user.photoURL) {
                                handleProfileUpdate('avatarUrl', user.photoURL);
                              }
                            }
                          } catch (err: any) {
                            setAuthError(err?.message || 'Не удалось войти через Google');
                          } finally {
                            setIsSigningIn(false);
                          }
                        }}
                        disabled={isSigningIn}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.04h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.04c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.41 7.34 24 12 24z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.28 14.28c-.25-.72-.38-1.49-.38-2.28s.13-1.56.38-2.28V6.59H1.24C.45 8.16 0 9.94 0 12s.45 3.84 1.24 5.41l4.04-3.13z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.59 1.24 6.59l4.04 3.13c.95-2.83 3.6-4.97 6.72-4.97z"
                          />
                        </svg>
                        <span>{isSigningIn ? 'Вход...' : 'Войти через Google'}</span>
                      </button>
                    )}
                  </div>

                  {authError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      {authError}
                    </p>
                  )}
                </div>

                {/* Firestore Cloud Persistence Specs */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-slate-400">База данных Firestore:</span>
                    <span className="font-mono text-white text-[11px]">firm-operative-gsmzh</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-slate-400">Сквозная безопасность:</span>
                    <span className="text-emerald-400 font-semibold">AES-256 E2EE Rules Active</span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-slate-400">Синхронизация профиля:</span>
                    <span className="text-sky-300">Автоматически при авторизации</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">P2P режим прямого канала:</span>
                    <span className="text-emerald-400">Без посредников (SCTP Direct)</span>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'network' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  P2P Сеть, STUN Серверы и Диагностика
                </h4>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Локальный Peer ID:</span>
                  <div className="p-2.5 rounded-xl bg-black/40 font-mono text-xs text-sky-400 select-all">
                    {myPeerId}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">
                      Список STUN / ICE Серверов (NAT Traversal):
                    </label>
                  </div>
                  {localSettings.stunServers.map((server, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={server}
                        onChange={(e) => {
                          const updated = [...localSettings.stunServers];
                          updated[i] = e.target.value;
                          handleUpdate('stunServers', updated);
                        }}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-300 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const updated = localSettings.stunServers.filter((_, idx) => idx !== i);
                          handleUpdate('stunServers', updated);
                        }}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      handleUpdate('stunServers', [...localSettings.stunServers, 'stun:stun.l.google.com:19302']);
                    }}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Добавить STUN сервер</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Privacy & E2EE Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Сквозное шифрование (E2EE) и безопасность
                </h4>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-white block">Сквозное шифрование (E2EE):</span>
                    <span className="text-[11px] text-slate-400">Шифрование AES-256-GCM прямо в браузере</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.e2eeEnabled}
                    onChange={(e) => handleUpdate('e2eeEnabled', e.target.checked)}
                    className="w-4 h-4 accent-sky-500"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Секретный ключ / пароль E2EE:
                    </span>
                    <button
                      onClick={() => handleUpdate('secretPassphrase', cryptoService.generateRandomPassphrase())}
                      className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Сгенерировать случайный</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={localSettings.secretPassphrase}
                    onChange={(e) => handleUpdate('secretPassphrase', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none"
                  />

                  {/* Telegram Visual Fingerprint Emojis */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Визуальный ключ безопасности (Telegram Secret Chat):
                      </span>
                      <span className="text-xs text-slate-500">
                        Сравните эти 4 эмодзи с другом для защиты от перехвата
                      </span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/15 text-lg tracking-widest">
                      {visualFingerprint}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Таймер самоуничтожения секретных сообщений по умолчанию:
                  </label>
                  <select
                    value={localSettings.autoDestructDefault}
                    onChange={(e) => handleUpdate('autoDestructDefault', Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value={0} className="bg-neutral-900">Выключено</option>
                    <option value={5} className="bg-neutral-900">5 секунд</option>
                    <option value={15} className="bg-neutral-900">15 секунд</option>
                    <option value={30} className="bg-neutral-900">30 секунд</option>
                    <option value={60} className="bg-neutral-900">1 минута</option>
                  </select>
                </div>
              </div>
            )}

            {/* 4. Voice & Video Tab */}
            {activeTab === 'voice' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Голосовой движок Discord (VAD, Шумоподавление, Тест)
                </h4>

                {/* Input Mode: Activity vs Push to Talk */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Режим ввода голоса:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleUpdate('voiceInputMode', 'activity')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        localSettings.voiceInputMode === 'activity'
                          ? 'bg-sky-500/20 border-sky-500/40 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="font-semibold text-xs block mb-0.5">Активация по голосу</span>
                      <span className="text-[10px] text-slate-400">Автоматически включает микрофон</span>
                    </button>

                    <button
                      onClick={() => handleUpdate('voiceInputMode', 'push-to-talk')}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        localSettings.voiceInputMode === 'push-to-talk'
                          ? 'bg-sky-500/20 border-sky-500/40 text-white'
                          : 'bg-white/5 border-white/10 text-slate-400'
                      }`}
                    >
                      <span className="font-semibold text-xs block mb-0.5">Push-to-Talk (По кнопке)</span>
                      <span className="text-[10px] text-slate-400">Нажатие клавиши {localSettings.pushToTalkKey}</span>
                    </button>
                  </div>
                </div>

                {/* Live Mic Test */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-white block">Проверка микрофона:</span>
                      <span className="text-[11px] text-slate-400">Говорите в микрофон, чтобы увидеть уровень</span>
                    </div>
                    <button
                      onClick={toggleMicTest}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        isTestingMic ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white hover:bg-sky-400'
                      }`}
                    >
                      {isTestingMic ? 'Остановить' : 'Проверить'}
                    </button>
                  </div>

                  <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-sky-400 to-amber-400 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>

                {/* Noise Suppression & Echo Cancellation */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300">Шумоподавление (Noise Suppression)</span>
                    <input
                      type="checkbox"
                      checked={localSettings.noiseSuppression}
                      onChange={(e) => handleUpdate('noiseSuppression', e.target.checked)}
                      className="w-4 h-4 accent-sky-500"
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-300">Эхоподавление (Echo Cancellation)</span>
                    <input
                      type="checkbox"
                      checked={localSettings.echoCancellation}
                      onChange={(e) => handleUpdate('echoCancellation', e.target.checked)}
                      className="w-4 h-4 accent-sky-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Оформление (iOS 26.3 Liquid Glass & Telegram)
                </h4>

                {/* Wallpaper preset */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300">Фон чата (Wallpaper):</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'ios-liquid-cyan', label: '🌊 Liquid Ocean (iOS 26)' },
                      { id: 'ios-liquid-sunset', label: '🌅 Sunset Aurora' },
                      { id: 'ios-frost-silver', label: '❄️ Frost Titanium' },
                      { id: 'ios-dark-glass', label: '🖤 Obsidian Glass' },
                      { id: 'aurora', label: '🌌 Northern Lights' },
                      { id: 'stars', label: '✨ Cosmic Deep Space' },
                      { id: 'neon-grid', label: '⚡ Cyberpunk Grid' },
                      { id: 'clean-mesh', label: '💎 Clean Minimal' },
                      { id: 'glass-dark', label: '🌑 OLED Midnight' },
                    ].map((wp) => (
                      <button
                        key={wp.id}
                        onClick={() => handleUpdate('wallpaper', wp.id as WallpaperType)}
                        className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          localSettings.wallpaper === wp.id
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {wp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bubble Radius Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Скругление пузырей сообщений:</label>
                    <span className="text-xs font-mono text-sky-400">{localSettings.bubbleRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={26}
                    value={localSettings.bubbleRadius}
                    onChange={(e) => handleUpdate('bubbleRadius', Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>
            )}

            {/* 6. Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Звуковые эффекты и оповещения
                </h4>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-white block">Звуки сообщений и звонков:</span>
                    <span className="text-[11px] text-slate-400">Аудиоэффекты отправки, доставки, звонков Discord</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.soundEffects}
                    onChange={(e) => handleUpdate('soundEffects', e.target.checked)}
                    className="w-4 h-4 accent-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Громкость звуков:</label>
                    <span className="text-xs font-mono text-sky-400">
                      {Math.round(localSettings.soundVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={localSettings.soundVolume}
                    onChange={(e) => handleUpdate('soundVolume', Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-300">Громкость саундборда Discord:</label>
                    <span className="text-xs font-mono text-sky-400">
                      {Math.round(localSettings.soundboardVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={localSettings.soundboardVolume}
                    onChange={(e) => handleUpdate('soundboardVolume', Number(e.target.value))}
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>
            )}

            {/* 7. Storage & Backup Tab */}
            {activeTab === 'storage' && (
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white border-b border-white/10 pb-2">
                  Хранилище данных и Резервные копии
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Все чаты и настройки сохраняются исключительно в вашем браузере. Вы можете экспортировать резервную копию в файл JSON или восстановить её на любом устройстве.
                </p>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать резервную копию (JSON)</span>
                  </button>

                  <input
                    ref={fileImportRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportFile}
                  />
                  <button
                    onClick={() => fileImportRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Импортировать из файла</span>
                  </button>
                </div>

                {importStatus && (
                  <p className="text-xs text-emerald-400 font-medium">{importStatus}</p>
                )}

                <div className="pt-4 border-t border-white/10">
                  <button
                    onClick={() => {
                      if (confirm('Очистить все локальные чаты и сообщения?')) {
                        storageService.clearAll();
                        window.location.reload();
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Очистить все локальные данные</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3.5 border-t border-white/10 flex items-center justify-end gap-3 bg-white/2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Закрыть
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white shadow-md transition-colors"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};
