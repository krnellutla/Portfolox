const STEPS = ['Account', 'Plan', 'Studio setup', 'Done'] as const;

interface StepIndicatorProps {
  current: number;
  onStepClick: (step: number) => void;
}

export function StepIndicator({ current, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <button
            onClick={() => onStepClick(i)}
            className="flex items-center gap-[11px] cursor-pointer"
          >
            <span
              className={`flex items-center justify-center w-8 h-8 rounded-full text-[13px] font-semibold transition-colors duration-150 ${
                i <= current
                  ? 'bg-ink text-paper'
                  : 'bg-surface border border-field text-muted'
              }`}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="text-[13px] font-semibold text-ink-3">{label}</span>
          </button>
          {i < STEPS.length - 1 && (
            <span className="w-[34px] h-px bg-field mx-[14px]" />
          )}
        </div>
      ))}
    </div>
  );
}
