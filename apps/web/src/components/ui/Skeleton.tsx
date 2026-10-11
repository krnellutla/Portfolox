// Skeleton tile — pulsing placeholder for grid/list loading states
export function SkeletonTile({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-field-bg border border-line rounded-[14px] animate-[pfxPulse_1.2s_ease-in-out_infinite] ${className}`}
    />
  );
}

export function SkeletonRow({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`}>
      <div className="h-10 w-10 shrink-0 rounded-[8px] bg-field-bg border border-line animate-[pfxPulse_1.2s_ease-in-out_infinite]" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded bg-field-bg border border-line animate-[pfxPulse_1.2s_ease-in-out_infinite]" />
        <div className="h-3 w-1/3 rounded bg-field-bg border border-line animate-[pfxPulse_1.2s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
