// ============================================================
// speechService.ts — Serviço singleton de fala (TTS).
//
// Garante que apenas UMA narração esteja ativa por vez:
//  1. Ao receber speak(), cancela imediatamente qualquer fala
//     em andamento e limpa a fila interna.
//  2. Aguarda um microtick antes de enfileirar a nova utterance,
//     contornando o bug do Chrome onde cancel() + speak()
//     síncrono é ignorado silenciosamente.
//  3. Expõe stop() para silêncio explícito (ex: unmount).
//
// Módulo puro: sem dependências React.
// ============================================================

import { selectBestVoice } from "./selectBestVoice";
import { applyChildSpeechConfig } from "./speechConfig";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SpeakOptions {
  /** Sobrescreve o rate padrão de CHILD_SPEECH_CONFIG. */
  rate?: number;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

class SpeechService {
  private readonly supported: boolean;

  /** Melhor voz selecionada pelo ranking; atualizada via "voiceschanged". */
  private bestVoice: SpeechSynthesisVoice | null = null;

  /** ID do próximo setTimeout pendente — cancelado se speak() chegar antes. */
  private pendingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.supported =
      typeof window !== "undefined" && "speechSynthesis" in window;

    if (this.supported) {
      const loadVoices = () => {
        this.bestVoice = selectBestVoice(window.speechSynthesis.getVoices());
      };
      // Chrome pode já ter vozes no 1º tick; Firefox/Safari disparam o evento
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    }
  }

  /** Verifica se o browser suporta Web Speech API. */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Fala o texto fornecido.
   *
   * Garante exclusividade: toda narração anterior é interrompida e a fila é
   * limpa antes de iniciar a nova. Nunca duas vozes ao mesmo tempo.
   *
   * @param text    - Texto a narrar.
   * @param options - Opções opcionais (ex: rate customizado por contexto).
   */
  speak(text: string, options: SpeakOptions = {}): void {
    if (!this.supported) return;

    // 1. Cancela qualquer timer pendente (speak() agendado mas ainda não executado)
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    // 2. Para imediatamente a fala atual e esvazia a fila do browser
    window.speechSynthesis.cancel();

    // 3. Aguarda um microtick — necessário no Chrome: cancel() + speak()
    //    síncronos fazem o browser ignorar silenciosamente o speak().
    this.pendingTimer = setTimeout(() => {
      this.pendingTimer = null;

      // Verificação extra: pode ter chegado outro stop() no microtick
      if (!this.supported) return;

      const utt = new SpeechSynthesisUtterance(text);
      applyChildSpeechConfig(utt, options.rate);
      if (this.bestVoice) utt.voice = this.bestVoice;

      window.speechSynthesis.speak(utt);
    }, 50);
  }

  /**
   * Para imediatamente qualquer fala em andamento e cancela falas agendadas.
   * Deve ser chamado no cleanup de componentes (useEffect return).
   */
  stop(): void {
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (this.supported) {
      window.speechSynthesis.cancel();
    }
  }
}

// Instância única compartilhada por todo o aplicativo
export const speechService = new SpeechService();
