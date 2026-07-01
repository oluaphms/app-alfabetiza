// ============================================================
// audioEngine.ts — Motor de áudio da plataforma de
// alfabetização. Usa Web Speech API com fallback silencioso.
// Módulo puro: sem dependências React.
// ============================================================

import type { AudioConfig, IAudioEngine, SoundEffect } from "../types";
import { PHONEME_TTS_MAP } from "../constants";
import { speechService } from "@/lib/speechService";
import { CHILD_SPEECH_CONFIG } from "@/lib/speechConfig";

class AudioEngine implements IAudioEngine {
  private config: AudioConfig = {
    volume: CHILD_SPEECH_CONFIG.volume,
    rate:   CHILD_SPEECH_CONFIG.rate,
    pitch:  CHILD_SPEECH_CONFIG.pitch,
    lang:   CHILD_SPEECH_CONFIG.lang,
    enabled: true,
  };

  private voices: SpeechSynthesisVoice[] = [];
  private readonly supported: boolean;

  constructor() {
    this.supported =
      typeof window !== "undefined" && "speechSynthesis" in window;
  }

  isSupported(): boolean {
    return speechService.isSupported();
  }

  private speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.supported || !this.config.enabled) {
        resolve();
        return;
      }

      // Delega ao SpeechService: ele cancela a fila, aguarda o microtick
      // e garante que nunca haverá sobreposição de vozes.
      speechService.speak(text, { rate: this.config.rate });

      // Resolve imediatamente — o AudioEngine não precisa aguardar o TTS
      // terminar para continuar o fluxo (os efeitos sonoros são independentes).
      resolve();
    });
  }

  async speakWord(word: string): Promise<void> {
    return this.speak(word.toLowerCase());
  }

  async speakPhoneme(phoneme: string): Promise<void> {
    // Remove barras: "/b/" → "b", depois busca no mapa
    const key = phoneme.replace(/\//g, "").toUpperCase();
    const ttsText = PHONEME_TTS_MAP[key] ?? phoneme;
    return this.speak(ttsText);
  }

  async speakSyllable(syllable: string): Promise<void> {
    return this.speak(syllable.toLowerCase());
  }

  async speakFeedback(message: string): Promise<void> {
    return this.speak(message);
  }

  async playSound(effect: SoundEffect): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Frequências por efeito
      const frequencyMap: Record<SoundEffect, number> = {
        correct: 523,     // Dó 5
        wrong: 220,       // Lá 3
        click: 440,       // Lá 4
        levelUp: 659,     // Mi 5
        achievement: 784, // Sol 5
        confetti: 880,    // Lá 5
      };

      oscillator.frequency.value = frequencyMap[effect] ?? 440;
      oscillator.type = effect === "wrong" ? "sawtooth" : "sine";

      gainNode.gain.setValueAtTime(
        this.config.volume * 0.3,
        ctx.currentTime
      );
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      return new Promise((resolve) => {
        oscillator.onended = () => {
          ctx.close().catch(() => {});
          resolve();
        };
      });
    } catch {
      // Fallback silencioso
    }
  }

  stop(): void {
    speechService.stop();
  }

  configure(config: Partial<AudioConfig>): void {
    if (config.volume !== undefined) {
      if (config.volume < 0 || config.volume > 1) {
        console.warn("[AudioEngine] volume deve ser entre 0.0 e 1.0");
        return;
      }
      this.config.volume = config.volume;
    }

    if (config.rate !== undefined) {
      if (config.rate < 0.5 || config.rate > 2.0) {
        console.warn("[AudioEngine] rate deve ser entre 0.5 e 2.0");
        return;
      }
      this.config.rate = config.rate;
    }

    if (config.pitch !== undefined) {
      if (config.pitch < 0 || config.pitch > 2) {
        console.warn("[AudioEngine] pitch deve ser entre 0.0 e 2.0");
        return;
      }
      this.config.pitch = config.pitch;
    }

    if (config.enabled !== undefined) {
      this.config.enabled = config.enabled;
    }
  }

  getConfig(): AudioConfig {
    return { ...this.config };
  }
}

export const audioEngine = new AudioEngine();
