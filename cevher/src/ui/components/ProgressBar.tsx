export function ProgressBar({
  value,
  label,
  tone = 'gold',
  class: className,
}: {
  value: number;
  label?: string;
  tone?: 'gold' | 'turquoise' | 'amber';
  class?: string;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      class={`progress progress--${tone} ${className ?? ''}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div class="progress__fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
