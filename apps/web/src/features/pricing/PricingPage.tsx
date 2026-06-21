import { useState } from 'react';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { TopNav } from '../../components/nav/TopNav.js';
import { PlanCard } from './PlanCard.js';
import { PrintCard } from './PrintCard.js';
import { PLANS, PRINT_OPTIONS } from './mock.js';

type Billing = 'monthly' | 'annual';

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');

  return (
    <div className="min-h-screen bg-paper">
      <TopNav />

      <div className="max-w-prose mx-auto px-8 pt-16 pb-24 animate-pfxFade">
        {/* Header */}
        <div className="text-center mb-12">
          <Eyebrow className="mb-5">08 — Pricing</Eyebrow>
          <h1 className="font-serif text-display-l font-[500] text-ink mb-4 leading-[1.05] tracking-[-0.02em]">
            Pricing that gets out of the way.
          </h1>
          <p className="text-[17px] leading-[1.55] text-ink-3 max-w-[50ch] mx-auto mb-6">
            Showing your work should never cost more than making it. Every plan includes
            the portfolio, the community, and a print store — with the lowest commissions
            in the business.
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
        <div className="grid grid-cols-3 gap-[18px] mb-14">
          {PLANS.map((plan) => (
            <PlanCard key={plan.tier} plan={plan} billing={billing} />
          ))}
        </div>

        {/* À la carte prints */}
        <div className="border-t border-line pt-12">
          <div className="flex items-baseline justify-between mb-2 flex-wrap gap-3">
            <h2 className="font-serif text-[32px] font-[500] text-ink tracking-[-0.01em]">
              À la carte prints
            </h2>
            <span className="font-mono text-[11px] tracking-label text-muted">
              NO SUBSCRIPTION REQUIRED
            </span>
          </div>
          <p className="text-[15px] text-ink-3 mb-6 max-w-[56ch]">
            Buyers pay once, photographers keep the most. Set your own markup on archival
            prints fulfilled and shipped worldwide.
          </p>
          <div className="grid grid-cols-4 gap-4">
            {PRINT_OPTIONS.map((opt) => (
              <PrintCard key={opt.id} option={opt} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
