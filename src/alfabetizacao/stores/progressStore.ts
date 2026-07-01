// ============================================================
// progressStore.ts — Persistência de progresso do jogador.
// Usa localStorage para dados simples e tenta IndexedDB para
// histórico de sessões. Sem pacote idb — IndexedDB nativo.
// Módulo puro: sem dependências React.
// ============================================================

import type {
  Achievement,
  IProgressStore,
  MistakeProfile,
  PlayerProgress,
  Session,
} from "../types";
import { INITIAL_PROGRESS } from "../constants";
import { ACHIEVEMENTS } from "../engines/rewardEngine";

const LS_KEY = "alfa-progress";
const LS_MISTAKES_KEY = "alfa-mistakes";
const LS_ACHIEVEMENTS_KEY = "alfa-achievements";
const LS_SESSIONS_KEY = "alfa-sessions";
const IDB_NAME = "alfa-db";
const IDB_VERSION = 1;
const IDB_STORE = "sessions";
const MAX_LS_SESSIONS_DAYS = 30;

// ── Helpers localStorage ──────────────────────────────────────

function lsRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded ou ambiente sem localStorage
  }
}

// ── IndexedDB (nativo, sem idb package) ───────────────────────

let idbDatabase: IDBDatabase | null = null;
let idbFailed = false;

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (idbFailed) {
      resolve(null);
      return;
    }

    if (idbDatabase) {
      resolve(idbDatabase);
      return;
    }

    if (typeof indexedDB === "undefined") {
      idbFailed = true;
      resolve(null);
      return;
    }

    const request = indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "sessionId" });
      }
    };

    request.onsuccess = (event) => {
      idbDatabase = (event.target as IDBOpenDBRequest).result;
      resolve(idbDatabase);
    };

    request.onerror = () => {
      idbFailed = true;
      resolve(null);
    };
  });
}

async function idbWriteSessions(sessions: Session[]): Promise<void> {
  const db = await openIDB();
  if (!db) {
    // Fallback: localStorage
    lsWrite(LS_SESSIONS_KEY, sessions);
    return;
  }

  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    for (const session of sessions) {
      store.put(session);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => {
      // Fallback silencioso para localStorage
      lsWrite(LS_SESSIONS_KEY, sessions);
      resolve();
    };
  });
}

async function idbReadSessions(): Promise<Session[]> {
  const db = await openIDB();
  if (!db) {
    return lsRead<Session[]>(LS_SESSIONS_KEY, []);
  }

  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Session[]);
    request.onerror = () => resolve(lsRead<Session[]>(LS_SESSIONS_KEY, []));
  });
}

// ── ProgressStore ─────────────────────────────────────────────

class ProgressStore implements IProgressStore {
  private progress: PlayerProgress;
  private mistakeProfile: MistakeProfile;
  private achievements: Achievement[];
  private sessionBuffer: Session[] = [];

  constructor() {
    this.progress = lsRead<PlayerProgress>(LS_KEY, { ...INITIAL_PROGRESS });
    this.mistakeProfile = lsRead<MistakeProfile>(LS_MISTAKES_KEY, {});
    this.achievements = lsRead<Achievement[]>(
      LS_ACHIEVEMENTS_KEY,
      ACHIEVEMENTS.map((a) => ({ ...a }))
    );
  }

  getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  // ── Estrelas e moedas ───────────────────────────────────────

  addStars(n: number): void {
    this.progress.totalStars += n;
    lsWrite(LS_KEY, this.progress);
  }

  addCoins(n: number): void {
    this.progress.totalCoins += n;
    lsWrite(LS_KEY, this.progress);
  }

  // ── Sessões (batch ao final da sessão) ──────────────────────

  recordSession(session: Session): void {
    this.sessionBuffer.push(session);
    // Write em batch
    void idbWriteSessions(this.sessionBuffer);
  }

  // ── Erros e acertos ─────────────────────────────────────────

  recordMistake(targetLetter: string, _chosenLetter: string): void {
    this.mistakeProfile[targetLetter] =
      (this.mistakeProfile[targetLetter] ?? 0) + 1;
    lsWrite(LS_MISTAKES_KEY, this.mistakeProfile);
  }

  recordCorrect(_wordId: string): void {
    // Registra acerto no progresso (contagem simples via estrelas)
    // Detalhes de histórico vão para IndexedDB via recordSession
    lsWrite(LS_KEY, this.progress);
  }

  getMistakeProfile(): MistakeProfile {
    return { ...this.mistakeProfile };
  }

  // ── Conquistas ──────────────────────────────────────────────

  unlockAchievement(id: string): void {
    const achievement = this.achievements.find((a) => a.id === id);
    if (achievement && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = new Date();
      lsWrite(LS_ACHIEVEMENTS_KEY, this.achievements);
    }
  }

  getAchievements(): Achievement[] {
    return this.achievements.map((a) => ({ ...a }));
  }

  // ── Histórico de sessões ────────────────────────────────────

  async getSessionHistory(days?: number): Promise<Session[]> {
    const sessions = await idbReadSessions();
    const limitDays = days ?? MAX_LS_SESSIONS_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - limitDays);

    return sessions.filter((s) => {
      const start = new Date(s.startTime);
      return start >= cutoff;
    });
  }

  // ── Exportação e reset ──────────────────────────────────────

  exportData(): string {
    return JSON.stringify({
      progress: this.progress,
      mistakeProfile: this.mistakeProfile,
      achievements: this.achievements,
      // Sessões recentes (memória)
      sessions: this.sessionBuffer,
    });
  }

  clearData(): void {
    this.progress = { ...INITIAL_PROGRESS };
    this.mistakeProfile = {};
    this.achievements = ACHIEVEMENTS.map((a) => ({ ...a }));
    this.sessionBuffer = [];

    lsWrite(LS_KEY, this.progress);
    lsWrite(LS_MISTAKES_KEY, this.mistakeProfile);
    lsWrite(LS_ACHIEVEMENTS_KEY, this.achievements);

    // Limpa IndexedDB
    void openIDB().then((db) => {
      if (!db) {
        try { localStorage.removeItem(LS_SESSIONS_KEY); } catch { /* noop */ }
        return;
      }
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).clear();
    });
  }

  /** Indica se o IndexedDB falhou (para exibir aviso na UI) */
  isIndexedDBUnavailable(): boolean {
    return idbFailed;
  }
}

export const progressStore = new ProgressStore();
