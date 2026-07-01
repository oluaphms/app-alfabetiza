// ============================================================
// speechMessages.ts — Todas as mensagens faladas e exibidas
// pelo aplicativo, centralizadas em um único lugar.
//
// Critérios: tom amigável, encorajador e natural para
// crianças de 4 a 8 anos. Sem frases secas ou robóticas.
// ============================================================

// ── Pronúncia correta das letras do alfabeto ────────────────
//
// A Web Speech API lê uma letra isolada de formas inconsistentes
// entre navegadores (às vezes como som, às vezes como nome).
// Este mapa garante que a engine sempre receberá o nome correto
// da letra escrito por extenso, produzindo fala natural em pt-BR.

const LETTER_NAMES: Readonly<Record<string, string>> = {
  A: "A",
  B: "Bê",
  C: "Cê",
  D: "Dê",
  E: "E",
  F: "Efe",
  G: "Gê",
  H: "Agá",
  I: "I",
  J: "Jota",
  K: "Cá",
  L: "Ele",
  M: "Eme",
  N: "Ene",
  O: "O",
  P: "Pê",
  Q: "Quê",
  R: "Erre",
  S: "Esse",
  T: "Tê",
  U: "U",
  V: "Vê",
  W: "Dáblio",
  X: "Xis",
  Y: "Ípsilon",
  Z: "Zê",
};

/**
 * Retorna o nome correto de uma letra do alfabeto em português do Brasil.
 * Funciona com maiúsculas e minúsculas.
 *
 * Exemplos:
 *   letterName("b") → "Bê"
 *   letterName("H") → "Agá"
 *   letterName("r") → "Erre"
 *
 * @param letter - Caractere único (letra).
 * @returns O nome da letra por extenso, ou a própria letra se não mapeada.
 */
export function letterName(letter: string): string {
  return LETTER_NAMES[letter.toUpperCase()] ?? letter.toUpperCase();
}

// ── Letras ───────────────────────────────────────────────────

export const LETRAS_MSG = {
  /** Fala ao apresentar uma nova palavra (TTS) */
  apresentarPalavra: (word: string) =>
    `Olha que palavra bonita: ${word}!`,

  /** Bolha do Polvinho: estado neutro / aguardando */
  instrucao: "Clique nas letras para montar a palavra! 😊",

  /** Bolha: animação de erro */
  erroBalao: "Opa! Tenta outra ordem! 💙",

  /** Fala de erro (TTS) */
  erroFala: "Opa! Tenta de novo, você consegue!",

  /** Fala ao clicar em uma letra — usa o nome correto da letra */
  nomeDaLetra: (letter: string) => letterName(letter),

  /** Bolha: acerto */
  acertoBalao: (word: string) => `🎉 Isso! Você formou "${word}"!`,

  /** Fala de acerto (TTS) */
  acertoFala: (word: string) =>
    `Muito bem! Você formou a palavra ${word}! Que incrível!`,

  /** Instrução abaixo dos slots quando há letras colocadas */
  removerDica: "Toque numa letra para removê-la",

  /** Rótulo do banco de letras */
  bancoDeTitulo: "Letras disponíveis",

  /** Botão de próxima palavra */
  proximaPalavra: "Próxima palavra ▶",
} as const;

// ── Matemática — narração das equações ───────────────────────

export const MATH_MSG = {
  /**
   * Fala ao apresentar a equação (TTS).
   * @param a   - Número por extenso (ex: "três")
   * @param op  - Nome da operação (ex: "mais")
   * @param b   - Número por extenso (ex: "quatro")
   */
  apresentarEquacao: (a: string, op: string, b: string) =>
    `Vamos pensar juntos! Quanto é ${a} ${op} ${b}?`,

  /**
   * Fala de acerto (TTS).
   */
  acertoEquacao: (a: string, op: string, b: string, answer: string) =>
    `Parabéns! ${a} ${op} ${b} é igual a ${answer}. Você é demais!`,

  /**
   * Fala quando a criança erra pela primeira vez (TTS).
   */
  erroTentativa: "Quase! Não desiste, você vai conseguir!",

  /**
   * Fala ao entrar no modo de contagem assistida (TTS).
   */
  modoContagem: "Vamos contar juntinhos! Presta atenção!",

  /**
   * Fala ao concluir o modo de contagem (TTS).
   */
  acertoContagem: (answer: string) =>
    `Veja! A resposta é ${answer}. Aprendemos juntos, que orgulho!`,

  // ── Bolhas do Polvinho ─────────────────────────────────────

  /** Fase: apresentando a equação */
  balaoApresentando: "Olha o desafio novo! 🔢",

  /** Fase: aguardando a resposta (bloqueado) */
  balaoConte: "Pensa com calma... você sabe! 🤔",

  /** Fase: jogando — primeira tentativa */
  balaoJogando: "Qual é a resposta? Digita aí! 👇",

  /** Fase: jogando — segunda tentativa após erro */
  balaoTentaNovamente: "Quase! Mais uma tentativa, vai lá! 💙",

  /** Fase: modo de contagem assistida */
  balaoContagem: "Vamos contar juntinhos agora! 🧮",

  /** Fase: resultado com 3 estrelas */
  balaoPerfeito: "Uau! Acertou de primeira! Você é um gênio! 🌟",

  /** Fase: resultado com 2 estrelas */
  balaoMuiBom: "Muito bem! Você conseguiu! Continue assim! 🎉",

  /** Fase: resultado com 1 estrela (após modo assistido) */
  balaoAprendeu: "Que legal! Aprendemos juntos! ⭐",
} as const;
