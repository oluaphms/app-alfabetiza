import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHILD_SPEECH_CONFIG } from "@/lib/speechConfig";
import { numberToWords } from "@/lib/numberToWords";
import { LETRAS_MSG, MATH_MSG } from "@/lib/speechMessages";
import { speechService } from "@/lib/speechService";
import { createFileRoute } from "@tanstack/react-router";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/600.css";
import "@fontsource/fredoka/700.css";
import "@fontsource/baloo-2/400.css";
import "@fontsource/baloo-2/600.css";
import "@fontsource/baloo-2/700.css";
import { Polvinho } from "@/components/Polvinho";
import { Star } from "@/components/Star";
import { WORDS } from "./WORDS";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Ilha das Letrinhas e Numerinhos" },
      {
        name: "description",
        content:
          "Jogo infantil de alfabetização e matemática para crianças de 6 e 7 anos: complete palavras e resolva as 4 operações com o Polvinho.",
      },
      { property: "og:title", content: "Ilha das Letrinhas e Numerinhos" },
      {
        property: "og:description",
        content: "Aprenda letras e matemática brincando com o Polvinho.",
      },
    ],
  }),
  component: Game,
});

type Screen = "map" | "letras" | "matematica";
type Op = "+" | "-" | "×" | "÷";

const FRUITS = ["🍎", "🍌", "🍓", "🍇", "🍊", "🥝", "🍒", "🍑", "🍐", "🥭", "🍍", "🥥"];

type Difficulty = "facil" | "medio" | "dificil";

function rand(max: number) {
  return Math.floor(Math.random() * max);
}

// ─── Speech hook — wrapper fino sobre o SpeechService singleton ─────────────
//
// Toda a lógica de cancelamento, enqueue e seleção de voz vive em
// speechService. Este hook apenas expõe speak/stop para componentes React
// e garante que stop() seja chamado no cleanup (unmount / troca de desafio).

function useSpeech() {
  const speak = useCallback((text: string, rate?: number) => {
    speechService.speak(text, { rate });
  }, []);

  const stop = useCallback(() => {
    speechService.stop();
  }, []);

  return { speak, stop, supported: speechService.isSupported() };
}

// ─── SpeakButton component ────────────────────────────────────────────────────

function SpeakButton({ onSpeak, label = "Ouvir" }: { onSpeak: () => void; label?: string }) {
  const [active, setActive] = useState(false);
  function handleClick() {
    setActive(true);
    onSpeak();
    setTimeout(() => setActive(false), 1200);
  }
  return (
    <button
      onClick={handleClick}
      aria-label={label}
      title={label}
      className={[
        "flex items-center gap-1.5 px-3 py-2 rounded-2xl font-display font-bold text-sm border-2 chunky-shadow-sm transition-all",
        active
          ? "bg-ocean border-ocean text-white scale-95"
          : "bg-card border-foreground/15 text-foreground hover:-translate-y-0.5 active:translate-y-0.5",
      ].join(" ")}
    >
      <span className="text-lg" aria-hidden="true">{active ? "🔈" : "🔊"}</span>
      {label}
    </button>
  );
}

// ─── Letras: word-building challenge ────────────────────────────────────────

interface LetrasChallenge {
  word: string;
  emoji: string;
  /** Letras embaralhadas disponíveis para clicar */
  shuffled: Array<{ letter: string; id: string }>;
}

let _idCounter = 0;

function makeLetrasChallenge(): LetrasChallenge {
  const pick = WORDS[rand(WORDS.length)];
  const letters = pick.word.split("");
  let shuffled: string[];
  let attempts = 0;
  do {
    shuffled = [...letters].sort(() => Math.random() - 0.5);
    attempts++;
  } while (
    attempts < 20 &&
    shuffled.every((l, i) => l === letters[i])
  );
  return {
    word: pick.word,
    emoji: pick.emoji,
    // IDs únicos globais para evitar colisão quando a mesma letra aparece múltiplas vezes
    shuffled: shuffled.map((letter) => ({ letter, id: `letter-${++_idCounter}` })),
  };
}

