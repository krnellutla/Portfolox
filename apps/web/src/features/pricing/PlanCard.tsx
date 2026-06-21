import type { Plan } from '../../lib/types.js';

interface PlanCardProps {
  plan: Plan;
  billing: 'monthly' | 'annual';
}

export function PlanCard({ plan, billing }: PlanCardProps) {
  const { highlighted } = plan;
  const price = billing === 'annual' ? Math.round(plan.priceMonthly * 0.8) : plan.priceMonthly;

  return (
    <div
      className={`flex flex-col rounded-card px-[26px] py-[30px] border ${
        highlighted ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink border-line'
      }`}
    >
      <p
        className={`font-mono text-[10.5px] uppercase tracking-label mb-4 ${
          highlighted ? 'text-paper/60' : 'text-muted'
        }`}
      >
        {plan.tagline}
      </p>

      <div className="flex items-baseline gap-1 mb-1.5 mt-4">
        <span className="font-serif text-[48px] leading-none">${price}</span>
        <span className={`text-[15px] ${highlighted ? 'opacity-60' : 'text-muted'}`}>/mo</span>
      </div>

      <p className="font-serif text-[24px] mb-[22px]">{plan.name}</p>

      <ul className="flex flex-col gap-[11px] mb-[26px] flex-1">
        {plan.features.map((f) => (
          <li
            key={f}
            className={`flex gap-2.5 text-sm leading-snug ${
              highlighted ? 'text-paper/85' : 'text-ink-3'
            }`}
          >
            <span className={highlighted ? 'text-paper' : 'text-ink'}>—</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        className={`mt-auto w-full py-[13px] rounded-[9px] font-semibold text-[14.5px] transition-colors duration-150 ${
          highlighted
            ? 'bg-paper text-ink hover:bg-canvas'
            : 'bg-ink text-paper hover:bg-ink-2'
        }`}
      >
        Start free trial
      </button>
    </div>
  );
}
