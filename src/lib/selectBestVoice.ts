// ============================================================
// selectBestVoice.ts — Seleção inteligente de voz para
// Web Speech API com sistema de pontuação (ranking).
// Módulo puro: sem dependências React ou de framework.
// ============================================================

// ── Detecção de gênero e qualidade ───────────────────────────
// Definidas fora da função para evitar recriar closures a cada chamada.

const FEMALE_KEYWORDS: readonly string[] = [
  "female", "feminina", "mulher", "woman",
  "francisca", "vitoria", "vitória", "luciana", "joana",
  "ana", "camila", "isabela", "fernanda", "julia", "júlia",
  "maria", "bruna", "beatriz", "alice", "lara",
  "letícia", "leticia", "sabrina",
  "google português",
];

const NEURAL_KEYWORDS: readonly string[] = [
  "neural", "natural", "premium", "enhanced", "wavenet", "studio",
];

function isFemale(name: string): boolean {
  return FEMALE_KEYWORDS.some((kw) => name.includes(kw));
}

function isNeural(name: string): boolean {
  return NEURAL_KEYWORDS.some((kw) => name.includes(kw));
}

/**
 * Pontuação de cada voz candidata e retorna a melhor disponível.
 *
 * Prioridade (maior pontuação vence):
 *  1. Voz feminina em português do Brasil + Neural        → 100
 *  2. Voz feminina em português do Brasil                 →  80
 *  3. Voz Neural em português do Brasil                   →  70
 *  4. Qualquer voz em português do Brasil                 →  60
 *  5. Voz feminina em português de Portugal               →  50
 *  6. Qualquer voz feminina em português                  →  40
 *  7. Qualquer voz em português                           →  30
 *  8. Melhor voz restante (score 0)                       →   0
 */
function scoreVoice(voice: SpeechSynthesisVoice): number {
  const lang    = voice.lang.toLowerCase();
  const name    = voice.name.toLowerCase();
  const isPtBR  = lang === "pt-br" || lang === "pt_br";
  const isPtPT  = lang === "pt-pt" || lang === "pt_pt";
  const isPt    = lang.startsWith("pt");
  const female  = isFemale(name);
  const neural  = isNeural(name);

  if (isPtBR && female && neural) return 100;
  if (isPtBR && female)           return 80;
  if (isPtBR && neural)           return 70;
  if (isPtBR)                     return 60;
  if (isPtPT && female)           return 50;
  if (isPt   && female)           return 40;
  if (isPt)                       return 30;
  return 0;
}

/**
 * Percorre a lista de vozes, aplica o sistema de pontuação e retorna
 * a melhor voz disponível, ou `null` se a lista estiver vazia.
 *
 * A lista já deve vir de `speechSynthesis.getVoices()` — esta função
 * não acessa o browser diretamente, facilitando testes unitários.
 */
export function selectBestVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  let best      = voices[0];
  let bestScore = scoreVoice(voices[0]);

  for (let i = 1; i < voices.length; i++) {
    const score = scoreVoice(voices[i]);
    if (score > bestScore) {
      bestScore = score;
      best      = voices[i];
    }
  }

  return best;
}
