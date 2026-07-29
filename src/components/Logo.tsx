export function Logo({ size = 16 }: { size?: number }) {
  const dot = Math.round(size * 0.56);
  return (
    <div className="flex items-center gap-2 font-semibold text-ink" style={{ fontSize: size }}>
      <span
        className="relative inline-block rounded-full border-[1.5px] border-gold"
        style={{ width: dot, height: dot }}
      >
        <span
          className="absolute rounded-full bg-gold"
          style={{ inset: Math.max(1, Math.round(dot * 0.22)) }}
        />
      </span>
      Unfold
    </div>
  );
}
