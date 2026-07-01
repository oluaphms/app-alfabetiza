// ============================================================
// speechConfig.ts — Configuração centralizada da qualidade
// de fala para crianças (Web Speech API).
//
// Todos os parâmetros de voz do aplicativo devem vir daqui.
// Altere apenas este arquivo para ajustar rate, pitch e volume
// globalmente, sem tocar em outros módulos.
// ============================================================

/** Parâmetros de fala otimizados para crianças de 6-7 anos.
 *
 *  - rate  0.85 → fala pausada, fácil de acompanhar
 *  - pitch 1.10 → tom levemente mais agudo, amigável e animado
 *  - volume 1.0 → volume máximo para não perder letras
 */
export const CHILD_SPEECH_CONFIG = {
  /** Velocidade padrão: pausada o suficiente para crianças acompanharem. */
  rate: 0.85,

  /** Velocidade reduzida: usada ao apresentar palavras ou fonemas. */
  rateSlow: 0.80,

  /** Velocidade ligeiramente mais rápida: feedback curto ("Quase!", "Muito bem!"). */
  rateFast: 0.90,

  /** Tom levemente agudo: voz amigável e animada. */
  pitch: 1.10,

  /** Volume máximo: garantir que cada sílaba seja audível. */
  volume: 1.0,

  /** Idioma principal. */
  lang: "pt-BR" as const,
} as const;

/**
 * Aplica a configuração de fala infantil a um `SpeechSynthesisUtterance`.
 * Aceita um `rate` opcional para ajustar a velocidade por contexto
 * (palavra, fonema, feedback), mantendo pitch e volume sempre fixos.
 *
 * @param utt   - A utterance a configurar.
 * @param rate  - Velocidade opcional (sobrescreve `CHILD_SPEECH_CONFIG.rate`).
 */
export function applyChildSpeechConfig(
  utt: SpeechSynthesisUtterance,
  rate?: number
): void {
  utt.lang   = CHILD_SPEECH_CONFIG.lang;
  utt.rate   = rate ?? CHILD_SPEECH_CONFIG.rate;
  utt.pitch  = CHILD_SPEECH_CONFIG.pitch;
  utt.volume = CHILD_SPEECH_CONFIG.volume;
}
