import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  ArrowRight,
  Download,
  Smile,
  CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface FriendWelcomeModalProps {
  isOpen: boolean;
  friendId: string;
  friendName?: string;
  onJoin: (displayName: string) => void;
  onOpenInstallGuide: () => void;
}

export const FriendWelcomeModal: React.FC<FriendWelcomeModalProps> = ({
  isOpen,
  friendId,
  friendName,
  onJoin,
  onOpenInstallGuide,
}) => {
  const [nameInput, setNameInput] = useState('');

  if (!isOpen) return null;

  const displayFriendName = friendName || `друг (${friendId.slice(0, 6)})`;

  const handleStart = () => {
    const finalName = nameInput.trim() || `Друг (${Math.random().toString(36).substring(2, 6)})`;
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
    });
    onJoin(finalName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl ios-glass-card border border-white/20 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        {/* Animated Icon */}
        <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_30px_rgba(56,189,248,0.4)] animate-bounce duration-1000">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Твой друг <span className="text-sky-400">{displayFriendName}</span> ждёт тебя!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            Прямое защищённое соединение на любом расстоянии (хоть 1000 км). Сообщения, фото и звонки со сквозным шифрованием (E2EE) без слежки и логов.
          </p>
        </div>

        {/* Badges */}
        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="font-semibold text-white">0 мс задержки</span>
            <span className="text-[10px] text-slate-400">Напрямую P2P</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white">Шифрование</span>
            <span className="text-[10px] text-slate-400">AES-256 E2EE</span>
          </div>

          <div className="p-2.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-sky-400" />
            <span className="font-semibold text-white">Без серверов</span>
            <span className="text-[10px] text-slate-400">0% потери пакетов</span>
          </div>
        </div>

        {/* User name input */}
        <div className="space-y-1.5 text-left">
          <label className="text-xs font-semibold text-slate-300 block">
            Как тебя зовут? (Имя для друга):
          </label>
          <div className="relative">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleStart()}
              placeholder="Например: Артём, Макс, Катя..."
              className="w-full bg-black/40 border border-white/15 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-colors shadow-inner"
              autoFocus
            />
          </div>
        </div>

        {/* Giant 1-Click Action Button */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleStart}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span>ВОЙТИ В ЧАТ И НАЧАТЬ ОБЩЕНИЕ</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenInstallGuide}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 border border-white/10"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Как установить как приложение на телефон или ПК?</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-400">
          ✨ Ничего скачивать не обязательно — можно общаться прямо в браузере!
        </p>
      </div>
    </div>
  );
};
