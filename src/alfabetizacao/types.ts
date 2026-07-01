// ============================================================
// types.ts — Todas as interfaces TypeScript da plataforma de
// alfabetização por consciência fonológica.
// Módulo puro: sem dependências React.
// ============================================================

// ── Identificadores ─────────────────────────────────────────

export type CategoryId =
  | "animais"
  | "frutas"
  | "objetos"
  | "escola"
  | "casa"
  | "natureza"
  | "corpo"
  | "transportes"
  | "profissoes"
  | "cores"
  | "numeros"
  | "brinquedos";

export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export type HintLevel = 1 | 2 | 3 | 4 | 5;

export type WorldId = "floresta" | "cidade" | "espaco" | "fazenda";

export type SoundEffect =
  | "correct"
  | "wrong"
  | "click"
  | "levelUp"
  | "achievement"
  | "confetti";

// ── Palavra / WordBank ───────────────────────────────────────

export interface Word {
  /** Identificador único, ex: "gato-001" */
  id: string;
  /** Palavra em maiúsculas, ex: "GATO" */
  word: string;
  /** Palavra com separação silábica para exibição, ex: "GA•TO" */
  displayWord: string;
  /** Sílabas individuais, ex: ["GA", "TO"] */
  syllables: string[];
  /** Emoji representativo, ex: "🐱" */
  emoji: string;
  /** Categoria temática */
  category: CategoryId;
  /** Nível de dificuldade 1-5 */
  difficultyLevel: DifficultyLevel;
  /** Fonemas individuais, ex: ["/g/", "/a/", "/t/", "/o/"] */
  phonemes: string[];
  /** Texto para TTS: "gato" */
  audioHint: string;
  /** Índice da sílaba que contém a letra faltante (0-based) */
  syllableWithMissingLetter: number;
}

// ── Mundo / Fase ─────────────────────────────────────────────

export interface Phase {
  id: string;
  worldId: WorldId;
  /** Número da fase dentro do mundo (1-based) */
  number: number;
  /** IDs das palavras desta fase */
  words: string[];
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  unlocked: boolean;
}

export interface World {
  id: WorldId;
  name: string;
  emoji: string;
  bgColor: string;
  unlockCondition: { stars: number };
  phases: Phase[];
}

// ── Progresso do Jogador ─────────────────────────────────────

export interface PlayerProgress {
  playerId: string;
  totalStars: number;
  totalCoins: number;
  unlockedWorlds: WorldId[];
  completedCategories: CategoryId[];
  consecutiveDays: number;
  /** ISO date string */
  lastPlayed: string;
  currentDifficultyLevel: DifficultyLevel;
  totalTimeSpentSeconds: number;
}

// ── Sessão ───────────────────────────────────────────────────

export interface Session {
  sessionId: string;
  startTime: string; // ISO date
  wordsAttempted: number;
  wordsCorrect: number;
  hintsUsed: number;
  timeSpentSeconds: number;
}

// ── Conquistas ───────────────────────────────────────────────

export type AchievementCondition =
  | { type: "words"; count: number }
  | { type: "corrects"; count: number }
  | { type: "streak"; days: number }
  | { type: "category"; categoryId: string }
  | { type: "nohints"; count: number };

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  condition: AchievementCondition;
  unlocked: boolean;
  unlockedAt?: Date;
}

// ── Perfil de Erros / Repetição Espaçada ─────────────────────

/** Mapa letra → contagem de confusões históricas da criança */
export type MistakeProfile = Record<string, number>;

export interface SpacedRepetitionEntry {
  wordId: string;
  nextReviewAt: Date;
  /** Dias até a próxima revisão */
  interval: number;
  /** Fator de facilidade SM-2 (mínimo 1.3) */
  easeFactor: number;
  repetitions: number;
}

// ── Áudio ────────────────────────────────────────────────────

