import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Smile,
  Mic,
  Send,
  Flame,
  X,
  Trash2,
  Square
} from 'lucide-react';
import { Attachment, Message } from '../types';

interface MessageInputProps {
  onSendMessage: (
    text: string,
    attachments?: Attachment[],
    options?: { isSecret?: boolean; selfDestructIn?: number; replyTo?: Message }
  ) => void;
  onSendTyping: () => void;
  replyingTo: Message | null;
  onCancelReply: () => void;
  defaultDestructTimer: number;
}

const EMOJI_PALETTE = [
  '😀', '😂', '🥹', '😍', '😎', '🥳', '🤔', '🤫', '🫡', '🤯',
  '🔥', '❤️', '👍', '👎', '🚀', '⚡', '✨', '💎', '🎉', '🏆',
  '💯', '👀', '🦾', '👾', '🕹️', '🛡️', '🔑', '☕', '🍕', '🍻'
];

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendTyping,
  replyingTo,
  onCancelReply,
  defaultDestructTimer,
}) => {
  const [text, setText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [isSecret, setIsSecret] = useState(false);
  const [selfDestructIn, setSelfDestructIn] = useState<number>(defaultDestructTimer || 0);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const waveformPeaksRef = useRef<number[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onSendTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() && pendingAttachments.length === 0) return;

    onSendMessage(text.trim(), pendingAttachments.length > 0 ? pendingAttachments : undefined, {
      isSecret,
      selfDestructIn: isSecret ? (selfDestructIn || 15) : undefined,
      replyTo: replyingTo || undefined,
    });

    setText('');
    setPendingAttachments([]);
    if (replyingTo) onCancelReply();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // --- File attachment handler ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: Attachment = {
          id: 'att_' + Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          dataUrl,
        };
        setPendingAttachments((prev) => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removeAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // --- Voice Message Recording with Live Waveform ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      waveformPeaksRef.current = [];

      // Setup audio analyzer for waveform
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Canvas waveform drawing
      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length / 255;
        if (waveformPeaksRef.current.length < 32) {
          waveformPeaksRef.current.push(Math.max(0.1, avg));
        }

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          const barWidth = 3;
          const gap = 2;
          const totalBars = Math.floor(canvasRef.current.width / (barWidth + gap));
          ctx.fillStyle = '#38bdf8';

          for (let i = 0; i < totalBars; i++) {
            const val = dataArray[i % dataArray.length] / 255;
            const h = Math.max(4, val * canvasRef.current.height);
            const x = i * (barWidth + gap);
            const y = (canvasRef.current.height - h) / 2;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, h, 2);
            ctx.fill();
          }
        }
        animFrameRef.current = requestAnimationFrame(draw);
      };

      animFrameRef.current = requestAnimationFrame(draw);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // Microphone access denied or unavailable
    }
  };

  const stopAndSendRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const voiceAttachment: Attachment = {
          id: 'voice_' + Math.random().toString(36).substring(2, 9),
          name: `Голосовое сообщение (${recordingSeconds}с)`,
          size: audioBlob.size,
          type: 'audio/webm',
          dataUrl,
          duration: Math.max(1, recordingSeconds),
          waveform: waveformPeaksRef.current.length > 0 ? waveformPeaksRef.current : undefined,
        };

        onSendMessage('', [voiceAttachment], {
          isSecret,
          selfDestructIn: isSecret ? (selfDestructIn || 15) : undefined,
          replyTo: replyingTo || undefined,
        });

        setIsRecording(false);
        setRecordingSeconds(0);
        if (replyingTo) onCancelReply();
      };
      reader.readAsDataURL(audioBlob);
    };

    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  return (
    <div className="p-3 z-20 shrink-0 select-none">
      {/* 1. Reply to message banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2.5 mb-2 rounded-2xl ios-glass-card border border-white/20 text-xs shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-sky-400 to-blue-500 shadow-[0_0_8px_#38bdf8]" />
            <div className="min-w-0">
              <span className="font-semibold text-sky-400 block text-[11px]">
                Ответ {replyingTo.senderName}
              </span>
              <p className="text-slate-200 truncate text-[11px]">{replyingTo.text}</p>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Pending file attachments preview */}
      {pendingAttachments.length > 0 && (
        <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className="relative flex items-center gap-2 p-2 rounded-xl ios-glass-card border border-white/20 text-xs shrink-0 max-w-[200px]"
            >
              <span className="truncate text-slate-200">{att.name}</span>
              <button
                onClick={() => removeAttachment(att.id)}
                className="p-0.5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 3. Main Floating iOS Liquid Glass Dock */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-[28px] ios-glass-dock border border-sky-400/40 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span className="font-mono text-xs text-rose-400 font-bold shrink-0">
              {Math.floor(recordingSeconds / 60)}:
              {String(recordingSeconds % 60).padStart(2, '0')}
            </span>
            <canvas ref={canvasRef} width={140} height={26} className="rounded-lg" />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition-colors cursor-pointer"
              title="Отменить запись"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={stopAndSendRecording}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title="Отправить голосовое сообщение"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Отправить</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-2 p-2 rounded-[28px] ios-glass-dock border border-white/25 shadow-2xl">
          {/* File Attach Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full ios-glass-btn text-slate-300 hover:text-white shrink-0 cursor-pointer"
            title="Прикрепить фото, видео или файл"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Secret Chat / Auto-destruct Toggle */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                if (!isSecret) {
                  setIsSecret(true);
                  setSelfDestructIn(15);
                } else {
                  setTimerMenuOpen(!timerMenuOpen);
                }
              }}
              className={`p-2.5 rounded-full transition-all cursor-pointer ${
                isSecret
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'ios-glass-btn text-slate-300 hover:text-white'
              }`}
              title="Самоуничтожающееся секретное сообщение"
            >
              <Flame className="w-5 h-5" />
            </button>

            {timerMenuOpen && (
              <div className="absolute left-0 bottom-full mb-2 w-48 rounded-2xl ios-glass-card p-1.5 z-50 shadow-2xl border border-white/20">
                <span className="text-[10px] font-semibold text-slate-400 px-2 py-1 block">
                  Таймер самоуничтожения:
                </span>
                {[
                  { sec: 0, label: 'Отключено' },
                  { sec: 5, label: '5 секунд' },
                  { sec: 15, label: '15 секунд' },
                  { sec: 30, label: '30 секунд' },
                  { sec: 60, label: '1 минута' },
                  { sec: 3600, label: '1 час' },
                ].map((item) => (
                  <button
                    key={item.sec}
                    onClick={() => {
                      if (item.sec === 0) {
                        setIsSecret(false);
                      } else {
                        setIsSecret(true);
                        setSelfDestructIn(item.sec);
                      }
                      setTimerMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                      selfDestructIn === item.sec && isSecret
                        ? 'bg-amber-500/20 text-amber-300 font-semibold'
                        : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder={isSecret ? `Секретное (${selfDestructIn || 15}с)...` : "Напишите сообщение..."}
              className="w-full py-2.5 px-4 max-h-32 bg-white/[0.08] border border-white/[0.16] rounded-2xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400/70 resize-none transition-all shadow-inner"
            />
          </div>

          {/* Emoji Picker Popover Toggle */}
          <div className="relative shrink-0">
            <button
              onClick={() => setEmojiMenuOpen(!emojiMenuOpen)}
              className="p-2.5 rounded-full ios-glass-btn text-slate-300 hover:text-white cursor-pointer"
              title="Эмодзи и стикеры"
            >
              <Smile className="w-5 h-5" />
            </button>

            {emojiMenuOpen && (
              <div className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl ios-glass-card p-3 z-50 shadow-2xl border border-white/20 grid grid-cols-6 gap-1">
                {EMOJI_PALETTE.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setText((prev) => prev + emoji);
                      setEmojiMenuOpen(false);
                      textareaRef.current?.focus();
                    }}
                    className="text-xl p-1.5 rounded-lg hover:bg-white/15 transition-transform hover:scale-120 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send or Voice Record Action Button */}
          {text.trim() || pendingAttachments.length > 0 ? (
            <button
              onClick={handleSend}
              className="p-2.5 rounded-full bg-gradient-to-r from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 text-white shadow-[0_0_16px_rgba(56,189,248,0.5),inset_0_1px_1px_rgba(255,255,255,0.6)] transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
              title="Отправить сообщение (Enter)"
            >
              <Send className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="p-2.5 rounded-full ios-glass-btn text-sky-400 hover:text-sky-300 border border-sky-400/30 transition-all shrink-0 hover:scale-105 active:scale-95 cursor-pointer"
              title="Записать голосовое сообщение (Telegram стиль)"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
