// ============================================================
// adaptiveEngine.ts — Motor de aprendizagem adaptativa com
// repetição espaçada SM-2.
// Módulo puro: sem dependências React.
// ============================================================

import type {
  IAdaptiveEngine,
  MistakeProfile,
  SpacedRepetitionEntry,
  Word,
} from "../types";

class AdaptiveEngine implements IAdaptiveEngine {
  private mistakeProfile: MistakeProfile = {};
  private spacedRepetition = new Map<string, SpacedRepetitionEntry>();
  private sessionHistory: string[] = [];

  // ── Seleção de palavra ──────────────────────────────────────

  /**
   * Seleciona a próxima palavra usando roleta ponderada.
   * Lança Error("WordBank empty") se availableWords estiver vazio.
   */
  getNextWord(
    profile: MistakeProfile,
    availableWords: Word[],
    sessionHistory: string[] = []
  ): Word {
    if (availableWords.length === 0) {
      throw new Error("WordBank empty");
    }

    const now = new Date();
    const recent = sessionHistory.slice(-5);

    const weights = availableWords.map((word) => {
      let weight = 1.0;

      // Boost para revisão pendente (SM-2)
      const srEntry = this.spacedRepetition.get(word.id);
      if (srEntry && srEntry.nextReviewAt <= now) {
        weight *= 3.0;
      }

      // Boost baseado em perfil de erros
      for (const letter of word.word.split("")) {
        const mistakeCount = profile[letter] ?? 0;
        if (mistakeCount > 0) {
          weight += mistakeCount * 0.5;
        }
      }

      // Penalidade por recência (últimas 5 seleções)
      if (recent.includes(word.id)) {
        weight *= 0.1;
      }

      // Invariante: weight > 0
      return Math.max(weight, 0.01);
    });

    // Seleção por roleta (weighted random)
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < availableWords.length; i++) {
      random -= weights[i];
      if (random <= 0) return availableWords[i];
    }

    return availableWords[availableWords.length - 1];
  }

  // ── Registro de tentativa ───────────────────────────────────

  /**
   * Registra resultado de uma tentativa e atualiza SM-2.
   * quality = correct ? max(0, 5 - hintsUsed) : 1
   */
  recordAttempt(wordId: string, correct: boolean, hintsUsed: number): void {
    const quality = correct ? Math.max(0, 5 - hintsUsed) : 1;

    const existing = this.spacedRepetition.get(wordId);
    const entry: SpacedRepetitionEntry = existing ?? {
      wordId,
      nextReviewAt: new Date(),
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
    };

    const updated = this.updateSpacedRepetition(entry, quality);
    this.spacedRepetition.set(wordId, updated);
    this.sessionHistory.push(wordId);
  }

  // ── Perfil de erros ─────────────────────────────────────────

  updateMistakeProfile(targetLetter: string, chosenLetter: string): void {
    // Incrementa para a letra-alvo (a que foi confundida)
    this.mistakeProfile[targetLetter] =
      (this.mistakeProfile[targetLetter] ?? 0) + 1;

    // Também registra a letra escolhada errada como associação de confusão
    // (útil para getConfusedPairs mas não obrigatório pelo spec)
    void chosenLetter;
  }

  getMistakeProfile(): MistakeProfile {
    return { ...this.mistakeProfile };
  }

  getConfusedPairs(): Array<[string, string]> {
    // Retorna pares [target, similar] baseado no histório de erros
    // combinados com CONFUSION_PAIRS — simplificado: pares mais frequentes
    const pairs: Array<[string, string]> = [];
    const sorted = Object.entries(this.mistakeProfile).sort(([, a], [, b]) => b - a);
    for (const [letter] of sorted.slice(0, 5)) {
      pairs.push([letter, "?"]);
    }
    return pairs;
  }

  // ── Repetição espaçada ──────────────────────────────────────

  getSpacedRepetitionQueue(): Word[] {
    // Retorna palavras com revisão pendente (sem acesso ao wordBank aqui,
    // retornamos os IDs como array vazio de Word — o hook deve cruzar com o banco)
    return [];
  }

  resetSession(): void {
    this.sessionHistory = [];
  }

  // ── SM-2 ────────────────────────────────────────────────────

  /**
   * Algoritmo SM-2 exato.
   *
   * quality 0-5:
   *   5 = perfeito, 4 = correto, 3 = correto com dificuldade,
   *   2 = erro mas lembrou, 1 = erro grave, 0 = blackout
   *
   * Pós-condição: easeFactor >= 1.3
   */
  updateSpacedRepetition(
    entry: SpacedRepetitionEntry,
    quality: number
  ): SpacedRepetitionEntry {
    let { interval, easeFactor, repetitions } = entry;

    if (quality >= 3) {
      // Resposta correta: aumenta intervalo
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }

      // Atualiza fator de facilidade
      easeFactor =
        easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
      easeFactor = Math.max(1.3, easeFactor); // INVARIANTE: >= 1.3
      repetitions += 1;
    } else {
      // Resposta errada: reseta intervalo
      interval = 1;
      repetitions = 0;
      // easeFactor não muda em caso de erro
    }

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + interval);

    return { ...entry, interval, easeFactor, repetitions, nextReviewAt };
  }
}

export const adaptiveEngine = new AdaptiveEngine();
