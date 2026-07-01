// ============================================================
// hintEngine.ts — Motor de dicas progressivas da plataforma
// de alfabetização. 5 níveis de dica crescente.
// Módulo puro: sem dependências React.
// ============================================================

import type { HintAction, HintContext, HintLevel, IHintEngine } from "../types";

class HintEngine implements IHintEngine {
  /**
   * Mapeia attemptCount (1-based) para uma HintAction.
   *
   * 1 → repeatAudio
   * 2 → highlightSyllable (se syllables.length === 0, pula para 3)
   * 3 → highlightPhoneme
   * 4 → flashCorrectLetter
   * 5+ → revealAnswer
   */
  getHint(context: HintContext): HintAction {
    const { word, syllables, missingIndex, correctLetter, phoneme, attemptCount } = context;

    // Capeia em nível 5
    const effectiveCount = Math.min(attemptCount, 5);

    // Nível 2 depende da existência de sílabas; se não houver, sobe para 3
    const resolvedLevel = this.resolveLevel(effectiveCount, syllables);

    switch (resolvedLevel) {
      case 1:
        return {
          level: 1,
          type: "repeatAudio",
          payload: null,
          audioText: `Vamos ouvir novamente: ${word.toLowerCase()}`,
        };

      case 2: {
        // Encontra o índice da sílaba que contém a letra faltante
        const syllableIndex = this.findSyllableIndex(word, syllables, missingIndex);
        const syllable = syllables[syllableIndex] ?? syllables[0] ?? word;
        return {
          level: 2,
          type: "highlightSyllable",
          payload: String(syllableIndex),
          audioText: `Ouça a sílaba ${syllable.toLowerCase()}`,
        };
      }

      case 3:
        return {
          level: 3,
          type: "highlightPhoneme",
          payload: phoneme,
          audioText: `A letra faz o som ${phoneme}`,
        };

      case 4:
        return {
          level: 4,
          type: "flashCorrectLetter",
          payload: correctLetter,
          audioText: `Procure a letra ${phoneme}`,
        };

      case 5:
      default: {
        const syllableDisplay = syllables.length > 0
          ? syllables.map((s) => s.toLowerCase()).join(" - ")
          : word.toLowerCase();
        return {
          level: 5,
          type: "revealAnswer",
          payload: correctLetter,
          audioText: `A letra é ${correctLetter.toLowerCase()}. ${word.toLowerCase()}: ${syllableDisplay}`,
        };
      }
    }
  }

  shouldShowHint(attemptCount: number): boolean {
    return attemptCount >= 1;
  }

  reset(): void {
    // Estado interno é stateless nesta implementação;
    // a lógica de estado (attemptCount) fica no hook/contexto externo.
    // Método mantido para satisfazer interface.
  }

  // ── Helpers ────────────────────────────────────────────────

  /** Resolve o nível efetivo, pulando nível 2 se não há sílabas. */
  private resolveLevel(count: number, syllables: string[]): HintLevel {
    if (count === 2 && syllables.length === 0) {
      return 3;
    }
    return count as HintLevel;
  }

  /**
   * Encontra o índice (0-based) da sílaba que contém o caractere
   * em `missingIndex` dentro da string `word`.
   */
  private findSyllableIndex(
    word: string,
    syllables: string[],
    missingIndex: number
  ): number {
    let pos = 0;
    for (let i = 0; i < syllables.length; i++) {
      pos += syllables[i].length;
      if (missingIndex < pos) return i;
    }
    return 0;
  }
}

export const hintEngine = new HintEngine();
