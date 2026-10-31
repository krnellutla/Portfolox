import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PHOTO_CATEGORIES } from '@blueflutes/shared';
import { TopNav } from '../../components/nav/TopNav.js';
import { Eyebrow } from '../../components/ui/Eyebrow.js';
import { useEyebrow } from '../../lib/eyebrow.js';
import { StatCard } from '../../components/ui/StatCard.js';
import { StateView } from '../../components/ui/StateView.js';
import { SkeletonTile, SkeletonRow } from '../../components/ui/Skeleton.js';
import { getSummary, getRevenue, getRecentSales } from '../../api/analytics.js';
import {
  autoCategorizeGalleries,
  getMyGalleries,
  updateGallery,
} from '../../api/me.js';
import {
  getGooglePhotosStatus,
  listGoogleAlbums,
  syncAllGoogleAlbums,
  syncGoogleAlbum,
} from '../../api/google-photos.js';
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
  const eyebrow = useEyebrow('11 — Studio Dashboard');
  const queryClient = useQueryClient();

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [albumCategoryOverrides, setAlbumCategoryOverrides] = useState<Record<string, string>>({});
  const [syncingAlbumId, setSyncingAlbumId] = useState<string | null>(null);
  const [syncBanner, setSyncBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  const { data: gPhotosStatus, isLoading: gStatusLoading } = useQuery({
    queryKey: ['google-photos', 'status'],
    queryFn: getGooglePhotosStatus,
  });

  const {
    data: gAlbums,
    isLoading: gAlbumsLoading,
    error: gAlbumsError,
    refetch: refetchGoogleAlbums,
  } = useQuery({
    queryKey: ['google-photos', 'albums'],
    queryFn: listGoogleAlbums,
    enabled: gPhotosStatus?.connected === true,
  });

  const syncSingleMutation = useMutation({
    mutationFn: ({ albumId, category }: { albumId: string; category?: string }) =>
      syncGoogleAlbum(albumId, category),
    onMutate: ({ albumId }) => {
      setSyncingAlbumId(albumId);
      setSyncBanner(null);
    },
    onSuccess: (res) => {
      setSyncBanner({
        type: 'success',
        text: `Synced "${res.albumTitle}" (${res.synced} new, ${res.skipped} existing) → ${res.category ?? 'Categorized'}`,
      });
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      void queryClient.invalidateQueries({ queryKey: ['google-photos', 'albums'] });
    },
    onError: (err) => {
      setSyncBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to sync album from Google Photos',
      });
    },
    onSettled: () => {
      setSyncingAlbumId(null);
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: () => syncAllGoogleAlbums(albumCategoryOverrides),
    onMutate: () => {
      setSyncBanner(null);
    },
    onSuccess: (res) => {
      const catSummary = Object.entries(res.categories)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', ');
      setSyncBanner({
        type: 'success',
        text: `Pulled ${res.albumsSynced} albums (${res.photosSynced} new photos, ${res.photosSkipped} up-to-date) across: ${catSummary || 'no albums'}.`,
      });
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      void queryClient.invalidateQueries({ queryKey: ['google-photos', 'albums'] });
    },
    onError: (err) => {
      setSyncBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to pull and categorize Google Photos albums',
      });
    },
  });

  const autoCategorizeMutation = useMutation({
    mutationFn: () => autoCategorizeGalleries(),
    onMutate: () => {
      setSyncBanner(null);
    },
    onSuccess: (res) => {
      const catSummary = Object.entries(res.categories)
        .map(([cat, count]) => `${cat} (${count})`)
        .join(', ');
      setSyncBanner({
        type: 'success',
        text: `Auto-categorized ${res.categorized} galleries into: ${catSummary || 'none'}.`,
      });
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      void queryClient.invalidateQueries({ queryKey: ['google-photos', 'albums'] });
    },
    onError: (err) => {
      setSyncBanner({
        type: 'error',
        text: err instanceof Error ? err.message : 'Auto-categorize failed',
      });
    },
  });

  const categoryPatchMutation = useMutation({
    mutationFn: ({ galleryId, category }: { galleryId: string; category: string }) =>
      updateGallery(galleryId, { category }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.myGalleries() });
      void queryClient.invalidateQueries({ queryKey: ['google-photos', 'albums'] });
    },
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

  const allGalleries = galleries ?? [];
  const galleryCategories = Array.from(
    new Set(allGalleries.map((g) => g.category || 'Uncategorized')),
  );
  const categoryFilters = ['All', ...galleryCategories];
  const filteredGalleries =
    selectedCategoryFilter === 'All'
      ? allGalleries
      : allGalleries.filter((g) => (g.category || 'Uncategorized') === selectedCategoryFilter);

  return (
    <div className="min-h-screen bg-paper animate-pfxFade">
      <TopNav />

      <div className="max-w-shell mx-auto px-4 md:px-6 lg:px-8 pt-[34px] pb-32 md:pb-24">
        {/* Header */}
        <div className="flex items-end justify-between mb-[30px] flex-wrap gap-4">
          <div>
            <Eyebrow className="mb-3">{eyebrow}</Eyebrow>
            <h1 className="font-serif text-display-m font-[500] text-ink tracking-[-0.02em]">
              Good morning.
            </h1>
          </div>
          <div className="flex gap-2.5 items-center flex-wrap">
            {allGalleries.length > 0 && (
              <button
                type="button"
                onClick={() => autoCategorizeMutation.mutate()}
                disabled={autoCategorizeMutation.isPending}
                className="px-4 py-[10px] bg-surface border border-field rounded-[9px] font-mono text-[12px] text-ink hover:border-ink transition-colors duration-150 disabled:opacity-50 whitespace-nowrap"
              >
                {autoCategorizeMutation.isPending ? 'Categorizing…' : '✦ Auto-categorize galleries'}
              </button>
            )}
            <Link
              to="/studio/upload"
              className="px-5 py-[11px] bg-ink text-paper rounded-[9px] font-semibold text-sm hover:bg-ink-2 transition-colors duration-150"
            >
              ↑ Upload photos
            </Link>
          </div>
        </div>

        {/* Google Photos Pull & Auto-Categorize Hub */}
        <div className="bg-surface border border-line rounded-card p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[10px] bg-canvas border border-line flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#4285F4" />
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z" fill="white" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="font-serif text-[22px] font-[500] text-ink">
                    Google Photos Albums &amp; Auto-Categorization
                  </h2>
                  {gPhotosStatus?.connected && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-label bg-positive/10 text-positive">
                      ● Connected
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-ink-3 mt-0.5">
                  Pull all your Google Photos albums and automatically organize them into portfolio categories (City, Landscape, Portrait, Family, B&amp;W, Street, Travel, Events).
                </p>
              </div>
            </div>

            {gPhotosStatus?.connected ? (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => void refetchGoogleAlbums()}
                  disabled={gAlbumsLoading || syncAllMutation.isPending}
                  className="px-4 py-[10px] bg-canvas border border-field rounded-[9px] font-mono text-[11.5px] text-ink hover:border-ink transition-colors disabled:opacity-50"
                >
                  ↻ Refresh albums
                </button>
                <button
                  type="button"
                  onClick={() => syncAllMutation.mutate()}
                  disabled={syncAllMutation.isPending || !gAlbums?.length}
                  className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[13.5px] hover:bg-ink-2 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {syncAllMutation.isPending
                    ? 'Pulling & categorizing all…'
                    : `Pull & Auto-Categorize All (${gAlbums?.length ?? 0})`}
                </button>
              </div>
            ) : (
              !gStatusLoading && (
                <a
                  href="/api/auth/google?next=/studio/dashboard"
                  className="px-5 py-[10px] bg-ink text-paper rounded-[9px] font-semibold text-[13.5px] hover:bg-ink-2 transition-colors whitespace-nowrap"
                >
                  Connect Google Photos
                </a>
              )
            )}
          </div>

          {syncBanner && (
            <div
              role="status"
              className={`mb-4 px-4 py-3 rounded-[9px] font-mono text-[12px] flex items-center justify-between gap-3 ${
                syncBanner.type === 'error'
                  ? 'bg-danger/10 text-danger border border-danger/20'
                  : 'bg-positive/10 text-positive border border-positive/20'
              }`}
            >
              <span>{syncBanner.text}</span>
              <button
                type="button"
                onClick={() => setSyncBanner(null)}
                className="text-current opacity-70 hover:opacity-100"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </div>
          )}

          {gPhotosStatus?.connected && (
            <div>
              {gAlbumsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonTile key={i} className="h-[88px]" />
                  ))}
                </div>
              ) : gAlbumsError ? (
                <StateView
                  variant="error"
                  title="Could not load Google Photos albums"
                  description="Your Google token may need to be re-authorized with Photos Library access."
                  action={
                    <a
                      href="/api/auth/google?next=/studio/dashboard"
                      className="px-4 py-2 bg-ink text-paper rounded-[8px] font-semibold text-[13px]"
                    >
                      Reconnect Google Photos
                    </a>
                  }
                />
              ) : !gAlbums?.length ? (
                <StateView
                  variant="empty"
                  title="No Google Photos albums found"
                  description="Create albums in Google Photos and click Refresh albums."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {gAlbums.map((album) => {
                    const effectiveCategory =
                      albumCategoryOverrides[album.id] ??
                      album.assignedCategory ??
                      album.suggestedCategory ??
                      'City';
                    const isSynced = Boolean(album.syncedGalleryId);
                    const isSyncingThis =
                      syncingAlbumId === album.id || syncAllMutation.isPending;

                    return (
                      <div
                        key={album.id}
                        className="flex items-center gap-3 p-3.5 rounded-[10px] border border-line bg-canvas/50 hover:border-field transition-colors"
                      >
                        {album.coverPhotoBaseUrl ? (
                          <img
                            src={`${album.coverPhotoBaseUrl}=w120-h120-c`}
                            alt={album.title}
                            className="w-14 h-14 rounded-[8px] shrink-0 object-cover bg-canvas"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-[8px] bg-canvas border border-line shrink-0 flex items-center justify-center font-mono text-[10px] text-muted">
                            ALBUM
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13.5px] font-semibold text-ink truncate">
                              {album.title}
                            </p>
                            {isSynced && (
                              <span
                                className="shrink-0 font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-positive/10 text-positive"
                                title="Already synced to your portfolio"
                              >
                                Synced
                              </span>
                            )}
                          </div>
                          <p className="font-mono text-[10.5px] text-muted mt-0.5">
                            {album.mediaItemsCount ?? '0'} items
                            {isSynced && typeof album.syncedFramesCount === 'number'
                              ? ` · ${album.syncedFramesCount} imported`
                              : ''}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <label className="sr-only" htmlFor={`cat-${album.id}`}>
                              Category for {album.title}
                            </label>
                            <select
                              id={`cat-${album.id}`}
                              aria-label={`Category for ${album.title}`}
                              value={effectiveCategory}
                              onChange={(e) =>
                                setAlbumCategoryOverrides((prev) => ({
                                  ...prev,
                                  [album.id]: e.target.value,
                                }))
                              }
                              className="px-2 py-1 rounded-[6px] border border-field bg-surface font-mono text-[10.5px] text-ink outline-none focus:border-ink"
                            >
                              {PHOTO_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                syncSingleMutation.mutate({
                                  albumId: album.id,
                                  category: effectiveCategory,
                                })
                              }
                              disabled={isSyncingThis}
                              className="ml-auto px-3 py-1 rounded-[7px] bg-ink text-paper font-semibold text-[11.5px] hover:bg-ink-2 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {syncingAlbumId === album.id
                                ? 'Syncing…'
                                : isSynced
                                  ? 'Re-sync'
                                  : 'Pull'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Categorized Galleries */}
        <div className="bg-surface border border-line rounded-card p-6 mb-6">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
            <div>
              <h2 className="font-serif text-[22px] font-[500] text-ink">
                Categorized Galleries
              </h2>
              <p className="font-mono text-[11px] text-muted mt-0.5">
                {allGalleries.length} total galleries across {galleryCategories.length} categories
              </p>
            </div>
            <Link
              to="/studio/builder"
              className="font-mono text-[11px] tracking-label text-ink-3 hover:text-ink transition-colors duration-150"
            >
              OPEN GALLERY BUILDER →
            </Link>
          </div>

          {/* Category filter pills */}
          {allGalleries.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 border-b border-line">
              {categoryFilters.map((cat) => {
                const count =
                  cat === 'All'
                    ? allGalleries.length
                    : allGalleries.filter((g) => (g.category || 'Uncategorized') === cat).length;
                const active = selectedCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full font-mono text-[11px] transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-ink text-paper'
                        : 'bg-canvas text-ink-3 hover:text-ink border border-line'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {galleriesLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTile key={i} className="aspect-video" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredGalleries.map((g, i) => {
                const coverSrc = g.coverPhotoUrl || seedPhotoUrl(i, 800);
                return (
                  <div
                    key={g.id}
                    className="group rounded-tile border border-line bg-canvas/30 p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video rounded-[8px] overflow-hidden mb-3 bg-canvas">
                        <img
                          src={coverSrc}
                          alt={g.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-ink/80 text-paper font-mono text-[10px]">
                          {g.category || 'Uncategorized'}
                        </span>
                        {g.googleAlbumId && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-paper/90 text-ink font-mono text-[9.5px]">
                            Google Photos
                          </span>
                        )}
                      </div>
                      <p className="text-[14px] font-semibold text-ink truncate">
                        {g.title}
                      </p>
                      <p className="font-mono text-[10.5px] text-muted mt-0.5">
                        {g.counts.frames} frames · {g.counts.views} views
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between gap-2">
                      <label className="sr-only" htmlFor={`gallery-cat-${g.id}`}>
                        Category for gallery {g.title}
                      </label>
                      <select
                        id={`gallery-cat-${g.id}`}
                        aria-label={`Category for gallery ${g.title}`}
                        value={g.category ?? ''}
                        onChange={(e) =>
                          categoryPatchMutation.mutate({
                            galleryId: g.id,
                            category: e.target.value,
                          })
                        }
                        className="flex-1 min-w-0 px-2 py-1 rounded-[6px] border border-field bg-surface font-mono text-[10.5px] text-ink outline-none focus:border-ink"
                      >
                        <option value="">Uncategorized</option>
                        {PHOTO_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <Link
                        to="/studio/builder"
                        className="font-mono text-[10.5px] text-ink-3 hover:text-ink whitespace-nowrap"
                      >
                        Edit →
                      </Link>
                    </div>
                  </div>
                );
              })}
              {!galleriesLoading && !filteredGalleries.length && (
                <div className="col-span-full">
                  <StateView
                    variant="empty"
                    title="No galleries in this category"
                    description="Pull albums from Google Photos above or upload photos directly."
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
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
            <div className="flex items-baseline justify-between mb-[18px]">
              <h2 className="font-serif text-[22px] font-[500] text-ink">Recent sales</h2>
              <a href="/studio/orders" className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted hover:text-ink transition-colors">
                VIEW ALL →
              </a>
            </div>
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
      </div>
    </div>
  );
}
