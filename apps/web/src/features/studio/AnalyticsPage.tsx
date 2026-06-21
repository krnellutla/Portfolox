import { useState } from 'react';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';

type Range = '30d' | '90d' | 'all';

const RANGES: { id: Range; label: string }[] = [
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'all', label: 'All time' },
];

const KPI_DATA: Record<Range, { label: string; value: string; delta: string; dir: 'up' | 'down' | 'neutral'; sub: string }[]> = {
  '30d': [
    { label: 'Photo views',   value: '48.2k', delta: '+12.4%', dir: 'up',   sub: 'vs. prior period' },
    { label: 'Conversion',    value: '3.2%',  delta: '-0.4%',  dir: 'down', sub: 'vs. prior period' },
    { label: 'Avg. order',    value: '$76',   delta: '+$8',    dir: 'up',   sub: 'vs. prior period' },
    { label: 'Print revenue', value: '$3,240',delta: '+8.1%',  dir: 'up',   sub: 'vs. prior period' },
  ],
  '90d': [
    { label: 'Photo views',   value: '124k',  delta: '+18.2%', dir: 'up',   sub: 'vs. prior period' },
    { label: 'Conversion',    value: '3.6%',  delta: '+0.2%',  dir: 'up',   sub: 'vs. prior period' },
    { label: 'Avg. order',    value: '$81',   delta: '+$12',   dir: 'up',   sub: 'vs. prior period' },
    { label: 'Print revenue', value: '$9,720',delta: '+22%',   dir: 'up',   sub: 'vs. prior period' },
  ],
  'all': [
    { label: 'Photo views',   value: '381k',  delta: '',       dir: 'neutral', sub: 'lifetime' },
    { label: 'Conversion',    value: '3.4%',  delta: '',       dir: 'neutral', sub: 'lifetime' },
    { label: 'Avg. order',    value: '$74',   delta: '',       dir: 'neutral', sub: 'lifetime' },
    { label: 'Print revenue', value: '$26.8k',delta: '',       dir: 'neutral', sub: 'lifetime' },
  ],
};

const TOP_FRAMES = [
  {
    id: 'f1', title: 'First Light', code: 'PFX-4200',
    gradient: 'linear-gradient(145deg,#7e8893,#525c68)',
    views: '12.1k', sales: 34, revenue: '$1,530', conv: '4.2%',
    sparkline: [30, 42, 38, 55, 48, 62, 58],
  },
  {
    id: 'f2', title: 'Tideline', code: 'PFX-4201',
    gradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
    views: '8.4k', sales: 21, revenue: '$1,050', conv: '3.7%',
    sparkline: [22, 28, 35, 28, 42, 38, 50],
  },
  {
    id: 'f3', title: 'Quiet Hours', code: 'PFX-4203',
    gradient: 'linear-gradient(145deg,#bda988,#7a6347)',
    views: '6.9k', sales: 18, revenue: '$810', conv: '3.9%',
    sparkline: [18, 22, 20, 28, 24, 32, 30],
  },
  {
    id: 'f4', title: 'Berlin After Dark', code: 'PFX-4208',
    gradient: 'linear-gradient(145deg,#8f93a3,#5e6374)',
    views: '5.2k', sales: 9, revenue: '$405', conv: '2.6%',
    sparkline: [8, 12, 10, 14, 11, 15, 12],
  },
];

const FUNNEL: { label: string; value: number }[] = [
  { label: 'Profile views', value: 100 },
  { label: 'Photo opens',   value: 62 },
  { label: 'Buy intent',    value: 18 },
  { label: 'Checkout',      value: 8 },
];

const TOP_BUYERS = [
  { handle: 'k.møller',    gradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)', orders: 7, spent: '$490' },
  { handle: 'studio.ridge',gradient: 'linear-gradient(145deg,#7e8893,#525c68)', orders: 4, spent: '$352' },
  { handle: 'a.delgado',   gradient: 'linear-gradient(145deg,#c4a882,#8a7150)', orders: 3, spent: '$240' },
];

const MAX_SPARK = 65;

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');
  const kpis = KPI_DATA[range];

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-8 pt-8 pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-7 flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">12 — Analytics</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Analytics
            </h1>
          </div>
          {/* Range segmented */}
          <div className="flex p-[3px] bg-surface border border-line rounded-[10px]">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-4 py-[8px] rounded-[8px] font-mono text-[12px] transition-colors ${
                  range === r.id
                    ? 'bg-ink text-paper'
                    : 'text-ink-3 hover:text-ink'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
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

        {/* Main 2-col */}
        <div className="grid gap-5" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
          {/* Top performing frames */}
          <div className="bg-surface border border-line rounded-card overflow-hidden">
            <div className="px-5 pt-5 pb-3.5 border-b border-line">
              <p className="font-serif text-[20px] font-[500] text-ink">Top performing frames</p>
            </div>
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
                {TOP_FRAMES.map((f) => (
                  <tr key={f.id} className="border-b border-line-2 last:border-0 hover:bg-canvas/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[6px] shrink-0" style={{ background: f.gradient }} />
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{f.title}</p>
                          <p className="font-mono text-[10px] text-muted">{f.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-3">{f.views}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-3">{f.sales}</td>
                    <td className="px-4 py-3.5 font-serif text-[14px] text-ink">{f.revenue}</td>
                    <td className="px-4 py-3.5 font-mono text-[12px] text-positive">{f.conv}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-end gap-[2px] h-[24px] w-[48px]">
                        {f.sparkline.map((v, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-[2px] bg-ink"
                            style={{ height: `${Math.round((v / MAX_SPARK) * 100)}%` }}
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column stacks */}
          <div className="flex flex-col gap-5">
            {/* Conversion funnel */}
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-serif text-[20px] font-[500] text-ink mb-5">Conversion funnel</p>
              <div className="flex flex-col gap-3">
                {FUNNEL.map((stage, i) => (
                  <div key={stage.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[11px] text-ink-3">{stage.label}</span>
                      <span className="font-mono text-[11px] text-muted">{stage.value}%</span>
                    </div>
                    <div className="h-[26px] rounded-[6px] bg-canvas overflow-hidden">
                      <div
                        className="h-full rounded-[6px] bg-ink flex items-center pl-3 transition-all"
                        style={{
                          width: `${stage.value}%`,
                          opacity: 1 - i * 0.18,
                        }}
                      >
                        <span className="font-mono text-[10px] text-paper/80">{stage.value}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top buyers */}
            <div className="bg-surface border border-line rounded-card p-5">
              <p className="font-serif text-[20px] font-[500] text-ink mb-4">Top buyers</p>
              <div className="flex flex-col gap-3">
                {TOP_BUYERS.map((b) => (
                  <div key={b.handle} className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full shrink-0"
                      style={{ background: b.gradient }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-[12px] text-ink">@{b.handle}</p>
                      <p className="font-mono text-[10px] text-muted">{b.orders} orders</p>
                    </div>
                    <span className="font-serif text-[20px] text-ink">{b.spent}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
