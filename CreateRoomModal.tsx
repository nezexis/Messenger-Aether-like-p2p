import React, { useState } from 'react';
import { X, Hash, Volume2, Plus, Users, Sparkles } from 'lucide-react';
import { Channel, Chat } from '../types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (newChat: Chat) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
}) => {
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<'room' | 'direct'>('room');
  const [directPeerId, setDirectPeerId] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (roomType === 'room') {
      if (!roomName.trim()) return;
      const defaultChannels: Channel[] = [
        { id: 'chan_general', name: 'general', type: 'text', description: 'Основной текстовый канал' },
        { id: 'chan_media', name: 'media-share', type: 'text', description: 'Фото и файлы без потерь' },
        { id: 'chan_voice', name: 'Voice Lounge', type: 'voice', description: 'Discord голосовой канал' },
      ];

      const newChat: Chat = {
        id: 'room_' + Math.random().toString(36).substring(2, 9),
        name: roomName.trim(),
        isRoom: true,
        avatarColor: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
        lastMessage: 'Комната создана. Пригласите участников!',
        lastMessageTime: Date.now(),
        unreadCount: 0,
        channels: defaultChannels,
        activeChannelId: 'chan_general',
        encryptionFingerprint: '🛡️ ⚡ 💎 🚀',
      };
      onCreateRoom(newChat);
      onClose();
    } else {
      if (!directPeerId.trim()) return;
      const cleanId = directPeerId.trim().replace(/^.*#connect=/, '');
      const newChat: Chat = {
        id: cleanId,
        name: `Собеседник (${cleanId.slice(0, 8)})`,
        isRoom: false,
        peerId: cleanId,
        avatarColor: '#0ea5e9',
        lastMessage: 'Прямой P2P чат готов',
        lastMessageTime: Date.now(),
        unreadCount: 0,
        encryptionFingerprint: '🐱 🦊 🚀 🛡️',
      };
      onCreateRoom(newChat);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-3xl ios-glass-card border border-white/15 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Новый диалог или комната</h3>
              <p className="text-xs text-slate-400">Создайте Discord-сервер или прямой P2P чат</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Type Toggle Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
          <button
            onClick={() => setRoomType('room')}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              roomType === 'room'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            P2P Сервер / Комната
          </button>
          <button
            onClick={() => setRoomType('direct')}
            className={`py-2 rounded-xl text-xs font-semibold transition-all ${
              roomType === 'direct'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Прямой 1-на-1 чат
          </button>
        </div>

        {roomType === 'room' ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Название комнаты:</label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Например: Cyber Lounge, Проект X, Игровая..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <span className="text-[11px] font-semibold text-slate-300 block">
                Будут автоматически созданы Discord-каналы:
              </span>
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-sky-400" />
                  <span>#general — Основной текстовый чат</span>
                </div>
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-sky-400" />
                  <span>#media-share — Передача фото и файлов</span>
                </div>
                <div className="flex items-center gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>🔊 Voice Lounge — Голосовой Discord-канал</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">P2P ID собеседника:</label>
              <input
                type="text"
                value={directPeerId}
                onChange={(e) => setDirectPeerId(e.target.value)}
                placeholder="Вставьте p2p_xxxx или ссылку друга"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Диалог будет связан напрямую с устройством собеседника через защищенный DataChannel.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white"
          >
            Отмена
          </button>
          <button
            onClick={handleCreate}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-sky-500 hover:bg-sky-400 text-white shadow-md transition-colors"
          >
            Создать
          </button>
        </div>
      </div>
    </div>
  );
};
