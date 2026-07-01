// ============================================================
// rewardEngine.ts — Motor de recompensas, estrelas, moedas
// e conquistas da plataforma de alfabetização.
// Módulo puro: sem dependências React.
// ============================================================

import type {
  Achievement,
  AchievementCondition,
  IRewardEngine,
  PlayerProgress,
  Session,
} from "../types";

// ── Conquistas predefinidas ───────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-word",
    title: "Primeira Palavra",
    description: "Acertou a primeira palavra",
    emoji: "📖",
    condition: { type: "words", count: 1 } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "ten-words",
    title: "Leitor Iniciante",
    description: "Acertou 10 palavras",
    emoji: "🌟",
    condition: { type: "words", count: 10 } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "fifty-corrects",
    title: "Campeão das Letras",
    description: "50 acertos no total",
    emoji: "🏆",
    condition: { type: "corrects", count: 50 } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "hundred-corrects",
    title: "Mestre da Leitura",
    description: "100 acertos no total",
    emoji: "👑",
    condition: { type: "corrects", count: 100 } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "seven-days",
    title: "Semana Perfeita",
    description: "7 dias consecutivos jogando",
    emoji: "🔥",
    condition: { type: "streak", days: 7 } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "category-done",
    title: "Mestre da Categoria",
    description: "Completou uma categoria inteira",
    emoji: "🐾",
    condition: { type: "category", categoryId: "animais" } as AchievementCondition,
    unlocked: false,
  },
  {
    id: "no-hints",
    title: "Independente",
    description: "5 palavras seguidas sem usar dicas",
    emoji: "💡",
    condition: { type: "nohints", count: 5 } as AchievementCondition,
    unlocked: false,
  },
];

class RewardEngine implements IRewardEngine {
  private achievements: Achievement[] = ACHIEVEMENTS.map((a) => ({ ...a }));

  // ── Estrelas ────────────────────────────────────────────────

  /**
   * Calcula estrelas pela quantidade de dicas usadas:
   * 0 dicas → 3 estrelas
   * 1-2 dicas → 2 estrelas
   * 3+ dicas → 1 estrela
   */
  calculateStarsForAttempt(hintsUsed: number): number {
    if (hintsUsed === 0) return 3;
    if (hintsUsed <= 2) return 2;
    return 1;
  }

  // ── Moedas ──────────────────────────────────────────────────

  /**
   * Calcula moedas para a sessão:
   * +1 por cada 5 palavras corretas
   * +2 bonus se sem nenhuma dica
   */
  calculateCoinsForSession(session: Session): number {
    const base = Math.floor(session.wordsCorrect / 5);
    const bonus = session.hintsUsed === 0 ? 2 : 0;
    return base + bonus;
  }

  // ── Conquistas ──────────────────────────────────────────────

  /**
   * Verifica quais conquistas foram desbloqueadas.
   * Retorna apenas as conquistas que eram `unlocked === false`
   * e agora satisfazem a condição.
   * Cada conquista é desbloqueada no máximo uma vez.
   */
  checkAchievements(progress: PlayerProgress): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements) {
      if (achievement.unlocked) continue; // Já desbloqueada, pula

      const condition = achievement.condition;
      let satisfied = false;

      switch (condition.type) {
        case "words":
          satisfied = progress.totalStars >= condition.count;
          break;
        case "corrects":
          satisfied = progress.totalStars >= condition.count;
          break;
        case "streak":
          satisfied = progress.consecutiveDays >= condition.days;
          break;
        case "category":
          satisfied = progress.completedCategories.includes(
            condition.categoryId as import("../types").CategoryId
          );
          break;
        case "nohints":
          // Verificado externamente (precisa de contexto de sessão)
          // Por ora, usa totalCoins como proxy (moedas extras vêm de sem dicas)
          satisfied = progress.totalCoins >= condition.count * 2;
          break;
      }

      if (satisfied) {
        achievement.unlocked = true;
        achievement.unlockedAt = new Date();
        newlyUnlocked.push({ ...achievement });
      }
    }

    return newlyUnlocked;
  }

  getUnlockedAchievements(): Achievement[] {
    return this.achievements.filter((a) => a.unlocked);
  }
}

export const rewardEngine = new RewardEngine();
