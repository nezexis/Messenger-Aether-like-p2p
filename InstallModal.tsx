import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  Smartphone,
  Laptop,
  Zap,
  Globe,
  ArrowRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any; // BeforeInstallPromptEvent
}

type DeviceTab = 'ios' | 'android' | 'pc' | 'instant';

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<DeviceTab>('ios');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      setActiveTab('ios');
    } else if (/android/.test(ua)) {
      setActiveTab('android');
    } else {
      setActiveTab('pc');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        confetti({ particleCount: 40, spread: 60 });
        setTimeout(onClose, 2000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-2xl animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl ios-glass-card border border-white/20 p-5 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Простой установщик мессенджера
              </h3>
              <p className="text-xs text-slate-400">
                Установка за 5 секунд без App Store и Google Play
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Device Switcher Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10 text-xs font-semibold text-center">
          <button
            onClick={() => setActiveTab('ios')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeTab === 'ios'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🍎 iPhone
          </button>

          <button
            onClick={() => setActiveTab('android')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeTab === 'android'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🤖 Android
          </button>

          <button
            onClick={() => setActiveTab('pc')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeTab === 'pc'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            💻 Компьютер
          </button>

          <button
            onClick={() => setActiveTab('instant')}
            className={`py-2 px-1 rounded-xl transition-all ${
              activeTab === 'instant'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            ⚡ Без установки
          </button>
        </div>

        {/* Tab 1: iPhone / iPad */}
        {activeTab === 'ios' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-sky-400 shrink-0" />
              <span>На iPhone это устанавливается через Safari за 3 простых клика:</span>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-2xl bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm shrink-0 border border-sky-500/30">
                  1
                </span>
                <div className="text-xs">
                  <span className="text-white font-semibold block text-sm mb-0.5">Нажми внизу значок «Поделиться»</span>
                  <span className="text-slate-400">Это квадрат со стрелочкой вверх (<Share className="w-3.5 h-3.5 inline text-sky-400" />) в нижней панели Safari</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-2xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm shrink-0 border border-indigo-500/30">
                  2
                </span>
                <div className="text-xs">
                  <span className="text-white font-semibold block text-sm mb-0.5">Выбери «На экран "Домой"»</span>
                  <span className="text-slate-400">Прокрути чуть вниз меню и нажми на строчку с плюсиком (<PlusSquare className="w-3.5 h-3.5 inline text-sky-400" />)</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3.5">
                <span className="w-8 h-8 rounded-2xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm shrink-0 border border-emerald-500/30">
                  3
                </span>
                <div className="text-xs">
                  <span className="text-white font-semibold block text-sm mb-0.5">Вверху справа нажми «Добавить»</span>
                  <span className="text-slate-400">Иконка Aether P2P появится на твоем рабочем столе рядом с Telegram!</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Android */}
        {activeTab === 'android' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {installed ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Приложение успешно установлено на телефон!</span>
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>НАЖМИ СЮДА, ЧТОБЫ УСТАНОВИТЬ В 1 КЛИК</span>
                </button>
                <p className="text-[11px] text-slate-400 text-center">
                  Мессенджер добавится в меню приложений как обычная программа.
                </p>
              </div>
            ) : (
              <div className="space-y-3 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
                <span className="font-semibold text-white block text-sm mb-1">
                  Установка через браузер Chrome на Android:
                </span>
                <ol className="space-y-2 list-decimal list-inside text-slate-300">
                  <li>Нажмите на три точки <span className="text-white font-bold">(⋮)</span> в правом верхнем углу браузера.</li>
                  <li>Выберите пункт <span className="text-emerald-400 font-semibold">«Установить приложение»</span> или «Добавить на главный экран».</li>
                  <li>Подтвердите — иконка появится на экране!</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: PC / Mac */}
        {activeTab === 'pc' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {installed ? (
              <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                <span>Приложение установлено на компьютер!</span>
              </div>
            ) : deferredPrompt ? (
              <div className="space-y-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>СКАЧАТЬ НА РАБОЧИЙ СТОЛ (1 КЛИК)</span>
                </button>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-xs text-slate-300">
                <span className="font-semibold text-white block text-sm">В браузере на компьютере (Chrome / Edge / Opera):</span>
                <p className="leading-relaxed">
                  Посмотрите в правую часть адресной строки браузера — там есть значок <span className="text-sky-400 font-semibold">[⤓ Установить приложение]</span>. Нажмите его, и мессенджер откроется в отдельном ультра-быстром окне!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Instant / Without installing */}
        {activeTab === 'instant' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                <Zap className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>ВАМ ВООБЩЕ НЕ НУЖНО НИЧЕГО УСТАНАВЛИВАТЬ!</span>
              </div>
              <p>
                Aether P2P — это прогрессивное веб-приложение. Вы <strong>УЖЕ НАХОДИТЕСЬ ВНУТРИ МЕССЕНДЖЕРА</strong> прямо сейчас в браузере!
              </p>
              <p>
                Все функции (текст, голосовые, видеозвонки, саундборд, файлы) уже на 100% работают без скачивания файлов и без установки.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <span>ОТЛИЧНО, ЗАКРЫТЬ И ОБЩАТЬСЯ!</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>0% серверов · Полная приватность</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
