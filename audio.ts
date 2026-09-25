/**
 * Web Audio API Engine for Discord & Telegram sound effects,
 * Voice recording with real-time waveform extraction, and Voice Activity Detection (VAD).
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private soundVolume = 0.8;
  private soundboardVolume = 0.9;
  private soundEnabled = true;

  private initCtx(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setSettings(enabled: boolean, soundVol: number, soundboardVol: number) {
    this.soundEnabled = enabled;
    this.soundVolume = soundVol;
    this.soundboardVolume = soundboardVol;
  }

  // --- Telegram & Discord SFX ---

  public playSend() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.15 * this.soundVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // AudioContext not allowed yet
    }
  }

  public playReceive() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      
      // Dual tone Telegram bell
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(784, now); // G5
      osc1.frequency.setValueAtTime(1046.5, now + 0.07); // C6

      osc2.frequency.setValueAtTime(784, now);
      osc2.frequency.setValueAtTime(1046.5, now + 0.07);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25 * this.soundVolume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } catch {
      // AudioContext not allowed yet
    }
  }

  public playDiscordJoin() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.09); // C#5
      osc.frequency.setValueAtTime(659.25, now + 0.18); // E5

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.soundVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {}
  }

  public playDiscordLeave() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(554.37, now + 0.09); // C#5
      osc.frequency.setValueAtTime(440, now + 0.18); // A4

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.soundVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.33);
    } catch {}
  }

  public playMute(isMuted: boolean) {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (isMuted) {
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.12);
      } else {
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);
      }

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2 * this.soundVolume, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  public playDiscordPing() {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3 * this.soundVolume, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch {}
  }

  // --- Discord Soundboard Effects (Synthesized directly) ---

  public playSoundboard(effect: string) {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const vol = this.soundboardVolume;

      switch (effect) {
        case 'airhorn': {
          // Classic reggaeton/stadium horn fanfare
          const notes = [466.16, 466.16, 466.16, 466.16, 466.16, 523.25, 466.16];
          const times = [0, 0.08, 0.16, 0.24, 0.32, 0.42, 0.52];
          const dur = 0.07;
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + times[idx]);
            gain.gain.setValueAtTime(0.2 * vol, now + times[idx]);
            gain.gain.exponentialRampToValueAtTime(0.001, now + times[idx] + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + times[idx]);
            osc.stop(now + times[idx] + dur);
          });
          break;
        }

        case 'quack': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.linearRampToValueAtTime(180, now + 0.18);
          gain.gain.setValueAtTime(0.25 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case 'level_up': {
          // Arcade 8-bit rising arpeggio
          const freqs = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
          freqs.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            const startTime = now + i * 0.05;
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.12 * vol, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.1);
          });
          break;
        }

        case 'badum_tss': {
          // Low tom 1
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.frequency.setValueAtTime(140, now);
          osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1);
          gain1.gain.setValueAtTime(0.3 * vol, now);
          gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
          osc1.connect(gain1);
          gain1.connect(ctx.destination);
          osc1.start(now);
          osc1.stop(now + 0.1);

          // Low tom 2
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.frequency.setValueAtTime(130, now + 0.14);
          osc2.frequency.exponentialRampToValueAtTime(45, now + 0.24);
          gain2.gain.setValueAtTime(0.3 * vol, now + 0.14);
          gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.24);
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start(now + 0.14);
          osc2.stop(now + 0.24);

          // Cymbal splash (white noise)
          const bufferSize = ctx.sampleRate * 0.4;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
          }
          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          const noiseFilter = ctx.createBiquadFilter();
          noiseFilter.type = 'highpass';
          noiseFilter.frequency.value = 5000;
          const noiseGain = ctx.createGain();
          noiseGain.gain.setValueAtTime(0.2 * vol, now + 0.28);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
          noise.connect(noiseFilter);
          noiseFilter.connect(noiseGain);
          noiseGain.connect(ctx.destination);
          noise.start(now + 0.28);
          break;
        }

        case 'laser': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(1200, now);
          osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
          gain.gain.setValueAtTime(0.2 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'cyber_chime': {
          const freqs = [587.33, 880, 1174.66, 1760];
          freqs.forEach((f, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = now + i * 0.04;
            osc.frequency.setValueAtTime(f, t);
            gain.gain.setValueAtTime(0.15 * vol, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t);
            osc.stop(t + 0.4);
          });
          break;
        }
      }
    } catch {}
  }

  // --- Voice Activity Detection (VAD) Helper ---

  public createVAD(
    stream: MediaStream,
    threshold: number, // 0..100
    onSpeakingChange: (isSpeaking: boolean, volumeLevel: number) => void
  ): () => void {
    try {
      const ctx = this.initCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let animId: number;
      let lastSpeaking = false;
      let speechHangover = 0;

      const checkVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength; // 0..255
        const normalized = average / 255; // 0..1

        // Map threshold 0..100 to 0.02..0.4
        const cutoff = 0.02 + (threshold / 100) * 0.35;
        const isCurrentlyLoud = normalized > cutoff;

        if (isCurrentlyLoud) {
          speechHangover = 12; // hold speaking state for ~200ms
        } else if (speechHangover > 0) {
          speechHangover--;
        }

        const isSpeaking = speechHangover > 0;
        if (isSpeaking !== lastSpeaking) {
          lastSpeaking = isSpeaking;
        }
        onSpeakingChange(isSpeaking, normalized);

        animId = requestAnimationFrame(checkVolume);
      };

      animId = requestAnimationFrame(checkVolume);

      return () => {
        cancelAnimationFrame(animId);
        source.disconnect();
      };
    } catch {
      return () => {};
    }
  }
}

export const audioService = new AudioEngine();
