import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Radio,
  Phone,
  Video,
  Share2,
  Volume2,
  Settings as SettingsIcon,
  Check,
  Copy,
  Download,
  BatteryCharging,
  Layers,
  Wifi,
  Signal,
  Lock,
  Zap,
  Activity,
  X,
  Menu,
  Search,
  Star,
  Hash
} from 'lucide-react';
import { Chat, P2PStats, UserProfile, WallpaperType } from '../types';
import { highlightMatch } from '../utils/highlight';

interface HeaderProps {
  activeChat: Chat | null;
  chats?: Chat[];
  p2pStats: P2PStats;
  myProfile: UserProfile;
  currentWallpaper?: WallpaperType;
  onSelectWallpaper?: (wp: WallpaperType) => void;
  onSelectChat?: (chatId: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onOpenInvite: () => void;
  onOpenInstall: () => void;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onOpenSoundboard: () => void;
  onOpenSettings: () => void;
  isInCall: boolean;
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

interface BatteryState {
  level: number; // 0..100
  charging: boolean;
  supported: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeChat,
  chats = [],
  p2pStats,
  myProfile,
  currentWallpaper = 'ios-liquid-cyan',
  onSelectWallpaper,
  onSelectChat,
  searchQuery,
  onSearchChange,
  onOpenInvite,
  onOpenInstall,
  onStartVoiceCall,
  onStartVideoCall,
  onOpenSoundboard,
  onOpenSettings,
  isInCall,
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const effectiveSearch = searchQuery !== undefined ? searchQuery : localSearch;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearch(val);
    }
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K or / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter chats by name in real-time
  const matchingChats = effectiveSearch.trim()
    ? chats.filter((c) =>
        c.name.toLowerCase().includes(effectiveSearch.trim().toLowerCase())
      )
    : [];

  const [copiedLink, setCopiedLink] = useState(false);
  const [islandExpanded, setIslandExpanded] = useState(false);
  const [wallpaperMenuOpen, setWallpaperMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState('9:41');

  // Live time in Apple format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  const [battery, setBattery] = useState<BatteryState>({
    level: 98,
    charging: false,
    supported: false,
  });

