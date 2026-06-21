import { Link } from 'react-router-dom';
import { TopNav } from '../../components/nav/TopNav.js';
import { PhotoTile } from '../../components/photo/PhotoTile.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';
import {
  DASH_STATS, MONTHS, RECENT_SALES, REVENUE_BARS, TOP_GALLERIES,
} from './mock.js';

const MAX_BAR = Math.max(...REVENUE_BARS);

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-8 pt-[34px] pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">11 — Studio Dashboard</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Good morning, Mira.
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
        <div className="grid grid-cols-4 gap-4 mb-6">
          {DASH_STATS.map((s) => (
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

        {/* Revenue chart + Recent sales */}
        <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          {/* Bar chart */}
          <div className="bg-surface border border-line rounded-card p-6">
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="font-serif text-[22px] font-[500] text-ink">Print revenue</h2>
              <span className="font-mono text-[11px] text-muted">2026 · monthly</span>
            </div>
            <div className="flex items-end gap-2 h-[180px]">
              {REVENUE_BARS.map((val, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end items-center gap-2"
                >
                  <div
                    className={`w-full rounded-[4px] ${
                      i === REVENUE_BARS.length - 1 ? 'bg-ink' : 'bg-[#cfccc3]'
                    }`}
                    style={{ height: `${(val / MAX_BAR) * 100}%` }}
                  />
                  <span className="font-mono text-[10px] text-muted">{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent sales */}
          <div className="bg-surface border border-line rounded-card p-6">
            <h2 className="font-serif text-[22px] font-[500] text-ink mb-[18px]">
              Recent sales
            </h2>
            <div className="flex flex-col">
              {RECENT_SALES.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-[11px] border-b border-line-2 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13.5px] font-semibold text-ink truncate">{r.item}</p>
                    <p className="font-mono text-[10.5px] text-muted mt-0.5">
                      {r.buyer} · {r.when}
                    </p>
                  </div>
                  <span className="font-serif text-[18px] text-ink shrink-0">{r.amt}</span>
                </div>
              ))}
            </div>
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
          <div className="grid grid-cols-4 gap-4">
            {TOP_GALLERIES.map((g) => (
              <div key={g.id} className="cursor-pointer group">
                <PhotoTile
                  ratio="16:9"
                  placeholderGradient={g.gradient}
                  className="mb-3"
                />
                <p className="text-[14px] font-semibold text-ink truncate group-hover:text-ink-2 transition-colors">
                  {g.name}
                </p>
                <p className="font-mono text-[10.5px] text-muted mt-0.5">
                  {g.frames} frames · {g.views} views
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
