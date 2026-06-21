import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '../../components/ui/Chip.js';
import { Input } from '../../components/ui/Input.js';
import { PLANS } from '../pricing/mock.js';
import { StepIndicator } from './StepIndicator.js';
import type { PlanTier, Specialty } from '../../lib/types.js';

const SPECIALTIES: Specialty[] = ['Landscape', 'Portrait', 'Street', 'Wedding'];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plan, setPlan] = useState<PlanTier>('studio');
  const [displayName, setDisplayName] = useState('Mira Calder');
  const [handle, setHandle] = useState('miracalder');
  const [specialties, setSpecialties] = useState<Set<Specialty>>(new Set(['Landscape']));

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-paper px-6 py-12 pb-20 animate-pfxFade">
      <div className="max-w-[600px] mx-auto text-center">
        {/* Wordmark */}
        <p className="font-serif text-[28px] font-[600] tracking-[-0.015em] text-ink mb-8">
          Portfolix
        </p>

        {/* Step indicator */}
        <div className="mb-10">
          <StepIndicator current={step} onStepClick={(s) => s < step && setStep(s)} />
        </div>
      </div>

      {/* Step card */}
      <div className="max-w-[520px] mx-auto bg-surface border border-line rounded-panel px-9 py-9">

        {/* Step 0 — Account */}
        {step === 0 && (
          <>
            <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
              Create your account
            </h1>
            <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
              Start free. No card required for 14 days.
            </p>

            <div className="flex flex-col gap-[11px] mb-[18px]">
              {(['Google', 'Apple'] as const).map((provider) => (
                <button
                  key={provider}
                  className="w-full py-[13px] bg-surface border border-field rounded-[10px] font-semibold text-[14.5px] text-ink hover:border-ink transition-colors duration-150"
                >
                  Continue with {provider}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 my-[18px] text-muted text-[12px]">
              <span className="flex-1 h-px bg-line" />
              OR
              <span className="flex-1 h-px bg-line" />
            </div>

            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Email</label>
            <Input
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-3.5 text-[14.5px]"
            />

            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">Password</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 text-[14.5px]"
            />

            <button
              onClick={() => setStep(1)}
              className="w-full py-[14px] bg-ink text-paper rounded-[10px] font-semibold text-[15px] hover:bg-ink-2 transition-colors duration-150"
            >
              Create account →
            </button>
          </>
        )}

        {/* Step 1 — Plan */}
        {step === 1 && (
          <>
            <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
              Pick a plan
            </h1>
            <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
              Switch or cancel anytime. Affordable by design.
            </p>

            <div className="flex flex-col gap-3 mb-[26px]">
              {PLANS.map((p) => (
                <div
                  key={p.tier}
                  onClick={() => setPlan(p.tier)}
                  className={`flex items-center gap-3.5 p-4 rounded-[12px] cursor-pointer transition-colors duration-150 ${
                    plan === p.tier
                      ? 'border-2 border-ink bg-ink/[0.02]'
                      : 'border border-field bg-surface hover:border-ink-3'
                  }`}
                >
                  <span
                    className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-colors ${
                      plan === p.tier ? 'bg-ink border-ink' : 'bg-surface border-field'
                    }`}
                  >
                    {plan === p.tier && (
                      <span className="block w-[7px] h-[7px] rounded-full bg-surface" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[19px] text-ink">{p.name}</p>
                    <p className="text-[13px] text-ink-3">{p.tagline}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-serif text-[24px] text-ink">${p.priceMonthly}</span>
                    <span className="text-[13px] text-muted">/mo</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="px-[22px] py-[14px] bg-surface border border-field rounded-[10px] font-semibold text-[15px] text-ink hover:border-ink transition-colors duration-150"
              >
                Back
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-[14px] bg-ink text-paper rounded-[10px] font-semibold text-[15px] hover:bg-ink-2 transition-colors duration-150"
              >
                Continue →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Studio setup */}
        {step === 2 && (
          <>
            <h1 className="font-serif text-[30px] font-[500] text-ink text-center tracking-[-0.01em] mb-1.5">
              Set up your studio
            </h1>
            <p className="text-[14.5px] text-ink-3 text-center mb-[26px]">
              This becomes your public portfolio.
            </p>

            {/* Avatar upload */}
            <div className="flex gap-4 items-center mb-5">
              <div className="relative flex-shrink-0">
                <div
                  className="w-[72px] h-[72px] rounded-full"
                  style={{ background: 'linear-gradient(145deg,#bda988,#8a7150)' }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-[26px] h-[26px] rounded-full bg-ink text-paper border-2 border-surface flex items-center justify-center text-[13px]">
                  ＋
                </span>
              </div>
              <div className="text-[13px] text-ink-3">
                Upload an avatar
                <br />
                <span className="font-mono text-[11px] text-muted">JPG or PNG · square</span>
              </div>
            </div>

            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mb-3.5 text-[14.5px]"
            />

            <label className="block text-[12.5px] font-semibold text-ink-3 mb-1.5">
              Handle
            </label>
            <div className="flex items-center border border-field rounded-[10px] overflow-hidden mb-3.5 focus-within:border-ink transition-colors duration-150">
              <span className="px-[13px] py-[13px] bg-canvas text-muted font-mono text-[13px] whitespace-nowrap">
                portfolix.com/
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="flex-1 px-[13px] py-[13px] text-[14.5px] text-ink outline-none bg-surface"
              />
            </div>

            <label className="block text-[12.5px] font-semibold text-ink-3 mb-2">
              Specialty
            </label>
            <div className="flex flex-wrap gap-2 mb-[26px]">
              {SPECIALTIES.map((s) => (
                <Chip
                  key={s}
                  active={specialties.has(s)}
                  onClick={() => toggleSpecialty(s)}
                >
                  {s}
                </Chip>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-[22px] py-[14px] bg-surface border border-field rounded-[10px] font-semibold text-[15px] text-ink hover:border-ink transition-colors duration-150"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-[14px] bg-ink text-paper rounded-[10px] font-semibold text-[15px] hover:bg-ink-2 transition-colors duration-150"
              >
                Finish setup →
              </button>
            </div>
          </>
        )}

        {/* Step 3 — Done */}
        {step === 3 && (
          <div className="text-center py-3.5">
            <div className="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center text-[30px] mx-auto mb-[22px]">
              ✓
            </div>
            <h1 className="font-serif text-[32px] font-[500] text-ink tracking-[-0.01em] mb-2.5">
              You're all set, {displayName.split(' ')[0]}.
            </h1>
            <p className="text-[15px] text-ink-3 leading-[1.5] mb-7">
              Your studio is live at{' '}
              <span className="font-mono text-ink">portfolix.com/{handle}</span>. Upload your
              first frames to get going.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/studio/upload"
                className="px-6 py-[14px] bg-ink text-paper rounded-[10px] font-semibold text-[15px] hover:bg-ink-2 transition-colors duration-150"
              >
                Upload photos
              </Link>
              <Link
                to="/studio/builder"
                className="px-6 py-[14px] bg-surface border border-field text-ink rounded-[10px] font-semibold text-[15px] hover:border-ink transition-colors duration-150"
              >
                Build a gallery
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
