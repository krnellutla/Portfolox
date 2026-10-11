import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateView } from '../../components/ui/StateView.js';
import { getSummary, getRevenue, getRecentSales } from '../../api/analytics.js';
import { getMyGalleries } from '../../api/me.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';
import { formatMoney } from '../../lib/format-money.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const KPI_DEFINITIONS: Record<string, string> = {
  'Profile views': 'Visits to your portfolio page.',
  'Print revenue': 'Print revenue ÷ purchases.',
  'Avg. order':    'Print revenue ÷ purchases.',
  'Conversion':    'Purchases ÷ photo views for the selected range.',
};

function KpiLabel({ label }: { label: string }) {
  const tip = KPI_DEFINITIONS[label];
  return (
    <span className="relative group inline-flex items-center gap-1">
      {label}
      {tip && (
        <>
          <span className="text-ink-3 cursor-help text-[11px]">ⓘ</span>
          <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block w-48 bg-ink text-paper text-[11px] rounded px-2 py-1 z-10 leading-snug pointer-events-none">
            {tip}
          </span>
        </>
      )}
    </span>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: qk.analytics.summary('30d'),
    queryFn: () => getSummary('30d'),
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: qk.analytics.revenue('30d'),
    queryFn: () => getRevenue('30d'),
  });

  const { data: recentSales, isLoading: salesLoading } = useQuery({
    queryKey: qk.analytics.recentSales(),
    queryFn: getRecentSales,
  });

  const { data: galleries, isLoading: galleriesLoading } = useQuery({
    queryKey: qk.myGalleries(),
    queryFn: getMyGalleries,
  });

  const revenueBars = revenue ?? [];
  const maxBar = Math.max(...revenueBars.map((r) => r.revenue), 1);

  const kpis = summary
    ? [
        { label: 'Profile views', value: summary.profileViews.toLocaleString(), delta: summary.deltas.profileViews > 0 ? `+${(summary.deltas.profileViews * 100).toFixed(0)}%` : `${(summary.deltas.profileViews * 100).toFixed(0)}%`, dir: summary.deltas.profileViews >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Print revenue', value: formatMoney(summary.revenue, summary.currency), delta: summary.deltas.revenue > 0 ? `+${(summary.deltas.revenue * 100).toFixed(0)}%` : `${(summary.deltas.revenue * 100).toFixed(0)}%`, dir: summary.deltas.revenue >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Avg. order',    value: formatMoney(summary.avgOrderMinorUnits, summary.currency), delta: summary.deltas.avgOrder > 0 ? `+${(summary.deltas.avgOrder * 100).toFixed(0)}%` : `${(summary.deltas.avgOrder * 100).toFixed(0)}%`, dir: summary.deltas.avgOrder >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Conversion',    value: `${summary.conversionPct}%`, delta: summary.deltas.conversion > 0 ? `+${(summary.deltas.conversion * 100).toFixed(0)}%` : `${(summary.deltas.conversion * 100).toFixed(0)}%`, dir: summary.deltas.conversion >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-[34px] pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">11 — Studio Dashboard</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Good morning.
            </h1>
          </div>
          <div className="flex gap-2.5 items-center">
            <button className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-mono text-[12px] text-ink-3 hover:border-ink transition-colors duration-150">
              Last 30 days ▾
            </button>
            <Link
              to="/studio/upload"
              className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-sm hover:bg-ink-2 transition-colors duration-150"
            >
              ↑ Upload photos
            </Link>
          </div>
        </div>

        {/* KPI cards */}
        {summaryLoading ? (
          <StateView variant="loading" title="Loading stats…" />
        ) : (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {kpis.map((s) => (
              <StatCard
                key={s.label}
                label={<KpiLabel label={s.label} />}
                value={s.value}
                delta={s.delta}
                deltaDirection={s.dir}
                sub={s.sub}
                className="border border-line"
              />
            ))}
          </div>
        )}

        {/* Revenue chart + Recent sales */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          {/* Bar chart */}
          <div className="bg-surface border border-line rounded-card p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-[22px] font-[500] text-ink">Print revenue</h2>
              <span className="font-mono text-[11px] text-muted">monthly</span>
            </div>
            {revenueLoading ? (
              <StateView variant="loading" title="Loading…" />
            ) : (
              <div className="flex items-end gap-2 h-[180px]">
                {revenueBars.map((bar, i) => (
                  <div key={bar.month} className="flex-1 flex flex-col justify-end items-center gap-2">
                    <div
                      className={`w-full rounded-[4px] ${i === revenueBars.length - 1 ? 'bg-ink' : 'bg-[#cfccc3]'}`}
                      style={{ height: `${(bar.revenue / maxBar) * 100}%` }}
                    />
                    <span className="font-mono text-[10px] text-muted">
                      {MONTHS[new Date(bar.month).getMonth()] ?? bar.month}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sales */}
          <div className="bg-surface border border-line rounded-card p-6">
            <h2 className="font-serif text-[22px] font-[500] text-ink mb-[18px]">Recent sales</h2>
            {salesLoading ? (
              <StateView variant="loading" title="Loading…" />
            ) : (
              <div className="flex flex-col">
                {(recentSales ?? []).map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-[11px] border-b border-line-2 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink truncate">{r.printOptionId}</p>
                      <p className="font-mono text-[10.5px] text-muted mt-0.5">
                        @{r.buyerHandle} · {new Date(r.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="font-serif text-[18px] text-ink shrink-0">${(r.amount / 100).toFixed(0)}</span>
                  </div>
                ))}
                {!salesLoading && !recentSales?.length && (
                  <p className="font-mono text-[11px] text-muted py-4">No sales yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Top galleries */}
        <div className="bg-surface border border-line rounded-card p-6">
          <div className="flex items-baseline justify-between mb-[18px]">
            <h2 className="font-serif text-[22px] font-[500] text-ink">Top galleries</h2>
            <Link
              to="/studio/builder"
              className="font-mono text-[11px] tracking-label text-ink-3 hover:text-ink transition-colors duration-150"
            >
              VIEW ALL →
            </Link>
          </div>
          {galleriesLoading ? (
            <StateView variant="loading" title="Loading galleries…" />
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {(galleries ?? []).slice(0, 4).map((g, i) => (
                <div key={g.id} className="cursor-pointer group">
                  <div className="relative aspect-video rounded-tile overflow-hidden mb-3">
                    <img
                      src={seedPhotoUrl(i, 800)}
                      alt={g.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-[14px] font-semibold text-ink truncate group-hover:text-ink-2 transition-colors">
                    {g.title}
                  </p>
                  <p className="font-mono text-[10.5px] text-muted mt-0.5">
                    {g.counts.frames} frames · {g.counts.views} views
                  </p>
                </div>
              ))}
              {!galleriesLoading && !galleries?.length && (
                <p className="col-span-4 font-mono text-[11px] text-muted">No galleries yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
