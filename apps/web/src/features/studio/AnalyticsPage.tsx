import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile, SkeletonRow } from '../../components/ui/Skeleton.js';
import { getSummary, getPhotoPerformance, getFunnel, getBuyers } from '../../api/analytics.js';
import { qk } from '../../lib/query-client.js';
import { seedThumbUrl, seedAvatarUrl } from '../../lib/seed-photos.js';

type Range = '30d' | '90d' | 'all';

const RANGES: { id: Range; label: string }[] = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
];

const MAX_SPARK = 65;

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: qk.analytics.summary(range),
    queryFn: () => getSummary(range),
  });

  const { data: topFrames, isLoading: framesLoading } = useQuery({
    queryKey: qk.analytics.photos(range, 'views'),
    queryFn: () => getPhotoPerformance(range, 'views'),
  });

  const { data: funnel, isLoading: funnelLoading } = useQuery({
    queryKey: qk.analytics.funnel(range),
    queryFn: () => getFunnel(range),
  });

  const { data: buyers, isLoading: buyersLoading } = useQuery({
    queryKey: qk.analytics.buyers(range),
    queryFn: () => getBuyers(range),
  });

  const kpis = summary
    ? [
        { label: 'Photo views',   value: summary.views.toLocaleString(), delta: summary.deltas.views ? `${summary.deltas.views > 0 ? '+' : ''}${summary.deltas.views}%` : '', dir: summary.deltas.views >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Conversion',    value: `${summary.conversionPct}%`, delta: summary.deltas.conversion ? `${summary.deltas.conversion > 0 ? '+' : ''}${summary.deltas.conversion}%` : '', dir: summary.deltas.conversion >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Avg. order',    value: `$${summary.avgOrder}`, delta: summary.deltas.avgOrder ? `${summary.deltas.avgOrder > 0 ? '+' : ''}$${summary.deltas.avgOrder}` : '', dir: summary.deltas.avgOrder >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
        { label: 'Print revenue', value: `$${summary.revenue.toLocaleString()}`, delta: summary.deltas.revenue ? `${summary.deltas.revenue > 0 ? '+' : ''}${summary.deltas.revenue}%` : '', dir: summary.deltas.revenue >= 0 ? ('up' as const) : ('down' as const), sub: 'vs. prior period' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">12 — Analytics</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">Analytics</h1>
          </div>
          <div className="flex p-[3px] bg-surface border border-line rounded-[10px]">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-4 py-[8px] rounded-[8px] font-mono text-[12px] transition-colors ${
                  range === r.id ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
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
            {kpis.map((k) => (
              <StatCard
                key={k.label}
                label={k.label}
                value={k.value}
                delta={k.delta || undefined}
                deltaDirection={k.dir}
                sub={k.sub}
                className="border border-line"
              />
            ))}
          </div>
        )}

        {/* Main 2-col */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
          {/* Top performing frames */}
          <div className="bg-surface border border-line rounded-card overflow-hidden">

            <div className="px-5 pt-5 pb-3.5 border-b border-line">
              <p className="font-serif text-[20px] font-[500] text-ink">Top performing frames</p>
            </div>
            {framesLoading ? (
              <div className="p-5 flex flex-col">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line">
                    {['Frame', 'Views', 'Sales', 'Revenue', 'Conv.', '7 days'].map((col) => (
                      <th key={col} className="px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-label text-muted first:pl-5">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(topFrames ?? []).map((f, i) => (
                    <tr key={f.photoId} className="border-b border-line-2 last:border-0 hover:bg-canvas/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={f.thumbUrl || seedThumbUrl(i)}
                            alt={f.title}
                            className="w-9 h-9 rounded-[6px] shrink-0 object-cover"
                          />
                          <div>
                            <p className="text-[13px] font-semibold text-ink">{f.title}</p>
                            <p className="font-mono text-[10px] text-muted">{f.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[12px] text-ink-3">{f.views.toLocaleString()}</td>
                      <td className="px-4 py-3.5 font-mono text-[12px] text-ink-3">{f.sales}</td>
                      <td className="px-4 py-3.5 font-serif text-[14px] text-ink">${f.revenue}</td>
                      <td className="px-4 py-3.5 font-mono text-[12px] text-positive">{f.conversionPct}%</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-end gap-[2px] h-[24px] w-[48px]">
                          {f.trend.map((v, ti) => (
                            <div
                              key={ti}
                              className="flex-1 rounded-[2px] bg-ink"
                              style={{ height: `${Math.round((v / MAX_SPARK) * 100)}%` }}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!framesLoading && !topFrames?.length && (
                    <tr>
                      <td colSpan={6}>
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
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-5">
            {/* Conversion funnel */}
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-serif text-[20px] font-[500] text-ink mb-5">Conversion funnel</p>
              {funnelLoading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonTile key={i} className="h-[26px] rounded-[6px]" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(funnel ?? []).map((stage, i) => (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[11px] text-ink-3">{stage.label}</span>
                        <span className="font-mono text-[11px] text-muted">{stage.pctOfTop}%</span>
                      </div>
                      <div className="h-[26px] rounded-[6px] bg-canvas overflow-hidden">
                        <div
                          className="h-full rounded-[6px] bg-ink flex items-center pl-3 transition-all"
                          style={{ width: `${stage.pctOfTop}%`, opacity: 1 - i * 0.18 }}
                        >
                          <span className="font-mono text-[10px] text-paper/80">{stage.pctOfTop}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top buyers */}
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-serif text-[20px] font-[500] text-ink mb-4">Top buyers</p>
              {buyersLoading ? (
                <div className="flex flex-col">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {(buyers ?? []).map((b, i) => (
                    <div key={b.buyerHandle} className="flex items-center gap-3">
                      <img
                        src={b.avatarUrl || seedAvatarUrl(i, 36)}
                        alt={b.buyerHandle}
                        className="w-9 h-9 rounded-full shrink-0 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-[12px] text-ink">@{b.buyerHandle}</p>
                        <p className="font-mono text-[10px] text-muted">{b.orders} orders</p>
                      </div>
                      <span className="font-serif text-[20px] text-ink">${b.spent}</span>
                    </div>
                  ))}
                  {!buyersLoading && !buyers?.length && (
                    <StateView
                      variant="empty"
                      title="No data for this range"
                      description="Sales and views will appear once your work is live."
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