function LetrasScreen({ onWin, onBack }: { onWin: () => void; onBack: () => void }) {
  const { speak, stop } = useSpeech();

  // Inicialização em uma única chamada para garantir consistência entre challenge e placed
  const [{ challenge, placed }, setState] = useState(() => {
    const c = makeLetrasChallenge();
    return {
      challenge: c,
      placed: Array(c.word.length).fill(null) as Array<{ letter: string; id: string } | null>,
    };
  });
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Fala a palavra ao apresentar novo desafio
  useEffect(() => {
    const t = setTimeout(() => {
      speak(LETRAS_MSG.apresentarPalavra(challenge.word.toLowerCase()), CHILD_SPEECH_CONFIG.rateSlow);
    }, 400);
    return () => { clearTimeout(t); stop(); };
  }, [challenge.word, speak, stop]);

  function speakWord() {
    speak(LETRAS_MSG.apresentarPalavra(challenge.word.toLowerCase()), CHILD_SPEECH_CONFIG.rateSlow);
  }

  function loadChallenge(c: LetrasChallenge) {
    setState({ challenge: c, placed: Array(c.word.length).fill(null) });
    setUsedIds(new Set());
    setShake(false);
    setSuccess(false);
    setShowConfetti(false);
  }

  function handleNextChallenge() {
    loadChallenge(makeLetrasChallenge());
  }

  function handlePickLetter(item: { letter: string; id: string }) {
    if (usedIds.has(item.id) || success) return;
    // Fala o nome correto da letra ao clicar (ex: "B" → "Bê")
    speak(LETRAS_MSG.nomeDaLetra(item.letter), CHILD_SPEECH_CONFIG.rateFast);
    const firstEmpty = placed.findIndex((p) => p === null);
    if (firstEmpty === -1) return;
    const newPlaced = [...placed];
    newPlaced[firstEmpty] = item;
    const newUsed = new Set(usedIds);
    newUsed.add(item.id);
    setState({ challenge, placed: newPlaced });
    setUsedIds(newUsed);

    const allFilled = newPlaced.every((p) => p !== null);
    if (allFilled) {
      const formed = newPlaced.map((p) => p!.letter).join("");
      if (formed === challenge.word) {
        setSuccess(true);
        setShowConfetti(true);
        onWin();
        setTimeout(() => {
          speak(LETRAS_MSG.acertoFala(challenge.word.toLowerCase()), CHILD_SPEECH_CONFIG.rate);
        }, 300);
        setTimeout(() => setShowConfetti(false), 1500);
      } else {
        setShake(true);
        speak(LETRAS_MSG.erroFala, CHILD_SPEECH_CONFIG.rateFast);
        setTimeout(() => {
          setShake(false);
          setState({ challenge, placed: Array(challenge.word.length).fill(null) });
          setUsedIds(new Set());
        }, 700);
      }
    }
  }

  function handleRemoveLetter(idx: number) {
    if (success) return;
    const item = placed[idx];
    if (!item) return;
    const newPlaced = [...placed];
    newPlaced[idx] = null;
    const newUsed = new Set(usedIds);
    newUsed.delete(item.id);
    setState({ challenge, placed: newPlaced });
    setUsedIds(newUsed);
  }

  const polvinhoMood = success ? "cheer" as const : shake ? "think" as const : "happy" as const;
  const polvinhoMsg = success
    ? LETRAS_MSG.acertoBalao(challenge.word)
    : shake
      ? LETRAS_MSG.erroBalao
      : LETRAS_MSG.instrucao;

  return (
    <section className="pt-4 pb-8">
      {/* Back */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-display font-bold text-sm bg-card border-2 border-foreground/10 chunky-shadow-sm text-foreground hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
          aria-label="Voltar ao mapa"
        >
          ← Voltar
        </button>
      </div>

      <PolvinhoSpeech message={polvinhoMsg} mood={polvinhoMood} />

      <div className="bg-card rounded-4xl border-4 border-foreground/10 chunky-shadow p-5 md:p-8 text-center mt-2">
        {/* Emoji + botão de áudio */}
        <div className="flex flex-col items-center gap-3 mb-1">
          <div
            className="text-7xl md:text-8xl inline-block transition-transform"
            style={{ transform: success ? "scale(1.2)" : "scale(1)" }}
            aria-label={challenge.word}
            role="img"
          >
            {challenge.emoji}
          </div>
          <SpeakButton onSpeak={speakWord} label={`Ouvir "${challenge.word.toLowerCase()}"`} />
        </div>

        {/* Slots para montar a palavra */}
        <div
          className={`flex justify-center gap-2 mt-4 flex-wrap ${shake ? "animate-shake" : ""}`}
          aria-label={`Palavra formada: ${placed.map((p) => p?.letter ?? "_").join("")}`}
          aria-live="polite"
        >
          {placed.map((p, i) => (
            <button
              key={i}
              onClick={() => handleRemoveLetter(i)}
              disabled={success}
              aria-label={p ? `Remover letra ${p.letter} da posição ${i + 1}` : `Posição ${i + 1} vazia`}
              className={[
                "w-12 h-14 md:w-14 md:h-16 rounded-2xl border-4 flex items-center justify-center font-display font-bold text-2xl md:text-3xl transition-all",
                p
                  ? success
                    ? "bg-leaf border-leaf text-white scale-105 chunky-shadow-sm"
                    : "bg-ocean border-ocean text-white chunky-shadow-sm cursor-pointer hover:scale-95"
                  : "bg-sky/30 border-dashed border-foreground/20 text-foreground/30",
              ].join(" ")}
            >
              {p?.letter ?? ""}
            </button>
          ))}
        </div>

        <p className="font-display text-xs text-muted-foreground mt-2">
          {success ? "" : placed.some((p) => p !== null) ? "Toque numa letra para removê-la" : ""}
        </p>

        {/* Separador */}
        <div className="my-5 border-t-2 border-dashed border-foreground/10" aria-hidden="true" />

        {/* Banco de letras embaralhadas */}
        <p className="font-display font-bold text-sm text-muted-foreground mb-3 uppercase tracking-wide">
          Letras disponíveis
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          {challenge.shuffled.map((item) => {
            const used = usedIds.has(item.id);
            return (
              <button
                key={item.id}
                onClick={() => handlePickLetter(item)}
                disabled={used || success}
                aria-label={`Letra ${item.letter}`}
                className={[
                  "w-12 h-12 md:w-14 md:h-14 rounded-2xl border-4 font-display font-bold text-2xl md:text-3xl transition-all",
                  used || success
                    ? "opacity-20 cursor-not-allowed border-foreground/10 bg-muted text-muted-foreground"
                    : "bg-accent border-foreground/15 text-foreground chunky-shadow-sm hover:-translate-y-1 active:translate-y-0.5 cursor-pointer",
                ].join(" ")}
              >
                {item.letter}
              </button>
            );
          })}
        </div>

        {/* Botão próxima palavra após acerto */}
        {success && (
          <div className="mt-6 animate-pop">
            <div className="flex justify-center gap-1 mb-3">
              <Star size={28} filled />
              <Star size={28} filled />
              <Star size={28} filled />
            </div>
            <button
              onClick={handleNextChallenge}
              className="px-8 py-3 rounded-2xl font-display font-bold text-lg bg-ocean text-white chunky-shadow border-2 border-ocean hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
            >
              Próxima palavra ▶
            </button>
          </div>
        )}
      </div>

      {showConfetti && <ConfettiBurst />}
    </section>
  );
}

// ─── Math types ──────────────────────────────────────────────────────────────

type MathPhase = "presenting" | "locked" | "playing" | "tooFast" | "teaching" | "result";

interface MathStats {
  totalAnswered: number;
  firstAttemptCorrect: number;
  secondAttemptCorrect: number;
  learningModeUsed: number;
  totalXP: number;
  fastClicks: number;
}

function loadStats(): MathStats {
  if (typeof window === "undefined") return { totalAnswered: 0, firstAttemptCorrect: 0, secondAttemptCorrect: 0, learningModeUsed: 0, totalXP: 0, fastClicks: 0 };
  try { return JSON.parse(window.localStorage.getItem("math-stats") ?? "{}") || { totalAnswered: 0, firstAttemptCorrect: 0, secondAttemptCorrect: 0, learningModeUsed: 0, totalXP: 0, fastClicks: 0 }; }
  catch { return { totalAnswered: 0, firstAttemptCorrect: 0, secondAttemptCorrect: 0, learningModeUsed: 0, totalXP: 0, fastClicks: 0 }; }
}

function saveStats(s: MathStats) {
  if (typeof window !== "undefined") window.localStorage.setItem("math-stats", JSON.stringify(s));
}

function makeMathChallenge(op: Op, diff: Difficulty = "facil") {
  let a = 0, b = 0, answer = 0;
  if (op === "+") {
    const max = diff === "facil" ? 6 : diff === "medio" ? 12 : 20;
    a = 1 + rand(max); b = 1 + rand(max); answer = a + b;
  } else if (op === "-") {
    const max = diff === "facil" ? 8 : diff === "medio" ? 15 : 25;
    a = 3 + rand(max); b = 1 + rand(a - 1); answer = a - b;
  } else if (op === "×") {
    const max = diff === "facil" ? 4 : diff === "medio" ? 6 : 9;
    a = 2 + rand(max); b = 2 + rand(max); answer = a * b;
  } else {
    const maxDiv = diff === "facil" ? 3 : diff === "medio" ? 5 : 7;
    const maxAns = diff === "facil" ? 4 : diff === "medio" ? 6 : 9;
    b = 2 + rand(maxDiv); answer = 1 + rand(maxAns); a = b * answer;
  }
  const fruit = FRUITS[rand(FRUITS.length)];
  return { a, b, op, answer, fruit };
}

// ─── Polvinho speech bubble ───────────────────────────────────────────────────

function PolvinhoSpeech({ message, mood }: { message: string; mood: "happy" | "cheer" | "think" }) {
  return (
    <div className="flex items-end gap-3 mb-4">
      <Polvinho mood={mood} size={72} />
      <div className="relative bg-card border-2 border-foreground/10 chunky-shadow-sm rounded-3xl rounded-bl-sm px-4 py-3 max-w-[220px]">
        <p className="font-display font-bold text-base text-foreground leading-snug">{message}</p>
        <span className="absolute -left-3 bottom-3 w-3 h-3 bg-card border-l-2 border-b-2 border-foreground/10 rotate-45" aria-hidden="true" />
      </div>
    </div>
  );
}

// ─── Animated counting overlay ────────────────────────────────────────────────

function CountingAnimation({ total, emoji, onDone }: { total: number; emoji: string; onDone: () => void }) {
  const [revealed, setRevealed] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    if (total === 0) { onDone(); return; }
    const cap = Math.min(total, 12); // cap visual at 12 to avoid overflow
    let i = 0;
    const step = () => {
      i++;
      setRevealed(i);
      if (i < cap) {
        setTimeout(step, 420);
      } else if (!doneRef.current) {
        doneRef.current = true;
        setTimeout(onDone, 800);
      }
    };
    const t = setTimeout(step, 300);
    return () => clearTimeout(t);
  }, [total, onDone]);

  const cap = Math.min(total, 12);

  return (
    <div className="text-center py-4" aria-live="polite" aria-label={`Contando: ${revealed} de ${cap}`}>
      <div className="flex flex-wrap justify-center gap-2 min-h-[60px]">
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            className="relative inline-flex flex-col items-center"
            style={{
              opacity: i < revealed ? 1 : 0.15,
              transform: i === revealed - 1 ? "scale(1.35)" : "scale(1)",
              transition: "opacity 0.2s, transform 0.25s cubic-bezier(.34,1.56,.64,1)",
            }}
          >
            <span className="text-3xl">{emoji}</span>
            {i < revealed && (
              <span className="absolute -top-1 -right-1 bg-sun text-foreground font-display font-bold text-xs rounded-full w-5 h-5 flex items-center justify-center chunky-shadow-sm">
                {i + 1}
              </span>
            )}
          </span>
        ))}
      </div>
      <p className="font-display font-bold text-2xl mt-3 text-foreground">
        {revealed > 0 ? `${revealed}${revealed === cap ? " 🎉" : "..."}` : ""}
        {total > 12 && cap === 12 && revealed === 12 ? ` = ${total}` : ""}
      </p>
    </div>
  );
}

