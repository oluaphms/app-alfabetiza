type Props = { mood?: "happy" | "cheer" | "think"; size?: number };

export function Polvinho({ mood = "happy", size = 120 }: Props) {
  const eyeY = mood === "think" ? 50 : 48;
  const mouth =
    mood === "cheer"
      ? "M 42 62 Q 60 78 78 62"
      : mood === "think"
      ? "M 48 64 Q 60 60 72 64"
      : "M 46 62 Q 60 72 74 62";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className="drop-shadow-[0_6px_0_rgba(0,0,0,0.12)]"
      aria-hidden="true"
    >
      {/* tentacles */}
      {[20, 40, 60, 80, 100].map((x, i) => (
        <path
          key={i}
          d={`M ${x} 88 Q ${x + (i % 2 ? -6 : 6)} 104 ${x + (i % 2 ? 6 : -6)} 116`}
          stroke="var(--coral)"
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {/* body */}
      <ellipse cx="60" cy="55" rx="42" ry="40" fill="var(--coral)" />
      <ellipse cx="60" cy="50" rx="36" ry="32" fill="color-mix(in oklch, var(--coral) 75%, white)" opacity="0.45" />
      {/* eyes */}
      <circle cx="46" cy={eyeY} r="9" fill="white" />
      <circle cx="74" cy={eyeY} r="9" fill="white" />
      <circle cx="48" cy={eyeY + 2} r="4" fill="#1a1a2e" />
      <circle cx="76" cy={eyeY + 2} r="4" fill="#1a1a2e" />
      <circle cx="49" cy={eyeY + 1} r="1.4" fill="white" />
      <circle cx="77" cy={eyeY + 1} r="1.4" fill="white" />
      {/* mouth */}
      <path d={mouth} stroke="#1a1a2e" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* cheeks */}
      <circle cx="38" cy="60" r="4" fill="var(--coral)" opacity="0.6" />
      <circle cx="82" cy="60" r="4" fill="var(--coral)" opacity="0.6" />
    </svg>
  );
}
