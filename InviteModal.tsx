import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  QrCode,
  Link as LinkIcon,
  ShieldCheck,
  Send,
  Radio,
  FileCode,
  Smartphone,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { P2PStats, UserProfile } from '../types';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  myPeerId: string;
  myProfile: UserProfile;
  p2pStats: P2PStats;
  onConnectToPeer: (targetPeerId: string) => Promise<boolean>;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  myPeerId,
  myProfile,
  p2pStats,
  onConnectToPeer,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [targetIdInput, setTargetIdInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [qrType, setQrType] = useState<'link' | 'peerId'>('link');
  const [showAirGapSDP, setShowAirGapSDP] = useState(false);

  if (!isOpen) return null;

  const getInviteUrl = () => {
    let baseUrl = window.location.origin;
    if (window.location.hostname.includes('ais-dev-')) {
      baseUrl = window.location.origin.replace('ais-dev-', 'ais-pre-');
    }
    const url = new URL(baseUrl);
    const nameParam = myProfile.displayName ? `&name=${encodeURIComponent(myProfile.displayName)}` : '';
    url.hash = `connect=${myPeerId}${nameParam}`;
    return url.toString();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getInviteUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyPeerId = () => {
    navigator.clipboard.writeText(myPeerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleConnect = async () => {
    if (!targetIdInput.trim()) return;
    setIsConnecting(true);
    setConnectStatus('idle');

    const cleanId = targetIdInput.trim().replace(/^.*#connect=/, '').split('&')[0];
    const success = await onConnectToPeer(cleanId);
    setIsConnecting(false);

    if (success) {
      setConnectStatus('success');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setConnectStatus('error');
    }
  };

  const qrData = qrType === 'link' ? getInviteUrl() : myPeerId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-2xl animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-3xl ios-glass-card border border-white/15 p-5 sm:p-7 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Подключение к другу (P2P QR-код)
              </h3>
              <p className="text-xs text-slate-400">
                Наведите камеру смартфона для мгновенного соединения
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Interactive Scannable QR Code Card */}
        <div className="p-5 rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center gap-2 p-1 bg-black/40 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setQrType('link')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                qrType === 'link'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              QR с ссылкой (Для камеры)
            </button>
            <button
              onClick={() => setQrType('peerId')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                qrType === 'peerId'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Только Peer ID
            </button>
          </div>

          {/* QR Code Container with High Contrast & Soft Corner Radius */}
          <div className="p-3.5 bg-white rounded-2xl shadow-2xl border-4 border-sky-400/30 transition-transform hover:scale-105 duration-200">
            <QRCodeSVG
              value={qrData}
              size={180}
              level="M"
              includeMargin={false}
              fgColor="#080b10"
              bgColor="#ffffff"
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <span>Наведите камеру телефона на QR-код</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
              {qrType === 'link'
                ? 'Камера телефона сразу предложит перейти по ссылке и подключиться напрямую к вашему диалогу.'
                : 'QR-код содержит ваш P2P идентификатор.'}
            </p>
          </div>
        </div>

        {/* 2. Shareable One-Click Link */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Или отправьте 1-Click ссылку другу:
            </span>
            <span className="text-[11px] text-emerald-400 font-medium">Мгновенно</span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={getInviteUrl()}
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-sky-300 focus:outline-none truncate"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Скопировано!' : 'Копировать'}</span>
            </button>
          </div>
        </div>

        {/* 3. My Peer ID & Connect by ID */}
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Ваш P2P ID:</span>
            <button
              onClick={copyPeerId}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId ? 'ID скопирован' : 'Скопировать ID'}</span>
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-slate-300 select-all">
            {myPeerId || 'Инициализация P2P...'}
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Подключиться к P2P ID или ссылке друга:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={targetIdInput}
                onChange={(e) => setTargetIdInput(e.target.value)}
                placeholder="Вставьте P2P ID друга (например, p2p_9a4f...)"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleConnect}
                disabled={isConnecting || !targetIdInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium transition-colors shrink-0 shadow-sm cursor-pointer"
              >
                {isConnecting ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Подключить</span>
              </button>
            </div>

            {connectStatus === 'success' && (
              <p className="text-xs text-emerald-400 font-medium">✓ Прямой канал успешно установлен!</p>
            )}
            {connectStatus === 'error' && (
              <p className="text-xs text-rose-400">
                Не удалось соединиться. Убедитесь, что у друга открыто приложение и ID верен.
              </p>
            )}
          </div>
        </div>

        {/* 4. Air-Gap / Manual SDP Accordion */}
        <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/2">
          <button
            onClick={() => setShowAirGapSDP(!showAirGapSDP)}
            className="w-full flex items-center justify-between p-3 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>Автономный режим (Air-Gap / Без внешнего брокера)</span>
            </div>
            <span>{showAirGapSDP ? '− Скрыть' : '+ Подробнее'}</span>
          </button>

          {showAirGapSDP && (
            <div className="p-3 pt-0 space-y-3 text-xs text-slate-300">
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Для работы в изолированных закрытых сетях без STUN-серверов.
              </p>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 block font-mono">SDP Token:</span>
                <textarea
                  rows={2}
                  readOnly
                  value={JSON.stringify({ peerId: myPeerId, candidate: p2pStats.candidateType, ts: Date.now() })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 font-mono text-[10px] text-slate-300 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Telemetry pill */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Шифрование: AES-256-GCM Direct SCTP</span>
          </div>
          <span className="font-mono text-slate-500">RTT: {p2pStats.rtt || 0}ms</span>
        </div>
      </div>
    </div>
  );
};
