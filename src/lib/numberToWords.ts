// ============================================================
// numberToWords.ts — Conversor de números para texto em
// português do Brasil.
//
// Cobertura: 0 – 999 (suficiente para toda a narração
// matemática do aplicativo, que chega até ~90).
// Módulo puro: sem dependências externas.
// ============================================================

const UNITS: readonly string[] = [
  "zero", "um", "dois", "três", "quatro", "cinco",
  "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze",
  "dezesseis", "dezessete", "dezoito", "dezenove",
];

const TENS: readonly string[] = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta",
  "sessenta", "setenta", "oitenta", "noventa",
];

const HUNDREDS: readonly string[] = [
  "", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

/**
 * Converte um número inteiro (0–999) para o texto por extenso
 * em português do Brasil.
 *
 * Exemplos:
 *   numberToWords(3)   → "três"
 *   numberToWords(12)  → "doze"
 *   numberToWords(25)  → "vinte e cinco"
 *   numberToWords(100) → "cem"
 *   numberToWords(101) → "cento e um"
 *   numberToWords(200) → "duzentos"
 *
 * @param n - Número inteiro entre 0 e 999.
 * @returns  Texto por extenso ou a string do número se fora do intervalo.
 */
export function numberToWords(n: number): string {
  // Garante inteiro e trata negativos
  const value = Math.round(n);

  if (value < 0) return `menos ${numberToWords(-value)}`;

  if (value < 20) return UNITS[value];

  if (value < 100) {
    const tens  = Math.floor(value / 10);
    const units = value % 10;
    return units === 0
      ? TENS[tens]
      : `${TENS[tens]} e ${UNITS[units]}`;
  }

  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const remainder = value % 100;

    // 100 exato → "cem"; 101-199 → "cento e ..."
    const hundredWord = hundreds === 1 && remainder > 0
      ? "cento"
      : HUNDREDS[hundreds];

    return remainder === 0
      ? hundredWord
      : `${hundredWord} e ${numberToWords(remainder)}`;
  }

  // Fora do intervalo — retorna o número como string para não silenciar
  return String(value);
}