export interface AudioConfig {
  /** 0.0 – 1.0 */
  volume: number;
  /** 0.5 – 2.0 */
  rate: number;
  /** 0.0 – 2.0 */
  pitch: number;
  lang: "pt-BR";
  enabled: boolean;
}

// ── Dicas ────────────────────────────────────────────────────

export interface HintContext {
  word: string;
  syllables: string[];
  missingIndex: number;
  correctLetter: string;
  phoneme: string;
  attemptCount: number;
}

export interface HintAction {
  level: HintLevel;
  type:
    | "repeatAudio"
    | "highlightSyllable"
    | "highlightPhoneme"
    | "flashCorrectLetter"
    | "revealAnswer";
  payload: string | null;
  audioText: string | null;
}

// ── Distratores ──────────────────────────────────────────────

export interface DistractorConfig {
  difficulty: DifficultyLevel;
  mistakeProfile: MistakeProfile;
  /** Quantidade de distratores (total de opções = count + 1 correta) */
  count: number;
}

export interface ConfusionPair {
  letters: [string, string];
  frequency: number;
  category: "visual" | "phonetic";
}

// ── Resultado da Tentativa ───────────────────────────────────

export interface AttemptResult {
  correct: boolean;
  stars?: number;
  coins?: number;
  feedback?: string;
  soundEffect: SoundEffect;
  hintAction?: HintAction | null;
  newAttemptCount?: number;
  error?: string;
}

export type FeedbackState =
  | { type: "correct"; stars: number; message: string }
  | { type: "wrong"; hintLevel: HintLevel };

export interface WordChallengeContext {
  word: string;
  syllables: string[];
  /** Índice do caractere faltante dentro da string `word` */
  missingIndex: number;
  correctLetter: string;
  phoneme: string;
  attemptCount: number;
}

// ── Interfaces dos Engines ───────────────────────────────────

export interface IAudioEngine {
  speakWord(word: string): Promise<void>;
  speakPhoneme(phoneme: string): Promise<void>;
  speakSyllable(syllable: string): Promise<void>;
  speakFeedback(message: string): Promise<void>;
  playSound(effect: SoundEffect): Promise<void>;
  stop(): void;
  configure(config: Partial<AudioConfig>): void;
  isSupported(): boolean;
}

export interface IHintEngine {
  getHint(context: HintContext): HintAction;
  shouldShowHint(attemptCount: number): boolean;
  reset(): void;
}

export interface IAdaptiveEngine {
  getNextWord(
    profile: MistakeProfile,
    availableWords: Word[],
    sessionHistory?: string[]
  ): Word;
  recordAttempt(wordId: string, correct: boolean, hintsUsed: number): void;
  updateMistakeProfile(targetLetter: string, chosenLetter: string): void;
  getMistakeProfile(): MistakeProfile;
  getConfusedPairs(): Array<[string, string]>;
  getSpacedRepetitionQueue(): Word[];
  resetSession(): void;
}

export interface IDistractorEngine {
  generate(correctLetter: string, config: DistractorConfig): string[];
}

export interface IProgressStore {
  getProgress(): PlayerProgress;
  addStars(n: number): void;
  addCoins(n: number): void;
  recordSession(session: Session): void;
  recordMistake(targetLetter: string, chosenLetter: string): void;
  recordCorrect(wordId: string): void;
  getMistakeProfile(): MistakeProfile;
  unlockAchievement(id: string): void;
  getAchievements(): Achievement[];
  getSessionHistory(days?: number): Session[];
  /** Retorna JSON para exportação */
  exportData(): string;
  clearData(): void;
}

export interface IRewardEngine {
  checkAchievements(progress: PlayerProgress): Achievement[];
  /** Retorna 1–3 estrelas conforme o número de dicas usadas */
  calculateStarsForAttempt(hintsUsed: number): number;
  calculateCoinsForSession(session: Session): number;
  getUnlockedAchievements(): Achievement[];
}
