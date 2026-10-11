import { useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { Eyebrow } from '../../../components/ui/Eyebrow.js';

type DomainStatus = 'idle' | 'showing-dns' | 'verifying' | 'verified' | 'error';

const DNS_RECORDS = [
  { type: 'A', host: '@', value: '76.76.21.21' },
  { type: 'CNAME', host: 'www', value: 'cname.blueflutes.com' },
] as const;

/**
 * Security note: this component reads window.location.hostname ONLY for
 * display purposes (showing the studio's subdomain). It does NOT use
 * window.location.hostname to derive tenant identity or trust any host claim
 * for access decisions. Actual domain ownership verification is server-side
 * (DNS lookup) — this stub POST /me/domain/verify just returns a status.
 * No X-Forwarded-Host trust anywhere in this component.
 */
export default function DomainSettings() {
  // Derive subdomain from hostname for display only — not used for auth.
  const hostname = window.location.hostname;
  const subdomain =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'blueflutes.com'
      ? 'yourhandle.blueflutes.com'
      : hostname;

  const [status, setStatus] = useState<DomainStatus>('idle');
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleVerify() {
    setStatus('verifying');
    // Stub: simulate async DNS check
    verifyTimer.current = setTimeout(() => {
      // Always resolves to verified in stub
      setStatus('verified');
    }, 1500);
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
  }

  return (
    <div>
      <Eyebrow>DOMAIN</Eyebrow>
      <h2 className="font-serif text-[28px] font-medium text-ink mt-1 mb-8">Domain</h2>

      <div className="flex flex-col gap-8">
        {/* Subdomain (always shown) */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Your subdomain
          </label>
          <span className="inline-block font-mono text-sm bg-field-bg rounded px-3 py-2 text-ink">
            {subdomain}
          </span>
        </div>

        {/* Custom domain — disabled for Solo plan */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Custom domain
          </label>
          <input
            type="text"
            disabled
            placeholder="yourdomain.com"
            className="w-full px-3 py-2 rounded-[9px] bg-field-bg border border-line text-ink-3 text-sm cursor-not-allowed"
          />
          <p className="mt-1.5 text-ink-3 text-sm">
            Custom domains require Studio or Atelier.{' '}
            <a href="/pricing" className="text-ink underline underline-offset-2">
              Upgrade →
            </a>
          </p>
        </div>

        {/* DNS records table (stub UI — shown when custom domain is configured) */}
        <div>
          <p className="font-mono text-[11px] text-ink-3 tracking-label uppercase mb-3">
            DNS records
          </p>
          <div className="rounded-[12px] border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas">
                  <th className="text-left px-4 py-2 font-mono text-[11px] text-ink-3 uppercase tracking-label">Type</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] text-ink-3 uppercase tracking-label">Host</th>
                  <th className="text-left px-4 py-2 font-mono text-[11px] text-ink-3 uppercase tracking-label">Value</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {DNS_RECORDS.map((rec) => (
                  <tr key={rec.type} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-mono text-[12px] text-ink">{rec.type}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink">{rec.host}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-ink">{rec.value}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(rec.value)}
                        className="text-ink-3 hover:text-ink transition-colors"
                        aria-label={`Copy ${rec.value}`}
                      >
                        <Copy size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verify button + status pill */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleVerify}
            disabled={status === 'verifying'}
            className="px-5 py-2 rounded-[9px] bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors disabled:opacity-50"
          >
            {status === 'verifying' ? 'Verifying…' : 'Verify domain'}
          </button>

          {status === 'verifying' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[12px] font-mono bg-amber-50 text-amber-700 border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending
            </span>
          )}
          {status === 'verified' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[12px] font-mono bg-emerald-50 text-emerald-700 border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified
            </span>
          )}
          {status === 'error' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border text-[12px] font-mono bg-red-50 text-red-700 border-red-200">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              Verification failed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
