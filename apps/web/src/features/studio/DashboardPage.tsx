import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile, SkeletonRow } from '../../components/ui/Skeleton.js';
import { getSummary, getRevenue, getRecentSales } from '../../api/analytics.js';
import { getMyGalleries } from '../../api/me.js';
import { qk } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtCurrency(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`;
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
        { label: 'Profile views',  value: summary.views.toLocaleString(), delta: summary.deltas.views > 0 ? `+${summary.deltas.views}%` : `${summary.deltas.views}%`, dir: summary.deltas.views >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Print revenue',  value: fmtCurrency(summary.revenue), delta: summary.deltas.revenue > 0 ? `+${summary.deltas.revenue}%` : `${summary.deltas.revenue}%`, dir: summary.deltas.revenue >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Avg. order',     value: fmtCurrency(summary.avgOrder), delta: summary.deltas.avgOrder > 0 ? `+$${summary.deltas.avgOrder}` : `$${summary.deltas.avgOrder}`, dir: summary.deltas.avgOrder >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Conversion',     value: `${summary.conversionPct}%`, delta: summary.deltas.conversion > 0 ? `+${summary.deltas.conversion}%` : `${summary.deltas.conversion}%`, dir: summary.deltas.conversion >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-[34px] pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">11 — Studio Dashboard</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Good morning.
            </h1>
          </div>
          <div className="flex gap-2.5 items-center">
            <button className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-mono text-[12px] text-ink-3 hover:border-ink transition-colors duration-150 whitespace-nowrap">
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
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonTile key={i} className="h-[100px]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {kpis.map((s) => (
              <StatCard
                key={s.label}
                label={s.label}
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-6">
          {/* Bar chart */}
          <div className="bg-surface border border-line rounded-card p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-[22px] font-[500] text-ink">Print revenue</h2>
              <span className="font-mono text-[11px] text-muted">monthly</span>
            </div>
            {revenueLoading ? (
              <div className="flex items-end gap-2 h-[180px]">
                {[40, 55, 70, 50, 80, 65, 90, 75, 60, 85, 95, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-field-bg border border-line rounded-[4px] animate-[pfxPulse_1.2s_ease-in-out_infinite]"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
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
              <div className="flex flex-col">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
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
                  <StateView
                    variant="empty"
                    title="No data for this range"
                    description="Sales and views will appear once your work is live."
                    action={
                      <Link
                        to="/studio/upload"
                        className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
                      >
                        Upload photos
                      </Link>
                    }
                  />
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
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTile key={i} className="aspect-video" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <div className="col-span-4">
                  <StateView
                    variant="empty"
                    title="No data for this range"
                    description="Sales and views will appear once your work is live."
                    action={
                      <Link
                        to="/studio/upload"
                        className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[14px] hover:bg-ink-2 transition-colors"
                      >
                        Upload photos
                      </Link>
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
