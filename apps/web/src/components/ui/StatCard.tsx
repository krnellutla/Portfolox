export interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaDirection?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, delta, deltaDirection = 'neutral', className = '' }: StatCardProps) {
  const deltaColor =
    deltaDirection === 'up'
      ? 'text-positive'
      : deltaDirection === 'down'
        ? 'text-negative'
        : 'text-muted';

  return (
    <div className={`rounded-card bg-surface p-5 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-label text-muted">{label}</p>
      <p className="mt-2 font-serif text-[36px] font-[500] leading-none text-ink">{value}</p>
      {delta && (
        <p className={`mt-1.5 text-[12px] ${deltaColor}`}>{delta}</p>
      )}
    </div>
  );
}
