import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { TopNav } from '../../components/nav/TopNav.js';
import { PlanCard } from './PlanCard.js';
import { getPlans } from '../../api/plans.js';
import { qk } from '../../lib/query-client.js';
import { PLANS as FALLBACK_PLANS } from './mock.js';

type Billing = 'monthly' | 'annual';

// Payout example: 16×20" archival matte, $45 sale price, $22 print cost
const EXAMPLE_SALE = 4500;   // minor units
const EXAMPLE_COST = 2200;   // minor units
const EXAMPLE_MARKUP = EXAMPLE_SALE - EXAMPLE_COST; // 2300

const PAYOUT_PLANS = [
  { label: 'Solo',    commissionPct: 12 },
  { label: 'Studio',  commissionPct: 8 },
  { label: 'Atelier', commissionPct: 4 },
] as const;

function formatDollar(minorUnits: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export default function PricingPage() {
  const eyebrow = useEyebrow('08 — Pricing');
  const [billing, setBilling] = useState<Billing>('monthly');

  const { data: plans } = useQuery({
    queryKey: qk.plans(),
    queryFn: getPlans,
    placeholderData: FALLBACK_PLANS as never,
  });

  const displayPlans = plans ?? FALLBACK_PLANS;

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />

      <div className="max-w-prose mx-auto px-4 md:px-8 pt-16 pb-32 md:pb-24 animate-pfxFade">
        {/* Header */}
        <div className="text-center mb-12">
          <Eyebrow className="mb-5">{eyebrow}</Eyebrow>
          <h1 className="font-serif text-display-l font-[500] text-ink mb-4 leading-[1.05] tracking-[-0.02em]">
            Pricing that gets out of the way.
          </h1>
          <p className="text-[17px] leading-[1.55] text-ink-3 max-w-[50ch] mx-auto mb-6">
            Showing your work should never cost more than making it. Every plan includes
            the portfolio, the community, and a print store — you set the markup. We take
            a small commission on it — as low as 4%.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex bg-surface border border-line rounded-[999px] p-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-[999px] text-[13.5px] font-semibold transition-colors duration-150 ${
                billing === 'monthly' ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-[999px] text-[13.5px] font-semibold transition-colors duration-150 ${
                billing === 'annual' ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink'
              }`}
            >
              Annual · save 20%
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px] mb-14">
          {displayPlans.map((plan) => (
            <PlanCard key={plan.tier} plan={plan} billing={billing} />
          ))}
        </div>

        {/* Payout example card */}
        <div className="bg-surface border border-line rounded-[14px] p-6 max-w-[var(--container-prose)] mx-auto mt-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mb-1">
            Payout example
          </p>
          <h2 className="font-serif text-[22px] font-[500] text-ink mb-6">
            What you keep
          </h2>

          <div className="grid grid-cols-3 gap-6 divide-x divide-line">
            {PAYOUT_PLANS.map(({ label, commissionPct }) => {
              const keeps = Math.round(EXAMPLE_MARKUP * (1 - commissionPct / 100));
              return (
                <div key={label} className="pl-6 first:pl-0">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted mb-1">
                    {label}
                  </p>
                  <p className="font-serif text-[28px] font-[500] text-ink leading-tight">
                    {formatDollar(keeps)}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted mt-5">
            16 × 20″ archival matte · $45 sale price · $22 print cost
          </p>
        </div>
      </div>
    </div>
  );
}
