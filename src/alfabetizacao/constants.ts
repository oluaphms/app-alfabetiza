// ============================================================
// constants.ts — Constantes globais da plataforma de
// alfabetização por consciência fonológica.
// Módulo puro: sem dependências React.
// ============================================================

import type {
  ConfusionPair,
  DifficultyLevel,
  PlayerProgress,
  World,
} from "./types";

// ── Pares de confusão pré-definidos ──────────────────────────

export const CONFUSION_PAIRS: ConfusionPair[] = [
  { letters: ["B", "D"], frequency: 0, category: "visual" },
  { letters: ["B", "P"], frequency: 0, category: "visual" },
  { letters: ["D", "Q"], frequency: 0, category: "visual" },
  { letters: ["F", "V"], frequency: 0, category: "phonetic" },
  { letters: ["S", "Z"], frequency: 0, category: "phonetic" },
  { letters: ["C", "K"], frequency: 0, category: "phonetic" },
  { letters: ["T", "D"], frequency: 0, category: "phonetic" },
  { letters: ["P", "B"], frequency: 0, category: "phonetic" },
];

// ── Similaridade visual entre letras ─────────────────────────
// Usado pelo DistractorEngine para selecionar distratores
// pedagogicamente relevantes em níveis 3+.

export const VISUAL_SIMILAR: Record<string, string[]> = {
  B: ["D", "P", "Q", "R"],
  D: ["B", "P", "Q"],
  P: ["B", "D", "Q", "R"],
  Q: ["G", "O", "D"],
  M: ["N", "W"],
  N: ["M", "U"],
  F: ["E", "T"],
  I: ["J", "L"],
};

// ── Similaridade fonética entre letras ───────────────────────
// Usado pelo DistractorEngine em níveis 4+.

export const PHONETIC_SIMILAR: Record<string, string[]> = {
  B: ["P", "V"],
  V: ["F", "B"],
  F: ["V"],
  S: ["Z", "C"],
  Z: ["S"],
  C: ["K", "Q", "S"],
  K: ["C", "Q"],
  T: ["D"],
  D: ["T"],
  G: ["J"],
  J: ["G"],
};

// ── Mapa fonema → texto fonético para TTS ─────────────────────
// Garante pronúncia correta dos fonemas isolados em pt-BR.
// O AudioEngine usa este mapa em speakPhoneme().

export const PHONEME_TTS_MAP: Record<string, string> = {
  A: "a",
  B: "bê",
  C: "cê",
  D: "dê",
  E: "e",
  F: "efe",
  G: "guê",
  H: "agá",
  I: "i",
  J: "jota",
  K: "cá",
  L: "ele",
  M: "eme",
  N: "ene",
  O: "o",
  P: "pê",
  Q: "quê",
  R: "erre",
  S: "esse",
  T: "tê",
  U: "u",
  V: "vê",
  X: "xis",
  Z: "zê",
};

// ── Alfabeto (sem W e Y, que não são letras nativas do pt-BR) ─

export const ALPHABET: string[] = "ABCDEFGHIJLMNOPQRSTUVXZ".split("");

// ── Número de opções por nível de dificuldade ─────────────────

export const OPTION_COUNT_BY_LEVEL: Record<DifficultyLevel, number> = {
  1: 2,
  2: 3,
  3: 4,
  4: 5,
  5: 6,
};

// ── Mundos ────────────────────────────────────────────────────

export const WORLDS: World[] = [
  {
    id: "floresta",
    name: "Floresta Mágica",
    emoji: "🌲",
    bgColor: "coral",
    unlockCondition: { stars: 0 },
    phases: [],
  },
  {
    id: "cidade",
    name: "Cidade Alegre",
    emoji: "🏙️",
    bgColor: "ocean",
    unlockCondition: { stars: 30 },
    phases: [],
  },
  {
    id: "espaco",
    name: "Espaço Sideral",
    emoji: "🚀",
    bgColor: "grape",
    unlockCondition: { stars: 80 },
    phases: [],
  },
  {
    id: "fazenda",
    name: "Fazenda do Sol",
    emoji: "🌻",
    bgColor: "leaf",
    unlockCondition: { stars: 150 },
    phases: [],
  },
];

// ── Progresso inicial zerado ──────────────────────────────────

export const INITIAL_PROGRESS: PlayerProgress = {
  playerId: "player-1",
  totalStars: 0,
  totalCoins: 0,
  unlockedWorlds: ["floresta"],
  completedCategories: [],
  consecutiveDays: 0,
  lastPlayed: "",
  currentDifficultyLevel: 1,
  totalTimeSpentSeconds: 0,
};
