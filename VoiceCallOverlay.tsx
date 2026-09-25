import React, { useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio
} from 'lucide-react';
import { VoicePeer } from '../types';

interface VoiceCallOverlayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remotePeer: VoicePeer | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleDeafen: () => void;
  onEndCall: () => void;
  callDuration: number;
}

export const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({
  localStream,
  remoteStream,
  remotePeer,
  isMuted,
  isVideoEnabled,
  isScreenSharing,
  isDeafened,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDeafen,
  onEndCall,
  callDuration,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoEnabled, isScreenSharing]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0 && remoteStream.getVideoTracks()[0].enabled;
  const hasLocalVideo = localStream && localStream.getVideoTracks().length > 0 && localStream.getVideoTracks()[0].enabled;

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-2xl text-white select-none animate-in fade-in duration-200">
      {/* Top Header Pill */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full ios-glass text-xs shadow-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-white">Прямой P2P Звонок</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="font-mono text-slate-300">{formatDuration(callDuration)}</span>
        <span className="text-slate-600">|</span>
        <span className="text-emerald-400 font-mono text-[11px]">Lossless WebRTC</span>
      </div>

      {/* Main Video / Avatar Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        {hasRemoteVideo ? (
          <div className="relative w-full h-full max-w-5xl max-h-[80vh] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-xl ios-glass text-xs font-medium">
              {remotePeer?.name || 'Собеседник'}
            </div>
          </div>
        ) : (
          /* Discord Voice Channel Grid */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
            {/* Remote Peer Voice Card */}
            <div className="flex flex-col items-center">
              <div
                className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center font-bold text-3xl sm:text-4xl text-white shadow-2xl transition-all border-4 ${
                  remotePeer?.isSpeaking ? 'speaking-ring' : 'border-transparent'
                }`}
                style={{ background: remotePeer?.avatarColor || 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              >
                {remotePeer?.name?.charAt(0).toUpperCase() || 'P'}
                {remotePeer?.isMuted && (
                  <div className="absolute bottom-0 right-0 p-2 rounded-full bg-rose-500 text-white shadow-lg">
                    <MicOff className="w-4 h-4" />
                  </div>
                )}
              </div>
              <span className="mt-3 font-semibold text-sm sm:text-base text-slate-200">
                {remotePeer?.name || 'Собеседник (1000 км P2P)'}
              </span>
              <span className="text-xs text-emerald-400">
                {remotePeer?.isSpeaking ? 'Говорит...' : 'В канале'}
              </span>
            </div>
          </div>
        )}

        {/* Local Video Picture-in-Picture (PiP) */}
        {hasLocalVideo && (
          <div className="absolute top-6 right-6 w-36 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-neutral-950 z-30">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1.5 left-2 text-[10px] text-white/80 font-medium">
              Вы
            </div>
          </div>
        )}
      </div>

      {/* Floating Translucent iOS Control Island */}
      <div className="p-6 flex justify-center z-30">
        <div className="flex items-center gap-3 sm:gap-4 px-6 py-3.5 rounded-full ios-glass shadow-2xl border border-white/15">
          {/* Mute Mic */}
          <button
            onClick={onToggleMute}
            className={`p-3.5 rounded-full transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Deafen (Discord Audio Mute) */}
          <button
            onClick={onToggleDeafen}
            className={`p-3.5 rounded-full transition-all ${
              isDeafened
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isDeafened ? 'Включить звук' : 'Заглушить все звуки'}
          >
            {isDeafened ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          {/* Camera Video Toggle */}
          <button
            onClick={onToggleVideo}
            className={`p-3.5 rounded-full transition-all ${
              !isVideoEnabled
                ? 'bg-white/10 hover:bg-white/20 text-slate-400'
                : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
            }`}
            title={isVideoEnabled ? 'Выключить камеру' : 'Включить камеру'}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Sharing Toggle (Discord Screen Share) */}
          <button
            onClick={onToggleScreenShare}
            className={`p-3.5 rounded-full transition-all ${
              isScreenSharing
                ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
          >
            <Monitor className="w-5 h-5" />
          </button>

          {/* End Call (Red Hang Up) */}
          <button
            onClick={onEndCall}
            className="p-3.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ml-2"
            title="Завершить звонок"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
