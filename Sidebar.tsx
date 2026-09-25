import React, { useState } from 'react';
import {
  Search,
  Plus,
  Link as LinkIcon,
  Folder,
  Star,
  Hash,
  Volume2,
  Users,
  Shield,
  Zap,
  Award,
  Pin,
  ChevronDown,
  X
} from 'lucide-react';
import { Chat, UserProfile, UserStatus } from '../types';
import { highlightMatch } from '../utils/highlight';

interface SidebarProps {
  chats: Chat[];
  activeChatId: string;
  onSelectChat: (chatId: string) => void;
  myProfile: UserProfile;
  onUpdateStatus: (status: UserStatus) => void;
  onOpenInvite: () => void;
  onCreateRoom: () => void;
  onConnectToPeer?: (targetPeerId: string) => Promise<boolean>;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

type FolderTab = 'all' | 'direct' | 'rooms' | 'voice' | 'saved';

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  onSelectChat,
  myProfile,
  onUpdateStatus,
  onOpenInvite,
  onCreateRoom,
  onConnectToPeer,
  isMobileOpen,
  onCloseMobile,
  searchQuery,
  onSearchChange,
}) => {
  const [activeFolder, setActiveFolder] = useState<FolderTab>('all');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [quickConnectInput, setQuickConnectInput] = useState('');
  const [isConnectingQuick, setIsConnectingQuick] = useState(false);
  const [showQuickConnect, setShowQuickConnect] = useState(false);
  const [quickConnectStatus, setQuickConnectStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const effectiveSearch = searchQuery !== undefined ? searchQuery : localSearchQuery;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearchQuery(val);
    }
  };

  const statusColors: Record<UserStatus, string> = {
    online: 'bg-emerald-500',
    idle: 'bg-amber-500',
    dnd: 'bg-rose-500',
    offline: 'bg-slate-500',
  };

  const statusLabels: Record<UserStatus, string> = {
    online: 'В сети',
    idle: 'Не активен',
    dnd: 'Не беспокоить',
    offline: 'Невидимка',
  };

  const filteredChats = chats.filter((chat) => {
    // Filter by search query in real-time by chat name
    if (effectiveSearch.trim()) {
      const q = effectiveSearch.toLowerCase().trim();
      const matchName = chat.name.toLowerCase().includes(q);
      if (!matchName) return false;
    }

    // Filter by folder
    if (activeFolder === 'saved') return chat.isSavedMessages;
    if (activeFolder === 'direct') return !chat.isRoom && !chat.isSavedMessages;
    if (activeFolder === 'rooms') return chat.isRoom;
    if (activeFolder === 'voice') return chat.channels?.some(c => c.type === 'voice');

    return true;
  });

  return (
    <>
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-30 md:hidden"
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-80 md:w-88 flex flex-col h-full border-r border-white/10 ios-glass select-none shrink-0 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* 1. User Profile Mini-Bar */}
        <div className="p-3 border-b border-white/10 bg-white/2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md"
                  style={{ background: myProfile.avatarColor || 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                >
                  {myProfile.displayName.charAt(0).toUpperCase()}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0d121f] ${
                    statusColors[myProfile.status]
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-white truncate">
                    {myProfile.displayName}
                  </span>
                  {myProfile.badges?.includes('founder') && (
                    <span title="Основатель узла"><Award className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
                  )}
                  {myProfile.badges?.includes('nitro') && (
                    <span title="P2P Booster"><Zap className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" /></span>
                  )}
                  {myProfile.badges?.includes('e2ee') && (
                    <span title="E2EE Защита"><Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" /></span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <span>{myProfile.customStatusEmoji}</span>
                  <span>{myProfile.customStatusText || `@${myProfile.username}`}</span>
                </div>
              </div>
            </div>

            {/* Status selector toggle & mobile close */}
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Изменить статус"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>

                {statusMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl ios-glass-card p-1.5 z-50 shadow-2xl border border-white/10">
                    {(['online', 'idle', 'dnd', 'offline'] as UserStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          onUpdateStatus(st);
                          setStatusMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-xl hover:bg-white/10 text-left text-slate-200 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full ${statusColors[st]}`} />
                        <span>{statusLabels[st]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {onCloseMobile && (
                <button
                  onClick={onCloseMobile}
                  className="md:hidden p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Закрыть меню"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

      {/* 2. iOS 26 Liquid Glass Mini-Widget Bar (from uploaded concept mockups) */}
      <div className="p-3 pb-2 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          {/* Weather & Atmosphere Glass Widget */}
          <div className="p-2.5 rounded-2xl ios-glass-card border border-white/20 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-sky-300 font-medium block truncate">Купертино</span>
              <span className="text-xs font-bold text-white block">23° Солнечно</span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-400/30 to-sky-400/30 flex items-center justify-center text-base shadow-inner">
              ☀️
            </div>
          </div>

          {/* Calendar & Mesh Security Glass Widget */}
          <div className="p-2.5 rounded-2xl ios-glass-card border border-white/20 flex items-center justify-between shadow-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-emerald-300 font-medium block truncate">Безопасность</span>
              <span className="text-xs font-bold text-white block truncate">E2EE 256-bit</span>
            </div>
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-400/30 to-teal-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Shield className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* App Library Style Frosted Glass Search Pill */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск диалогов по имени..."
            value={effectiveSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white/[0.08] backdrop-blur-2xl border border-white/[0.18] rounded-full text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/60 shadow-inner transition-all"
          />
          {effectiveSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Очистить поиск"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Connect toggle */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => setShowQuickConnect(!showQuickConnect)}
            className="text-[11px] text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showQuickConnect ? 'Скрыть код' : '+ Подключить по коду P2P'}</span>
          </button>
        </div>

        {showQuickConnect && (
          <div className="p-2.5 rounded-2xl ios-glass-card border border-sky-400/30 space-y-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={quickConnectInput}
                onChange={(e) => setQuickConnectInput(e.target.value)}
                placeholder="Вставьте код или ссылку друга..."
                className="flex-1 bg-black/40 border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={async () => {
                  if (!quickConnectInput.trim() || !onConnectToPeer) return;
                  setIsConnectingQuick(true);
                  setQuickConnectStatus('idle');
                  const clean = quickConnectInput.trim().replace(/^.*#connect=/, '').split('&')[0];
                  const ok = await onConnectToPeer(clean);
                  setIsConnectingQuick(false);
                  if (ok) {
                    setQuickConnectStatus('success');
                    setQuickConnectInput('');
                    setTimeout(() => {
                      setShowQuickConnect(false);
                      setQuickConnectStatus('idle');
                    }, 1200);
                  } else {
                    setQuickConnectStatus('error');
                  }
                }}
                disabled={isConnectingQuick || !quickConnectInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-md transition-all active:scale-95"
              >
                {isConnectingQuick ? '...' : 'Войти'}
              </button>
            </div>
            {quickConnectStatus === 'success' && (
              <p className="text-[10px] text-emerald-400 font-medium">✓ Успешно подключено к собеседнику!</p>
            )}
            {quickConnectStatus === 'error' && (
              <p className="text-[10px] text-rose-400">Ошибка соединения. Проверьте код друга.</p>
            )}
          </div>
        )}
      </div>

      {/* 3. Telegram Folders Tab Bar */}
      <div className="flex items-center gap-1 px-3 pb-2 overflow-x-auto text-xs no-scrollbar">
        {[
          { id: 'all', label: 'Все' },
          { id: 'direct', label: 'Личные' },
          { id: 'rooms', label: 'Комнаты' },
          { id: 'voice', label: 'Голосовые' },
          { id: 'saved', label: 'Избранное' },
        ].map((folder) => {
          const isActive = activeFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id as FolderTab)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {folder.label}
            </button>
          );
        })}
      </div>

      {/* 4. Chat List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1">
        {filteredChats.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            Нет активных диалогов в этой папке. Создайте комнату или подключитесь к другу!
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;
            return (
              <button
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-all ios-tap-press cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-sky-500/30 via-blue-500/25 to-indigo-500/20 border border-sky-400/40 text-white shadow-[0_8px_24px_rgba(14,165,233,0.25),inset_0_1px_1px_rgba(255,255,255,0.4)] backdrop-blur-2xl'
                    : 'hover:bg-white/[0.08] text-slate-300 border border-transparent hover:border-white/10'
                }`}
              >
                {/* Chat Avatar */}
                <div className="relative shrink-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-md border border-white/20"
                    style={{ background: chat.avatarColor || 'linear-gradient(135deg, #0284c7, #2563eb)' }}
                  >
                    {chat.isSavedMessages ? (
                      <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
                    ) : chat.isRoom ? (
                      <Hash className="w-5 h-5" />
                    ) : (
                      chat.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {!chat.isSavedMessages && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0c101c] shadow-[0_0_6px_#34d399]" />
                  )}
                </div>

                {/* Chat Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-semibold text-xs md:text-sm text-white truncate">
                        {highlightMatch(chat.name, effectiveSearch)}
                      </span>
                      {chat.isPinned && (
                        <Pin className="w-3 h-3 text-sky-400 rotate-45 shrink-0" />
                      )}
                    </div>
                    {chat.lastMessageTime && (
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-1">
                        {new Date(chat.lastMessageTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <p className="truncate text-[11px] leading-tight pr-2">
                      {chat.lastMessage || 'Начните диалог напрямую...'}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* 5. Quick Connect Bottom Actions */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-white/2">
        <button
          onClick={onOpenInvite}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-medium text-xs transition-all shadow-sm"
        >
          <LinkIcon className="w-4 h-4" />
          <span>Подключить друга (P2P Ссылка / QR)</span>
        </button>

        <button
          onClick={onCreateRoom}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Создать P2P Сервер / Комнату</span>
        </button>
      </div>
    </aside>
  </>
  );
};