// ─── Confetti burst ───────────────────────────────────────────────────────────

function ConfettiBurst() {
  const pieces = ["🌟", "⭐", "✨", "🎉", "💫", "🌈"];
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-50" aria-hidden="true">
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          className="absolute text-2xl animate-burst"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${10 + Math.random() * 60}%`,
            animationDelay: `${Math.random() * 0.4}s`,
            animationDuration: `${0.6 + Math.random() * 0.4}s`,
          }}
        >
          {pieces[i % pieces.length]}
        </span>
      ))}
    </div>
  );
}

// ─── Star award display ───────────────────────────────────────────────────────

function StarAward({ count }: { count: 1 | 2 | 3 }) {
  return (
    <div className="flex justify-center gap-1 my-2" role="img" aria-label={`${count} estrelas`}>
      {[1, 2, 3].map((i) => (
        <Star key={i} size={28} filled={i <= count} />
      ))}
    </div>
  );
}

// ─── XP badge ────────────────────────────────────────────────────────────────

function XPBadge({ xp }: { xp: number }) {
  return (
    <span className="inline-flex items-center gap-1 bg-sun/20 text-foreground font-display font-bold text-sm px-3 py-1 rounded-full border border-sun/40">
      +{xp} XP ⚡
    </span>
  );
}

// ─── MathRound — digit-building mechanic (same logic as Letras) ──────────────

function MathRound({ op, diff, onWin, onBack }: { op: Op; diff: Difficulty; onWin: (stars: 1 | 2 | 3, xp: number) => void; onBack: () => void }) {
  const { speak, stop } = useSpeech();
  const [c, setC] = useState(() => makeMathChallenge(op, diff));
  const [phase, setPhase] = useState<MathPhase>("presenting");
  const [typed, setTyped] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [countTarget, setCountTarget] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [lastResult, setLastResult] = useState<{ stars: 1 | 2 | 3; xp: number } | null>(null);

  const answerDigits = String(c.answer).length;

  // Texto legível da operação
  const opName: Record<Op, string> = { "+": "mais", "-": "menos", "×": "vezes", "÷": "dividido por" };

  function speakChallenge() {
    speak(MATH_MSG.apresentarEquacao(numberToWords(c.a), opName[op], numberToWords(c.b)), CHILD_SPEECH_CONFIG.rate);
  }

  // On new challenge: present → lock 2s → play + fala automática
  useEffect(() => {
    setPhase("presenting");
    setTyped([]);
    setShake(false);
    setAttempts(0);
    setCountTarget(null);
    setLastResult(null);
    // Fala a equação ao apresentar
    const tSpeak = setTimeout(() => speak(MATH_MSG.apresentarEquacao(numberToWords(c.a), opName[op], numberToWords(c.b)), CHILD_SPEECH_CONFIG.rate), 500);
    const t1 = setTimeout(() => setPhase("locked"), 800);
    const t2 = setTimeout(() => setPhase("playing"), 2800);
    return () => { clearTimeout(tSpeak); clearTimeout(t1); clearTimeout(t2); stop(); };
  }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  const polvinhoMsg = useMemo(() => {
    if (phase === "presenting") return { text: MATH_MSG.balaoApresentando,   mood: "cheer" as const };
    if (phase === "locked")     return { text: MATH_MSG.balaoConte,           mood: "think" as const };
    if (phase === "playing" && attempts === 0) return { text: MATH_MSG.balaoJogando,        mood: "happy" as const };
    if (phase === "playing" && attempts === 1) return { text: MATH_MSG.balaoTentaNovamente, mood: "think" as const };
    if (phase === "teaching")   return { text: MATH_MSG.balaoContagem,        mood: "cheer" as const };
    if (phase === "result" && lastResult?.stars === 3) return { text: MATH_MSG.balaoPerfeito, mood: "cheer" as const };
    if (phase === "result" && lastResult?.stars === 2) return { text: MATH_MSG.balaoMuiBom,   mood: "cheer" as const };
    return { text: MATH_MSG.balaoAprendeu, mood: "happy" as const };
  }, [phase, attempts, lastResult]);

  // Add a digit
  function handleDigit(d: string) {
    if (phase !== "playing") return;
    if (typed.length >= answerDigits) return; // already full
    const next = [...typed, d];
    setTyped(next);
    // Auto-check when all slots filled
    if (next.length === answerDigits) {
      checkAnswer(next);
    }
  }

  // Remove last digit
  function handleBackspace() {
    if (phase !== "playing") return;
    setTyped((t) => t.slice(0, -1));
  }

  function checkAnswer(digits: string[]) {
    const formed = parseInt(digits.join(""), 10);
    if (formed === c.answer) {
      const starsMap: Record<number, 1 | 2 | 3> = { 0: 3, 1: 2 };
      const stars = starsMap[attempts] ?? 1;
      const xpMap: Record<number, number> = { 0: 15, 1: 8 };
      const xp = xpMap[attempts] ?? 3;
      const stats = loadStats();
      stats.totalAnswered = (stats.totalAnswered || 0) + 1;
      if (attempts === 0) stats.firstAttemptCorrect = (stats.firstAttemptCorrect || 0) + 1;
      else if (attempts === 1) stats.secondAttemptCorrect = (stats.secondAttemptCorrect || 0) + 1;
      stats.totalXP = (stats.totalXP || 0) + xp;
      saveStats(stats);
      setLastResult({ stars, xp });
      setShowConfetti(true);
      setPhase("result");
      setTimeout(() => speak(MATH_MSG.acertoEquacao(numberToWords(c.a), opName[op], numberToWords(c.b), numberToWords(c.answer)), CHILD_SPEECH_CONFIG.rate), 300);
      setTimeout(() => setShowConfetti(false), 1500);
      onWin(stars, xp);
    } else {
      setShake(true);
      speak(MATH_MSG.erroTentativa, CHILD_SPEECH_CONFIG.rateFast);
      setTimeout(() => {
        setShake(false);
        setTyped([]);
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= 2) {
          const stats = loadStats();
          stats.learningModeUsed = (stats.learningModeUsed || 0) + 1;
          saveStats(stats);
          setPhase("teaching");
          setCountTarget(c.answer);
          setTimeout(() => speak(MATH_MSG.modoContagem, CHILD_SPEECH_CONFIG.rateFast), 200);
        }
      }, 700);
    }
  }

  const handleTeachingDone = useCallback(() => {
    const stars: 1 = 1;
    const xp = 3;
    const stats = loadStats();
    stats.totalAnswered = (stats.totalAnswered || 0) + 1;
    stats.totalXP = (stats.totalXP || 0) + xp;
    saveStats(stats);
    setLastResult({ stars, xp });
    setShowConfetti(true);
    setPhase("result");
    setTyped(String(c.answer).split(""));
    speak(MATH_MSG.acertoContagem(numberToWords(c.answer)), CHILD_SPEECH_CONFIG.rate);
    setTimeout(() => setShowConfetti(false), 1500);
    onWin(stars, xp);
  }, [c, onWin, speak]);

  const handleNext = useCallback(() => {
    setC(makeMathChallenge(op, diff));
  }, [op, diff]);

  // Problem visuals (fruits)
  const visuals = useMemo(() => {
    if (op === "+" || op === "-") {
      return (
        <div className="flex items-center justify-center gap-4 flex-wrap text-3xl md:text-4xl">
          <FruitGroup count={c.a} emoji={c.fruit} highlight={phase === "presenting"} />
          <span className="font-display font-bold text-4xl text-foreground">{op}</span>
          <FruitGroup count={c.b} emoji={c.fruit} highlight={phase === "presenting"} />
        </div>
      );
    }
    if (op === "×") {
      return (
        <div className="space-y-1">
          {Array.from({ length: Math.min(c.a, 8) }).map((_, r) => (
            <div key={r} className="flex justify-center gap-1 text-2xl md:text-3xl">
              {Array.from({ length: Math.min(c.b, 8) }).map((_, k) => <span key={k}>{c.fruit}</span>)}
            </div>
          ))}
        </div>
      );
    }
    const per = c.a / c.b;
    return (
      <div className="flex justify-center gap-3 flex-wrap">
        {Array.from({ length: c.b }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-sand p-3 border-2 border-foreground/10">
            <div className="text-xs font-display text-muted-foreground mb-1">🧺</div>
            <div className="flex flex-wrap gap-1 max-w-[80px] text-xl justify-center">
              {Array.from({ length: per }).map((_, k) => <span key={k}>{c.fruit}</span>)}
            </div>
          </div>
        ))}
      </div>
    );
  }, [c, op, phase]);

  const isLocked = phase === "locked" || phase === "presenting" || phase === "teaching" || phase === "result";

  return (
    <div className="bg-card rounded-4xl border-4 border-foreground/10 chunky-shadow p-5 md:p-8 mt-4">
      <button onClick={onBack} className="text-sm font-display text-muted-foreground hover:text-foreground mb-3 block">
        ← trocar operação
      </button>

      <PolvinhoSpeech message={polvinhoMsg.text} mood={polvinhoMsg.mood} />

      {/* Teaching mode */}
      {phase === "teaching" && countTarget !== null ? (
        <div className="my-2">
          <p className="font-display font-bold text-center text-lg text-foreground mb-2">
            Vamos contar {c.a} {op} {c.b}:
          </p>
          <CountingAnimation total={countTarget} emoji={c.fruit} onDone={handleTeachingDone} />
        </div>
      ) : (
        <>
          {/* Problem visuals */}
          <div className={`my-4 min-h-[100px] flex items-center justify-center transition-opacity ${phase === "presenting" ? "opacity-60" : "opacity-100"}`}>
            {visuals}
          </div>

          {/* Equation + answer slots */}
          <div className="flex items-center justify-center gap-3 flex-wrap my-3">
            <span className="font-display font-bold text-3xl md:text-4xl">
              {c.a} <span className="text-ocean">{op}</span> {c.b} =
            </span>
            <SpeakButton onSpeak={speakChallenge} label="Ouvir" />
          </div>

          {/* Answer slots — same pattern as Letras */}
          <div
            className={`flex justify-center gap-2 mt-1 ${shake ? "animate-shake" : ""}`}
            aria-live="polite"
            aria-label={`Resposta digitada: ${typed.join("") || "vazia"}`}
          >
            {Array.from({ length: answerDigits }).map((_, i) => {
              const digit = typed[i];
              const isSuccess = phase === "result" && digit !== undefined;
              return (
                <div
                  key={i}
                  className={[
                    "w-14 h-16 md:w-16 md:h-20 rounded-2xl border-4 flex items-center justify-center font-display font-bold text-3xl md:text-4xl transition-all",
                    digit
                      ? isSuccess
                        ? "bg-leaf border-leaf text-white scale-105 chunky-shadow-sm"
                        : "bg-ocean border-ocean text-white chunky-shadow-sm"
                      : "bg-sky/30 border-dashed border-foreground/20 text-foreground/20",
                  ].join(" ")}
                >
                  {digit ?? ""}
                </div>
              );
            })}
            {/* Backspace button */}
            {typed.length > 0 && phase === "playing" && (
              <button
                onClick={handleBackspace}
                className="w-12 h-16 md:w-14 md:h-20 rounded-2xl border-4 border-foreground/15 bg-muted flex items-center justify-center text-2xl text-muted-foreground hover:bg-coral/20 hover:border-coral transition-all chunky-shadow-sm"
                aria-label="Apagar último dígito"
              >
                ⌫
              </button>
            )}
          </div>

          {/* Lock message */}
          {(phase === "locked" || phase === "presenting") && (
            <p className="text-center font-display font-bold text-muted-foreground text-base animate-pulse mt-3">
              Conte com calma... ⏳
            </p>
          )}

          {/* Digit pad */}
          {phase === "playing" && (
            <div className="mt-5">
              <p className="font-display font-bold text-sm text-muted-foreground text-center mb-3 uppercase tracking-wide">
                Digite a resposta
              </p>
              <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
                {["1","2","3","4","5","6","7","8","9","0"].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDigit(d)}
                    disabled={typed.length >= answerDigits}
                    aria-label={`Dígito ${d}`}
                    className={[
                      "h-12 md:h-14 rounded-2xl border-4 font-display font-bold text-xl md:text-2xl chunky-shadow-sm transition-all",
                      typed.length >= answerDigits
                        ? "opacity-30 cursor-not-allowed border-foreground/10 bg-muted text-muted-foreground"
                        : "bg-accent border-foreground/15 text-foreground hover:-translate-y-0.5 active:translate-y-0.5 cursor-pointer",
                    ].join(" ")}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Result panel */}
          {phase === "result" && lastResult && (
            <div className="mt-5 text-center animate-pop">
              <StarAward count={lastResult.stars} />
              <XPBadge xp={lastResult.xp} />
              <button
                onClick={handleNext}
                className="mt-4 px-8 py-3 rounded-2xl font-display font-bold text-lg bg-ocean text-white chunky-shadow border-2 border-ocean hover:-translate-y-0.5 active:translate-y-0.5 transition-transform block mx-auto"
              >
                Próxima ▶
              </button>
            </div>
          )}
        </>
      )}

      {showConfetti && <ConfettiBurst />}
    </div>
  );
}

function MathScreen({ onWin, onBack }: { onWin: () => void; onBack: () => void }) {
  const [op, setOp] = useState<Op | null>(null);
  const [diff, setDiff] = useState<Difficulty>("facil");
  const [totalStars, setTotalStars] = useState(0);
  const [totalXP, setTotalXP] = useState(() => loadStats().totalXP || 0);

  function handleWin(stars: 1 | 2 | 3, xp: number) {
    setTotalStars((s) => s + stars);
    setTotalXP((x) => x + xp);
    onWin(); // bubble up for global star count
  }

  return (
    <section className="pt-4">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl font-display font-bold text-sm bg-card border-2 border-foreground/10 chunky-shadow-sm text-foreground hover:-translate-y-0.5 active:translate-y-0.5 transition-transform"
          aria-label="Voltar ao mapa"
        >
          ← Voltar
        </button>
        {op && (
          <div className="flex items-center gap-3 ml-auto">
            <span className="font-display text-sm font-bold text-muted-foreground">⭐ {totalStars}</span>
            <span className="font-display text-sm font-bold text-muted-foreground">⚡ {totalXP} XP</span>
          </div>
        )}
      </div>

      <Header title="Reino dos Números" subtitle={op ? `Operação: ${op}` : "Escolha uma operação"} />

      {!op ? (
        <>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="font-display text-sm text-muted-foreground">Dificuldade:</span>
            {(["facil", "medio", "dificil"] as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDiff(d)}
                className="px-4 py-1.5 rounded-full font-display font-bold text-sm border-2 transition"
                style={{
                  background: diff === d ? "var(--ocean)" : "var(--card)",
                  color: diff === d ? "white" : "var(--foreground)",
                  borderColor: diff === d ? "var(--ocean)" : "var(--border)",
                }}
              >
                {d === "facil" ? "Fácil" : d === "medio" ? "Médio" : "Difícil"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {(["+", "-", "×", "÷"] as Op[]).map((o, i) => {
              const colors = ["var(--leaf)", "var(--coral)", "var(--grape)", "var(--ocean)"];
              return (
                <button
                  key={o}
                  onClick={() => setOp(o)}
                  className="aspect-square rounded-3xl chunky-shadow border-4 border-foreground/10 font-display font-bold text-6xl text-white transition hover:-translate-y-1 active:translate-y-1"
                  style={{ background: colors[i] }}
                >
                  {o}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <MathRound op={op} diff={diff} onWin={handleWin} onBack={() => setOp(null)} />
      )}
    </section>
  );
}

function Game() {
  const [screen, setScreen] = useState<Screen>("map");
  const [stars, setStars] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(window.localStorage.getItem("ilha-stars") ?? 0);
  });

  function addStar() {
    setStars((s) => {
      const n = s + 1;
      window.localStorage.setItem("ilha-stars", String(n));
      return n;
    });
  }

  return (
    <div className="min-h-screen pb-12">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between max-w-3xl mx-auto">
        <button
          onClick={() => setScreen("map")}
          className="flex items-center gap-2 font-display text-2xl md:text-3xl text-foreground"
          aria-label="Voltar ao mapa"
        >
          <img
            src="/1024.png"
            alt="Logo Ilha das Letrinhas"
            className="w-10 h-10 md:w-12 md:h-12 rounded-xl object-cover"
          />
          Ilha das Letrinhas
        </button>
        <div className="flex items-center gap-2 bg-card chunky-shadow-sm rounded-full px-4 py-2 border border-border">
          <Star />
          <span className="font-display font-bold text-lg">{stars}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5">
        {screen === "map" && <MapScreen onPick={setScreen} />}
        {screen === "letras" && <LetrasScreen onWin={addStar} onBack={() => setScreen("map")} />}
        {screen === "matematica" && <MathScreen onWin={addStar} onBack={() => setScreen("map")} />}
      </main>
    </div>
  );
}

function MapScreen({ onPick }: { onPick: (s: Screen) => void }) {
  return (
    <div className="text-center pt-4">
      {/* Logo principal — substitui Polvinho + frase de boas-vindas */}
      <div className="flex justify-center mb-8">
        <img
          src="/1024.png"
          alt="Ilha das Letrinhas e Numerinhos"
          className="w-52 h-52 md:w-64 md:h-64 rounded-4xl object-cover chunky-shadow"
          draggable={false}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-5 mt-2">
        <ReinoCard
          title="Reino das Letras"
          emoji="🔤"
          subtitle="Complete as palavras"
          bg="var(--coral)"
          onClick={() => onPick("letras")}
        />
        <ReinoCard
          title="Reino dos Números"
          emoji="🔢"
          subtitle="+ − × ÷ com frutinhas"
          bg="var(--ocean)"
          onClick={() => onPick("matematica")}
        />
      </div>
    </div>
  );
}

function ReinoCard({
  title, emoji, subtitle, bg, onClick,
}: { title: string; emoji: string; subtitle: string; bg: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group rounded-3xl p-6 text-left chunky-shadow border-4 border-foreground/10 transition-transform hover:-translate-y-1 active:translate-y-1 active:shadow-none"
      style={{ background: bg, color: "white" }}
    >
      <div className="text-6xl mb-2 group-hover:animate-wiggle inline-block">{emoji}</div>
      <h2 className="font-display font-bold text-2xl">{title}</h2>
      <p className="font-body text-white/90 text-base mt-1">{subtitle}</p>
      <span className="inline-block mt-4 font-display font-bold bg-white/25 backdrop-blur rounded-full px-4 py-1.5">
        Jogar →
      </span>
    </button>
  );
}

function FruitGroup({ count, emoji, highlight = false }: { count: number; emoji: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-1 max-w-[160px] justify-center transition-all ${highlight ? "scale-110" : ""}`}>
      {Array.from({ length: Math.min(count, 15) }).map((_, i) => (
        <span key={i} className="inline-block animate-pop">{emoji}</span>
      ))}
      {count > 15 && <span className="font-display font-bold text-sm text-muted-foreground self-end">+{count - 15}</span>}
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-4">
      <Polvinho mood="think" size={72} />
      <div>
        <h2 className="font-display font-bold text-2xl md:text-3xl">{title}</h2>
        <p className="text-muted-foreground font-body">{subtitle}</p>
      </div>
    </div>
  );
}