  // Battery Status API monitor
  useEffect(() => {
    let batteryObj: any = null;

    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((b: any) => {
        batteryObj = b;
        const update = () => {
          setBattery({
            level: Math.round(b.level * 100),
            charging: b.charging,
            supported: true,
          });
        };
        update();
        b.addEventListener('levelchange', update);
        b.addEventListener('chargingchange', update);
      }).catch(() => {
        setBattery({ level: 96, charging: false, supported: false });
      });
    }

    return () => {
      if (batteryObj) {
        try {
          batteryObj.removeEventListener('levelchange', () => {});
          batteryObj.removeEventListener('chargingchange', () => {});
        } catch {}
      }
    };
  }, []);

  const copyShareLink = () => {
    let baseUrl = window.location.origin;
    if (window.location.hostname.includes('ais-dev-')) {
      baseUrl = window.location.origin.replace('ais-dev-', 'ais-pre-');
    }
    const url = new URL(baseUrl);
    const nameParam = myProfile.displayName ? `&name=${encodeURIComponent(myProfile.displayName)}` : '';
    url.hash = `connect=${p2pStats.peerId}${nameParam}`;
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="h-16 px-3 sm:px-5 flex items-center justify-between border-b border-white/[0.14] ios-glass z-20 shrink-0 select-none relative">
      {/* Zone 1: Chat / Room Identity with iOS Glass Avatar */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-xl ios-glass-btn text-slate-200 hover:text-white shrink-0 cursor-pointer"
            title="Список диалогов"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg shrink-0 ios-tap-press transition-transform border border-white/20"
            style={{
              background: activeChat?.isSavedMessages
                ? 'linear-gradient(135deg, #0ea5e9, #38bdf8)'
                : activeChat?.avatarColor || 'linear-gradient(135deg, #0284c7, #2563eb)',
            }}
          >
            {activeChat?.isSavedMessages ? '⭐' : activeChat?.name?.charAt(0).toUpperCase() || 'P'}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 truncate">
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate">
                {activeChat?.name || 'Aether P2P'}
              </h2>
              {activeChat?.isSavedMessages ? (
                <span className="text-xs text-sky-400 font-medium shrink-0">
                  · Личное облако
                </span>
              ) : (
                <div className="hidden sm:flex items-center gap-1 text-xs text-emerald-400 shrink-0">
                  <span className="text-white/30">·</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>E2EE Direct</span>
                </div>
              )}
            </div>

            {activeChat?.encryptionFingerprint && !activeChat.isSavedMessages && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 truncate">
                <span className="text-slate-400">Ключ:</span>
                <span className="tracking-widest drop-shadow-sm">{activeChat.encryptionFingerprint}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Search Bar filtering chats by name with text highlight */}
      <div
        ref={searchContainerRef}
        className="relative mx-1 sm:mx-3 flex-1 max-w-[150px] sm:max-w-[210px] md:max-w-[280px] lg:max-w-[320px] transition-all z-30"
      >
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={effectiveSearch}
            onChange={(e) => {
              handleSearchChange(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Поиск по имени..."
            className="w-full pl-8 sm:pl-9 pr-7 sm:pr-8 py-1.5 sm:py-2 bg-white/[0.07] hover:bg-white/[0.12] focus:bg-white/[0.15] border border-white/[0.18] rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/80 shadow-inner transition-all"
          />
          {effectiveSearch ? (
            <button
              onClick={() => {
                handleSearchChange('');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Очистить поиск"
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          ) : (
            <span className="hidden lg:flex items-center absolute right-2.5 text-[10px] text-slate-400 font-mono bg-white/10 px-1.5 py-0.5 rounded pointer-events-none">
              ⌘K
            </span>
          )}
        </div>

        {/* Real-time Search Dropdown (Apple Spotlight Style) */}
        {isSearchOpen && effectiveSearch.trim() && (
          <div className="absolute left-0 right-0 sm:-left-6 sm:-right-6 top-full mt-2 rounded-2xl ios-glass-card border border-white/25 shadow-2xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150 max-h-80 overflow-y-auto">
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-semibold text-slate-400 border-b border-white/10 mb-1">
              <span>Результаты ({matchingChats.length}):</span>
              <span className="text-[10px] text-sky-400">Поиск по имени</span>
            </div>

            {matchingChats.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                <p className="text-xs">Чатов с именем «{effectiveSearch}» не найдено</p>
                <span className="text-[10px] text-slate-500 block mt-1">Проверьте написание имени собеседника</span>
              </div>
            ) : (
              <div className="space-y-1">
                {matchingChats.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (onSelectChat) onSelectChat(c.id);
                      setIsSearchOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-left transition-all ios-tap-press cursor-pointer ${
                      activeChat?.id === c.id
                        ? 'bg-sky-500/25 border border-sky-400/40 text-white'
                        : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-sm border border-white/20"
                      style={{ background: c.avatarColor || 'linear-gradient(135deg, #0284c7, #2563eb)' }}
                    >
                      {c.isSavedMessages ? (
                        <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                      ) : c.isRoom ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        c.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-xs text-white truncate">
                        {highlightMatch(c.name, effectiveSearch)}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {c.lastMessage || (c.isRoom ? 'Комната' : 'Прямой P2P контакт')}
                      </div>
                    </div>

                    {activeChat?.id === c.id && (
                      <span className="text-[10px] font-medium text-sky-400 shrink-0">Открыт</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Zone 2: Apple Dynamic Island from Concept Photos (Interactive) */}
      <div className="relative">
        <button
          onClick={() => setIslandExpanded(!islandExpanded)}
          className="flex items-center gap-3 px-4 py-1.5 rounded-full ios-island text-xs text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer border border-white/25"
          title="Нажмите, чтобы развернуть Apple Dynamic Island"
        >
          {/* iOS Status Bar Clock */}
          <span className="font-semibold text-xs text-white/90 font-mono tracking-tight">{currentTime}</span>

          <span className="w-1 h-3 rounded-full bg-white/20" />

          {/* Connection State & Ping */}
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                p2pStats.connected
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]'
                  : 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]'
              }`}
            />
            <span className="font-mono text-slate-200 font-medium text-[11px]">
              {p2pStats.connected ? `${p2pStats.rtt || 14} ms` : 'P2P Ready'}
            </span>
          </div>

          <span className="w-1 h-3 rounded-full bg-white/20" />

          {/* Wi-Fi & Signal glyphs */}
          <div className="flex items-center gap-1.5 text-slate-300">
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <Signal className="w-3.5 h-3.5 text-slate-300" />
          </div>

          <span className="w-1 h-3 rounded-full bg-white/20" />

          {/* Apple Dynamic Island Battery Capsule */}
          <div
            className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300"
            title={battery.charging ? `Батарея: ${battery.level}% (Идет зарядка ⚡)` : `Заряд батареи: ${battery.level}%`}
          >
            <span className="font-semibold text-[11px] text-white/90 tabular-nums">{battery.level}%</span>

            {/* iOS-Style Battery Pill Shell */}
            <div className="relative w-5 h-2.5 rounded-[4px] border border-white/70 p-[1px] flex items-center bg-black/40">
              <div
                className={`h-full rounded-[2px] transition-all duration-300 ${
                  battery.charging
                    ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]'
                    : battery.level <= 20
                    ? 'bg-rose-500 shadow-[0_0_4px_#f43f5e]'
                    : battery.level <= 40
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 shadow-[0_0_4px_#34d399]'
                }`}
                style={{ width: `${Math.min(100, Math.max(12, battery.level))}%` }}
              />
              <div className="absolute -right-1 top-0.5 w-0.5 h-1.5 rounded-r-[1px] bg-white/70" />
              {battery.charging && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] text-black font-black leading-none drop-shadow-sm">⚡</span>
                </div>
              )}
            </div>
          </div>
        </button>

        {/* Expanded Dynamic Island Sheet (As seen in concept mockups image 0 & 1) */}
        {islandExpanded && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-80 p-4 rounded-3xl ios-island border border-white/25 shadow-2xl z-50 text-xs animate-in zoom-in-95 duration-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <span className="font-bold text-white text-sm">Apple Dynamic Island</span>
              </div>
              <button
                onClick={() => setIslandExpanded(false)}
                className="p-1 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-slate-300">
              <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Пинг (RTT):</span>
                <span className="font-mono text-sm font-bold text-emerald-400">{p2pStats.rtt || 14} ms</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Потери пакетов:</span>
                <span className="font-mono text-sm font-bold text-sky-400">0% (SCTP)</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Шифрование:</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>AES-256 E2EE</span>
                </span>
              </div>

              <div className="p-2.5 rounded-2xl bg-white/[0.06] border border-white/10">
                <span className="text-[10px] text-slate-400 block">Канал связи:</span>
                <span className="font-mono text-xs font-semibold text-white">WebRTC + Relay</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 truncate max-w-[170px]">
                ID: {p2pStats.peerId.slice(0, 14)}...
              </span>
              <button
                onClick={copyShareLink}
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-medium text-[11px] shadow-sm flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone 3: Actions & Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Quick Liquid Glass Style Switcher */}
        {onSelectWallpaper && (
          <div className="relative">
            <button
              onClick={() => setWallpaperMenuOpen(!wallpaperMenuOpen)}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-sky-300 hover:text-white ios-glass-btn flex items-center gap-1.5 text-xs font-medium cursor-pointer"
              title="Переключить стиль фона iOS Liquid Glass"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span className="hidden lg:inline">Стиль Glass</span>
            </button>

            {wallpaperMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl ios-glass-card p-2 z-50 shadow-2xl border border-white/20 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 px-2 py-1 block uppercase tracking-wider">
                  Стили iOS Liquid Glass:
                </span>
                {[
                  { id: 'ios-liquid-cyan', label: 'Liquid Ocean (iOS 26)', emoji: '🌊' },
                  { id: 'ios-liquid-sunset', label: 'Sunset Aurora Velvet', emoji: '🌅' },
                  { id: 'ios-frost-silver', label: 'Frost Titanium Silver', emoji: '❄️' },
                  { id: 'ios-dark-glass', label: 'Obsidian Dark Glass', emoji: '🖤' },
                  { id: 'aurora', label: 'Northern Lights Glow', emoji: '🌌' },
                  { id: 'stars', label: 'Cosmic Deep Space', emoji: '✨' },
                  { id: 'neon-grid', label: 'Cyberpunk Neon Grid', emoji: '⚡' },
                  { id: 'clean-mesh', label: 'Minimal Studio Mesh', emoji: '💎' },
                  { id: 'glass-dark', label: 'OLED Pure Midnight', emoji: '🌑' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectWallpaper(item.id as WallpaperType);
                      setWallpaperMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs text-left transition-all cursor-pointer ${
                      currentWallpaper === item.id
                        ? 'bg-sky-500/30 text-white font-semibold border border-sky-400/40 shadow-xs'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <span>{item.emoji}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Share Link with animated feedback */}
        <button
          onClick={copyShareLink}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white shadow-[0_0_14px_rgba(56,189,248,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)] transition-all ios-tap-press cursor-pointer"
          title="Скопировать прямую ссылку подключения для друга"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-200 animate-in zoom-in" /> : <Copy className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {copiedLink ? 'Скопировано!' : 'Ссылка для друга'}
          </span>
        </button>

        {/* Install PWA Button */}
        <button
          onClick={onOpenInstall}
          className="p-2 sm:px-3 sm:py-2 rounded-xl text-slate-300 hover:text-white ios-glass-btn flex items-center gap-1.5 text-xs font-medium cursor-pointer"
          title="Установить мессенджер на телефон или ПК"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span className="hidden md:inline">Установить</span>
        </button>

        <button
          onClick={onOpenInvite}
          className="p-2 rounded-xl text-slate-300 hover:text-white ios-glass-btn cursor-pointer"
          title="QR-код и настройки подключения"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {!activeChat?.isSavedMessages && (
          <>
            <button
              onClick={onStartVoiceCall}
              disabled={isInCall}
              className={`p-2 rounded-xl transition-all ios-tap-press border cursor-pointer ${
                isInCall
                  ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-300 hover:text-white ios-glass-btn'
              }`}
              title="Начать голосовой P2P звонок"
            >
              <Phone className="w-4 h-4" />
            </button>

            <button
              onClick={onStartVideoCall}
              disabled={isInCall}
              className={`p-2 rounded-xl transition-all ios-tap-press border cursor-pointer ${
                isInCall
                  ? 'bg-emerald-500/25 text-emerald-400 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'text-slate-300 hover:text-white ios-glass-btn'
              }`}
              title="Начать видеозвонок"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}

        <button
          onClick={onOpenSoundboard}
          className="p-2 rounded-xl text-indigo-400 hover:text-indigo-300 ios-glass-btn cursor-pointer"
          title="Discord Саундборд (Звуковые эффекты)"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-xl text-slate-300 hover:text-white ios-glass-btn cursor-pointer"
          title="Настройки мессенджера (Discord & Telegram)"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
