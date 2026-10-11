import { Eyebrow } from '../../../components/ui/Eyebrow.js';
import { formatMoney } from '../../../lib/format-money.js';

const STUB_INVOICES = [
  { date: 'Oct 1, 2026', amountMinorUnits: 1400, currency: 'USD' },
  { date: 'Sep 1, 2026', amountMinorUnits: 1400, currency: 'USD' },
  { date: 'Aug 1, 2026', amountMinorUnits: 1400, currency: 'USD' },
] as const;

export default function BillingSettings() {
  return (
    <div>
      <Eyebrow>PLAN & BILLING</Eyebrow>
      <h2 className="font-serif text-[28px] font-medium text-ink mt-1 mb-8">Plan & billing</h2>

      <div className="flex flex-col gap-8">
        {/* Current plan card */}
        <div className="rounded-[14px] border border-line p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="inline-block font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-[5px] bg-canvas text-ink-3 border border-line w-fit">
                STUDIO
              </span>
              <p className="text-[18px] font-serif font-medium text-ink mt-1">Studio</p>
              <p className="text-sm text-ink-3">$14 / month</p>
              <p className="font-mono text-[11px] text-ink-3 mt-1">Next billing: Nov 1, 2026</p>
            </div>
            <a
              href="/pricing"
              className="text-sm text-ink-3 hover:text-ink transition-colors whitespace-nowrap"
            >
              Change plan →
            </a>
          </div>
        </div>

        {/* Invoices */}
        <div>
          <p className="font-mono text-[11px] text-ink-3 tracking-label uppercase mb-3">Invoices</p>
          <div className="rounded-[12px] border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="text-left px-4 py-2 font-mono text-[11px] text-ink-3 uppercase tracking-label">Date</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] text-ink-3 uppercase tracking-label">Amount</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {STUB_INVOICES.map((inv) => (
                  <tr key={inv.date} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink">{inv.date}</td>
                    <td className="px-4 py-3 font-mono text-[13px] text-ink">
                      {formatMoney(inv.amountMinorUnits, inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href="#"
                        className="font-mono text-[11px] text-ink-3 hover:text-ink transition-colors"
                      >
                        PDF ↓
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout account */}
        <div>
          <p className="font-mono text-[11px] text-ink-3 tracking-label uppercase mb-3">Payout account</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[12px] font-mono bg-amber-50 text-amber-700 border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Not connected
            </span>
            <button
              type="button"
              onClick={() => {/* stub */}}
              className="px-4 py-2 rounded-[9px] border border-line text-ink text-sm font-semibold hover:bg-canvas transition-colors"
            >
              Connect payouts →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
