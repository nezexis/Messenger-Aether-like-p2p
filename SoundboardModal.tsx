import React, { useEffect } from 'react';
import { X, Volume2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { audioService } from '../services/audio';

interface SoundboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSoundboardEvent: (soundId: string) => void;
}

const SOUNDS = [
  { id: 'airhorn', name: 'Горн стадиона', emoji: '📢', key: '1', desc: 'Classic Airhorn Fanfare' },
  { id: 'quack', name: 'Кряканье утки', emoji: '🦆', key: '2', desc: 'Discord Quack' },
  { id: 'level_up', name: 'Level Up!', emoji: '⭐', key: '3', desc: 'Arcade 8-Bit Victory' },
  { id: 'badum_tss', name: 'Ба-дум-тсс!', emoji: '🥁', key: '4', desc: 'Comedy Drum Rimshot' },
  { id: 'laser', name: 'Лазерный залп', emoji: '🔫', key: '5', desc: 'Sci-Fi Laser Blaster' },
  { id: 'cyber_chime', name: 'Кибер перезвон', emoji: '🔮', key: '6', desc: 'iOS 26.3 Crystal Chime' },
  { id: 'discord_ping', name: 'Discord Пинг', emoji: '🔔', key: '7', desc: 'Classic @everyone tone' },
];

export const SoundboardModal: React.FC<SoundboardModalProps> = ({
  isOpen,
  onClose,
  onSendSoundboardEvent,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const sound = SOUNDS.find((s) => s.key === e.key);
      if (sound) {
        triggerSound(sound.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerSound = (soundId: string, event?: React.MouseEvent) => {
    audioService.playSoundboard(soundId);
    onSendSoundboardEvent(soundId);

    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      confetti({
        particleCount: 15,
        spread: 35,
        origin: {
          x: rect.x / window.innerWidth,
          y: rect.y / window.innerHeight,
        },
        scalar: 0.7,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl ios-glass-card border border-white/15 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-1.5">
                <span>Discord Саундборд</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Звуковые эффекты воспроизводятся синхронно у вас и собеседника по P2P
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sound buttons grid */}
        <div className="grid grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {SOUNDS.map((sound) => (
            <button
              key={sound.id}
              onClick={(e) => triggerSound(sound.id, e)}
              className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/12 border border-white/10 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
            >
              <span className="text-2xl group-hover:scale-115 transition-transform shrink-0">
                {sound.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-white truncate">
                    {sound.name}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-white/10 shrink-0 ml-1">
                    {sound.key}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 truncate block">
                  {sound.desc}
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span>Подсказка: нажимайте цифры <span className="text-sky-400 font-mono">1–7</span> на клавиатуре</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
