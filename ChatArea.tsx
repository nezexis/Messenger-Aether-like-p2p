import React, { useState, useRef, useEffect } from 'react';
import {
  Pin,
  X,
  Play,
  Pause,
  Download,
  FileText,
  Flame,
  Check,
  CheckCheck,
  Smile,
  Reply,
  Copy,
  Trash2,
  Hash,
  Volume2,
  Code,
  Sparkles,
  Zap,
  ShieldCheck,
  Send
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Chat, Message, UserProfile, WallpaperType } from '../types';

interface ChatAreaProps {
  chat: Chat | null;
  messages: Message[];
  myProfile: UserProfile;
  wallpaper: WallpaperType;
  bubbleRadius: number;
  onSendMessage: (text: string, options?: { isSecret?: boolean; selfDestructIn?: number; replyTo?: Message }) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onPinMessage: (messageId: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onSelectChannel?: (channelId: string) => void;
  replyingTo: Message | null;
  onSetReplyingTo: (msg: Message | null) => void;
  isPeerTyping: boolean;
  typingPeerName: string;
  onTranscribeVoice?: (msgId: string, dataUrl: string) => Promise<void>;
}

const QUICK_REACTIONS = ['🔥', '❤️', '👍', '🚀', '⚡', '😂', '💎', '🎉'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  chat,
  messages,
  myProfile,
  wallpaper,
  bubbleRadius,
  onSendMessage,
  onToggleReaction,
  onPinMessage,
  onDeleteMessage,
  onSelectChannel,
  onSetReplyingTo,
  isPeerTyping,
  typingPeerName,
  onTranscribeVoice,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeVoiceAudio, setActiveVoiceAudio] = useState<{ id: string; audio: HTMLAudioElement; isPlaying: boolean; speed: number; progress: number } | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (activeVoiceAudio) {
        activeVoiceAudio.audio.pause();
      }
    };
  }, [activeVoiceAudio]);

  const pinnedMessage = messages.find((m) => m.isPinned);

  const handleVoiceToggle = (msgId: string, dataUrl?: string) => {
    if (!dataUrl) return;

    if (activeVoiceAudio && activeVoiceAudio.id === msgId) {
      if (activeVoiceAudio.isPlaying) {
        activeVoiceAudio.audio.pause();
        setActiveVoiceAudio({ ...activeVoiceAudio, isPlaying: false });
      } else {
        activeVoiceAudio.audio.play();
        setActiveVoiceAudio({ ...activeVoiceAudio, isPlaying: true });
      }
      return;
    }

    if (activeVoiceAudio) {
      activeVoiceAudio.audio.pause();
    }

    const audio = new Audio(dataUrl);
    audio.playbackRate = 1.0;

    audio.ontimeupdate = () => {
      const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
      setActiveVoiceAudio((prev) => (prev && prev.id === msgId ? { ...prev, progress } : prev));
    };

    audio.onended = () => {
      setActiveVoiceAudio((prev) => (prev && prev.id === msgId ? { ...prev, isPlaying: false, progress: 0 } : prev));
    };

    audio.play();
    setActiveVoiceAudio({ id: msgId, audio, isPlaying: true, speed: 1.0, progress: 0 });
  };

  const handleSpeedChange = (msgId: string) => {
    if (!activeVoiceAudio || activeVoiceAudio.id !== msgId) return;
    const speeds = [1.0, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(activeVoiceAudio.speed) + 1) % speeds.length;
    const newSpeed = speeds[nextIdx];
    activeVoiceAudio.audio.playbackRate = newSpeed;
    setActiveVoiceAudio({ ...activeVoiceAudio, speed: newSpeed });
  };

  const handleTriggerReaction = (messageId: string, emoji: string, event?: React.MouseEvent) => {
    onToggleReaction(messageId, emoji);
    setActiveReactionMenu(null);

    // Confetti burst for reactions
    if (event) {
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      confetti({
        particleCount: 20,
        spread: 45,
        origin: {
          x: rect.x / window.innerWidth,
          y: rect.y / window.innerHeight,
        },
        scalar: 0.8,
      });
    }
  };

  const copyMessageText = (msg: Message) => {
    navigator.clipboard.writeText(msg.text);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const renderFormattedText = (text: string, msgId: string) => {
    if (!text) return null;

    // Check for spoiler: ||spoiler text||
    const spoilerRegex = /\|\|(.*?)\|\|/g;

    // If text contains code block
    if (text.includes('```')) {
      const parts = text.split('```');
      return (
        <div className="space-y-1.5 my-1">
          {parts.map((part, i) => {
            if (i % 2 === 1) {
              return (
                <div key={i} className="relative p-2.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-sky-300 overflow-x-auto shadow-inner">
                  <div className="flex items-center justify-between pb-1 mb-1 border-b border-white/10 text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Code className="w-3 h-3 text-sky-400" />
                      <span>Код / Данные</span>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(part.trim())}
                      className="hover:text-white transition-colors"
                      title="Скопировать код"
                    >
                      Копировать
                    </button>
                  </div>
                  <pre className="whitespace-pre-wrap">{part.trim()}</pre>
                </div>
              );
            }
            return <span key={i} className="whitespace-pre-wrap">{part}</span>;
          })}
        </div>
      );
    }

    // Parse simple inline markdown: ||spoiler||
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;

    text.replace(spoilerRegex, (match, p1, offset) => {
      if (offset > lastIndex) {
        elements.push(text.substring(lastIndex, offset));
      }
      const spoilerKey = `${msgId}_${offset}`;
      const isRevealed = revealedSpoilers[spoilerKey];
      elements.push(
        <span
          key={spoilerKey}
          onClick={() => setRevealedSpoilers({ ...revealedSpoilers, [spoilerKey]: true })}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all ${
            isRevealed
              ? 'bg-white/10 text-white'
              : 'bg-white/20 text-transparent select-none blur-xs hover:bg-white/30'
          }`}
          title={isRevealed ? '' : 'Нажмите, чтобы открыть скрытый спойлер'}
        >
          {p1}
        </span>
      );
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < text.length) {
      elements.push(text.substring(lastIndex));
    }

    return (
      <span className="whitespace-pre-wrap break-words leading-relaxed text-sm">
        {elements.length > 0 ? elements : text}
      </span>
    );
  };

  return (
    <div className={`flex-1 flex flex-col h-full relative overflow-hidden wallpaper-${wallpaper}`}>
      {/* 1. Discord-Style Channels Header (If Room with Channels) */}
      {chat?.channels && chat.channels.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-black/30 backdrop-blur-md z-10 overflow-x-auto no-scrollbar">
          <span className="text-xs text-slate-400 font-medium mr-1">Каналы:</span>
          {chat.channels.map((chan) => {
            const isActive = chan.id === chat.activeChannelId;
            return (
              <button
                key={chan.id}
                onClick={() => onSelectChannel?.(chan.id)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {chan.type === 'voice' ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <Hash className="w-3.5 h-3.5" />}
                <span>{chan.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 2. Pinned Message Bar (iOS Liquid Glass Style) */}
      {pinnedMessage && (
        <div className="flex items-center justify-between mx-4 my-2 px-4 py-2.5 rounded-2xl ios-glass-card border border-white/20 z-10 text-xs shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-sky-400 to-blue-500 shrink-0 shadow-[0_0_8px_#38bdf8]" />
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-sky-400">
                <Pin className="w-3 h-3 rotate-45" />
                <span>Закрепленное сообщение</span>
              </div>
              <p className="text-slate-200 truncate text-[11px]">
                {pinnedMessage.text || 'Медиафайл'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onPinMessage(pinnedMessage.id)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Открепить"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-purple-500/20 border border-white/15 flex items-center justify-center mb-4 shadow-xl">
              <Sparkles className="w-8 h-8 text-sky-400" />
            </div>
            <h3 className="font-bold text-white text-base mb-1 tracking-tight">
              {chat?.isAI ? 'Gemini AI Ассистент готов к диалогу' : 'Прямой защищенный P2P канал готов'}
            </h3>
            <p className="text-xs max-w-sm text-slate-400 leading-relaxed mb-6">
              {chat?.isAI
                ? 'Задавайте любые вопросы, ищите информацию в Google или просите написать код, текст или перевод.'
                : 'Сообщения передаются напрямую от устройства к устройству по WebRTC DataChannel с шифрованием AES-256-GCM.'}
            </p>

            {/* Action Prompts based on chat type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full text-xs">
              {chat?.isAI ? (
                <>
                  <button
                    onClick={() => onSendMessage('🔍 Какие главные новости в мире технологий на этой неделе?')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <span className="text-lg">🔍</span>
                    <span className="truncate">Свежие новости технологий</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('⚡ Напиши краткое объяснение, как работает WebRTC P2P')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Как устроен WebRTC</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('🔒 Как работает сквозное E2EE шифрование?')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Принципы E2EE</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('💡 Предложи 5 идей для полезных функций мессенджера')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <span className="text-lg">💡</span>
                    <span className="truncate">Идеи для мессенджера</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSendMessage('👋 Привет! Прямой P2P контакт успешно установлен.')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <span className="text-lg">👋</span>
                    <span className="truncate">Отправить приветствие</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('⚡ Тест скорости: пакет доставлен по надежному каналу SCTP с 0% потерь!')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Проверить доставку</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('🔒 Проверка E2EE: шифрование активно, логи на серверах отсутствуют.')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">Статус безопасности</span>
                  </button>

                  <button
                    onClick={() => onSendMessage('||Этот текст скрыт спойлером|| Нажмите, чтобы прочесть!')}
                    className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white transition-all text-left flex items-center gap-2.5 ios-tap-press cursor-pointer"
                  >
                    <span className="text-lg">🤫</span>
                    <span className="truncate">Отправить спойлер</span>
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === myProfile.id || msg.senderId === 'self';
            const isSecret = msg.isSecret;
            const voiceAttachment = msg.attachments?.find((a) => a.type.startsWith('audio'));
            const imageAttachment = msg.attachments?.find((a) => a.type.startsWith('image'));
            const fileAttachment = msg.attachments?.find((a) => !a.type.startsWith('audio') && !a.type.startsWith('image'));

            return (
              <div
                key={msg.id}
                className={`group relative flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-opacity animate-in fade-in slide-in-from-bottom-2 duration-200`}
              >
                {/* Message Bubble Container with Authentic iOS Liquid Glass */}
                <div
                  className={`relative max-w-[85%] md:max-w-[70%] p-3.5 transition-all ${
                    isMe
                      ? 'ios-glass-bubble-outgoing text-white'
                      : 'ios-glass-bubble-incoming text-slate-100'
                  }`}
                  style={{ borderRadius: `${bubbleRadius}px` }}
                >
                  {/* Sender Name & Badges for Group / Inbound */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.isAI ? (
                        <>
                          <span className="font-semibold text-xs text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            <span>{msg.senderName}</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            AI
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold text-xs text-sky-400">
                          {msg.senderName}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reply Quote Banner */}
                  {msg.replyTo && (
                    <div className="mb-2 p-2 rounded-xl bg-black/30 border-l-2 border-sky-400 text-xs">
                      <span className="font-semibold text-sky-300 block text-[11px]">
                        {msg.replyTo.senderName}
                      </span>
                      <p className="text-slate-300 text-[11px] truncate">
                        {msg.replyTo.text}
                      </p>
                    </div>
                  )}

                  {/* Secret Chat Flame Icon */}
                  {isSecret && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-300 mb-1 font-medium">
                      <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                      <span>Секретное сообщение (исчезнет через {msg.selfDestructIn || 30}с)</span>
                    </div>
                  )}

                  {/* Image Attachment with Lightbox Trigger */}
                  {imageAttachment && imageAttachment.dataUrl && (
                    <div
                      onClick={() => setLightboxImage({ url: imageAttachment.dataUrl!, name: imageAttachment.name })}
                      className="mb-2 rounded-2xl overflow-hidden border border-white/10 max-h-80 cursor-pointer group/img relative"
                    >
                      <img
                        src={imageAttachment.dataUrl}
                        alt={imageAttachment.name}
                        className="w-full h-auto object-cover group-hover/img:scale-[1.02] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                        Нажмите для просмотра
                      </div>
                    </div>
                  )}

                  {/* Voice Note Player (Telegram Waveform Style) */}
                  {voiceAttachment && (
                    <div className="space-y-2 py-1 min-w-[210px] sm:min-w-[250px]">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleVoiceToggle(msg.id, voiceAttachment.dataUrl)}
                          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/20 hover:bg-white/30 text-white shrink-0 transition-all ios-tap-press shadow-sm"
                        >
                          {activeVoiceAudio?.id === msg.id && activeVoiceAudio.isPlaying ? (
                            <Pause className="w-4 h-4 fill-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          )}
                        </button>

                        {/* Waveform Canvas Simulation */}
                        <div className="flex-1 flex flex-col justify-center gap-1">
                          <div className="flex items-center gap-0.5 h-7">
                            {(voiceAttachment.waveform || Array.from({ length: 28 }, (_, i) => Math.sin(i * 0.4) * 0.4 + 0.5)).map((height, i) => {
                              const isPlayed = activeVoiceAudio?.id === msg.id && (i / 28) * 100 <= (activeVoiceAudio.progress || 0);
                              return (
                                <div
                                  key={i}
                                  className={`w-1 rounded-full transition-all duration-75 ${
                                    isPlayed ? 'bg-white shadow-[0_0_4px_white]' : 'bg-white/40'
                                  }`}
                                  style={{ height: `${Math.max(18, Math.round(height * 100))}%` }}
                                />
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-white/70 font-mono">
                            <span>{voiceAttachment.duration ? `${Math.floor(voiceAttachment.duration)}с` : '0:06'}</span>
                            <button
                              onClick={() => handleSpeedChange(msg.id)}
                              className="px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors font-bold cursor-pointer"
                            >
                              {activeVoiceAudio?.id === msg.id ? `${activeVoiceAudio.speed}x` : '1x'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Gemini Voice Transcription Display or Trigger */}
                      {msg.transcription ? (
                        <div className="p-2 rounded-xl bg-black/30 border border-white/10 text-slate-200 text-xs">
                          <span className="text-[10px] text-sky-400 font-semibold block mb-0.5 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-sky-400" />
                            <span>Расшифровка Gemini:</span>
                          </span>
                          <p className="italic leading-relaxed">{msg.transcription}</p>
                        </div>
                      ) : onTranscribeVoice && voiceAttachment.dataUrl ? (
                        <button
                          onClick={() => onTranscribeVoice(msg.id, voiceAttachment.dataUrl!)}
                          className="flex items-center gap-1.5 text-[11px] text-sky-300 hover:text-white bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-xl transition-all cursor-pointer border border-white/5"
                        >
                          <Sparkles className="w-3 h-3 text-sky-400" />
                          <span>Расшифровать в текст (Gemini)</span>
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* File Attachment */}
                  {fileAttachment && (
                    <div className="flex items-center justify-between gap-3 p-2.5 mb-2 rounded-xl bg-black/25 border border-white/10">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs truncate text-white">{fileAttachment.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(fileAttachment.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      {fileAttachment.dataUrl && (
                        <a
                          href={fileAttachment.dataUrl}
                          download={fileAttachment.name}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                          title="Скачать файл"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}

                  {/* Message Body Text */}
                  {msg.text && renderFormattedText(msg.text, msg.id)}

                  {/* Google Search Grounding Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 text-[11px]">
                      <span className="text-[10px] text-sky-300 font-semibold block mb-1 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span>Источники поиска Google:</span>
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] text-sky-200 truncate max-w-[220px]"
                            title={src}
                          >
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timestamp & Status Checkmarks */}
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/60">
                    {msg.isEdited && <span className="text-[9px]">изм.</span>}
                    <span className="font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <span className="ml-0.5">
                        {msg.status === 'read' || msg.status === 'delivered' ? (
                          <CheckCheck className="w-3.5 h-3.5 text-sky-200 inline" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-white/70 inline" />
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reactions Display */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1 px-1">
                    {Object.entries(msg.reactions).map(([emoji, users]) => {
                      if (!users || users.length === 0) return null;
                      const hasReacted = users.includes(myProfile.id);
                      return (
                        <button
                          key={emoji}
                          onClick={(e) => handleTriggerReaction(msg.id, emoji, e)}
                          className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs transition-all ios-tap-press ${
                            hasReacted
                              ? 'bg-sky-500/25 border border-sky-400/40 text-white'
                              : 'bg-white/10 border border-white/10 text-slate-300 hover:bg-white/20'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-bold">{users.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Hover Quick Action Menu */}
                <div
                  className={`absolute ${
                    isMe ? 'right-0 -top-8' : 'left-0 -top-8'
                  } hidden group-hover:flex items-center gap-1 p-1 rounded-xl ios-glass-card shadow-xl z-20`}
                >
                  <button
                    onClick={() => setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)}
                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    title="Добавить реакцию"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSetReplyingTo(msg)}
                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    title="Ответить"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onPinMessage(msg.id)}
                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    title="Закрепить"
                  >
                    <Pin className="w-3.5 h-3.5 rotate-45" />
                  </button>

                  <button
                    onClick={() => copyMessageText(msg)}
                    className="p-1 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
                    title="Скопировать"
                  >
                    {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Reaction Picker Popover */}
                {activeReactionMenu === msg.id && (
                  <div
                    className={`absolute ${
                      isMe ? 'right-0 -top-16' : 'left-0 -top-16'
                    } flex items-center gap-1.5 p-1.5 rounded-2xl ios-glass-card shadow-2xl z-30 border border-white/15 animate-in zoom-in-95 duration-150`}
                  >
                    {QUICK_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={(e) => handleTriggerReaction(msg.id, emoji, e)}
                        className="text-lg hover:scale-130 transition-transform p-1 rounded-lg hover:bg-white/15"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Real-time Peer Typing Indicator */}
      {isPeerTyping && (
        <div className="px-5 py-1.5 text-xs text-slate-400 flex items-center gap-2 bg-black/30 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="italic">{typingPeerName || 'Собеседник'} печатает...</span>
        </div>
      )}

      {/* 5. Apple-Style Fullscreen Image Lightbox Modal */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <a
              href={lightboxImage.url}
              download={lightboxImage.name}
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Скачать фото"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <img
            src={lightboxImage.url}
            alt={lightboxImage.name}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[92vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
          />
          <span className="text-xs text-slate-400 mt-3 font-medium">
            {lightboxImage.name}
          </span>
        </div>
      )}
    </div>
  );
};
