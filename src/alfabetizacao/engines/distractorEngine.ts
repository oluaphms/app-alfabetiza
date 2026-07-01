// ============================================================
// distractorEngine.ts — Motor de distratores pedagógicos.
// Gera alternativas relevantes para o jogo de letras.
// Módulo puro: sem dependências React.
// ============================================================

import type { DistractorConfig, IDistractorEngine } from "../types";
import { ALPHABET, VISUAL_SIMILAR, PHONETIC_SIMILAR } from "../constants";

class DistractorEngine implements IDistractorEngine {
  /**
   * Gera `config.count` distratores para `correctLetter`.
   *
   * Invariante: resultado nunca contém `correctLetter`, sem duplicatas.
   * Pós-condição: result.length === config.count
   */
  generate(correctLetter: string, config: DistractorConfig): string[] {
    const { difficulty, mistakeProfile, count } = config;
    const result: string[] = [];
    const used = new Set<string>([correctLetter]);

    // ── NÍVEL 5: perfil de erros da criança ──────────────────
    if (difficulty >= 5) {
      const confused = Object.entries(mistakeProfile)
        .filter(([letter]) => letter !== correctLetter)
        .sort(([, a], [, b]) => b - a)
        .map(([letter]) => letter);

      for (const letter of confused) {
        if (result.length >= count) break;
        if (!used.has(letter) && ALPHABET.includes(letter)) {
          result.push(letter);
          used.add(letter);
        }
      }
    }

    // ── NÍVEIS 3-4: visualmente/foneticamente próximos ───────
    if (difficulty >= 3 && result.length < count) {
      const visuals: string[] = VISUAL_SIMILAR[correctLetter] ?? [];
      const phonetics: string[] = PHONETIC_SIMILAR[correctLetter] ?? [];

      // Nível 4+: inclui fonéticos; nível 3: só visuais
      const pool: string[] = difficulty >= 4
        ? [...phonetics, ...visuals]
        : [...visuals];

      for (const letter of pool) {
        if (result.length >= count) break;
        if (!used.has(letter) && ALPHABET.includes(letter)) {
          result.push(letter);
          used.add(letter);
        }
      }
    }

    // ── Completar com letras aleatórias do alfabeto ───────────
    const available = ALPHABET.filter((l) => !used.has(l));
    // Embaralha para aleatoriedade
    this.shuffle(available);

    for (const letter of available) {
      if (result.length >= count) break;
      if (!used.has(letter)) {
        result.push(letter);
        used.add(letter);
      }
    }

    // Garantia final: nunca menos que count (não deveria acontecer, mas garante)
    return result.slice(0, count);
  }

  private shuffle<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

export const distractorEngine = new DistractorEngine();
