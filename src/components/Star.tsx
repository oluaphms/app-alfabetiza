export function Star({ size = 22, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M12 2.5l2.9 6.1 6.6.7-4.9 4.6 1.4 6.6L12 17.3 5.9 20.5l1.4-6.6L2.5 9.3l6.6-.7L12 2.5z"
        fill={filled ? "var(--star)" : "transparent"}
        stroke="color-mix(in oklch, var(--foreground) 60%, transparent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
