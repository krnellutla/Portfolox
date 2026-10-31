// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage.js';

vi.mock('../../api/analytics.js', () => ({
  getSummary: vi.fn().mockResolvedValue({
    profileViews: 1200,
    revenue: 45000,
    avgOrderMinorUnits: 15000,
    conversionPct: 3.2,
    currency: 'USD',
    deltas: { profileViews: 0.12, revenue: 0.2, avgOrder: 0.05, conversion: 0.01 },
  }),
  getRevenue: vi.fn().mockResolvedValue([{ month: '2026-10-01', revenue: 45000 }]),
  getRecentSales: vi.fn().mockResolvedValue([]),
}));

const mockGetMyGalleries = vi.fn();
const mockUpdateGallery = vi.fn();
const mockAutoCategorizeGalleries = vi.fn();

vi.mock('../../api/me.js', () => ({
  getMyGalleries: (...args: unknown[]) => mockGetMyGalleries(...args),
  updateGallery: (...args: unknown[]) => mockUpdateGallery(...args),
  autoCategorizeGalleries: (...args: unknown[]) => mockAutoCategorizeGalleries(...args),
}));

const mockGetGooglePhotosStatus = vi.fn();
const mockListGoogleAlbums = vi.fn();
const mockSyncGoogleAlbum = vi.fn();
const mockSyncAllGoogleAlbums = vi.fn();

vi.mock('../../api/google-photos.js', () => ({
  getGooglePhotosStatus: (...args: unknown[]) => mockGetGooglePhotosStatus(...args),
  listGoogleAlbums: (...args: unknown[]) => mockListGoogleAlbums(...args),
  syncGoogleAlbum: (...args: unknown[]) => mockSyncGoogleAlbum(...args),
  syncAllGoogleAlbums: (...args: unknown[]) => mockSyncAllGoogleAlbums(...args),
}));

function renderDashboard() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/studio/dashboard']}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DashboardPage — Google Photos Pull & Auto-Categorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyGalleries.mockResolvedValue([
      {
        id: 'gal-1',
        photographerId: 'tenant-1',
        title: 'Marina Bay Blue Hour',
        description: '',
        coverPhotoId: 'p1',
        coverPhotoUrl: 'https://lh3.googleusercontent.com/p1=w400-h300',
        category: 'City',
        googleAlbumId: 'ga-1',
        visibility: 'public',
        layout: 'grid',
        printsForSale: false,
        photoOrder: ['p1'],
        counts: { frames: 12, views: 40 },
      },
      {
        id: 'gal-2',
        photographerId: 'tenant-1',
        title: 'Mahesh Family Shoot',
        description: '',
        coverPhotoId: 'p2',
        coverPhotoUrl: 'https://lh3.googleusercontent.com/p2=w400-h300',
        category: 'Family',
        googleAlbumId: 'ga-2',
        visibility: 'public',
        layout: 'grid',
        printsForSale: false,
        photoOrder: ['p2'],
        counts: { frames: 8, views: 15 },
      },
    ]);
  });

  afterEach(() => {
    cleanup();
  });

  it('shows Connect Google Photos CTA when not connected', async () => {
    mockGetGooglePhotosStatus.mockResolvedValue({ connected: false, tokenExpiresAt: null });

    renderDashboard();

    const connectLink = await screen.findByRole('link', { name: /Connect Google Photos/i });
    expect(connectLink.getAttribute('href')).toBe('/api/auth/google?next=/studio/dashboard');
  });

  it('lists Google Photos albums with auto-suggested categories and pulls + auto-categorizes all albums', async () => {
    mockGetGooglePhotosStatus.mockResolvedValue({
      connected: true,
      tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    mockListGoogleAlbums.mockResolvedValue([
      {
        id: 'ga-1',
        title: 'Marina Bay Blue Hour',
        mediaItemsCount: '12',
        coverPhotoBaseUrl: 'https://lh3.googleusercontent.com/c1',
        suggestedCategory: 'City',
        syncedGalleryId: 'gal-1',
        assignedCategory: 'City',
        syncedFramesCount: 12,
      },
      {
        id: 'ga-3',
        title: 'San Francisco B&W Street',
        mediaItemsCount: '20',
        coverPhotoBaseUrl: 'https://lh3.googleusercontent.com/c3',
        suggestedCategory: 'B&W',
        syncedGalleryId: null,
        assignedCategory: null,
        syncedFramesCount: 0,
      },
    ]);
    mockSyncAllGoogleAlbums.mockResolvedValue({
      totalAlbums: 2,
      albumsSynced: 2,
      photosSynced: 20,
      photosSkipped: 12,
      categories: { City: 1, 'B&W': 1 },
      results: [
        { galleryNodeId: 'gal-1', albumTitle: 'Marina Bay Blue Hour', category: 'City', synced: 0, skipped: 12 },
        { galleryNodeId: 'gal-3', albumTitle: 'San Francisco B&W Street', category: 'B&W', synced: 20, skipped: 0 },
      ],
    });

    renderDashboard();

    await screen.findByText('San Francisco B&W Street');
    const pullAllBtn = await screen.findByRole('button', {
      name: /Pull & Auto-Categorize All \(2\)/i,
    });

    fireEvent.click(pullAllBtn);

    await waitFor(() => {
      expect(mockSyncAllGoogleAlbums).toHaveBeenCalledTimes(1);
    });

    await screen.findByText(/Pulled 2 albums \(20 new photos, 12 up-to-date\)/i);
  });

  it('filters galleries by category tab and allows changing a gallery category inline', async () => {
    mockGetGooglePhotosStatus.mockResolvedValue({ connected: false, tokenExpiresAt: null });
    mockUpdateGallery.mockResolvedValue({});

    renderDashboard();

    await screen.findByText('Marina Bay Blue Hour');
    await screen.findByText('Mahesh Family Shoot');

    // Filter by Family category tab
    const familyFilterBtn = await screen.findByRole('button', { name: 'Family (1)' });
    fireEvent.click(familyFilterBtn);

    expect(screen.queryByText('Marina Bay Blue Hour')).toBeNull();
    expect(screen.getByText('Mahesh Family Shoot')).toBeTruthy();

    // Change category of Mahesh Family Shoot to Portrait
    const catSelect = screen.getByLabelText('Category for gallery Mahesh Family Shoot');
    fireEvent.change(catSelect, { target: { value: 'Portrait' } });

    await waitFor(() => {
      expect(mockUpdateGallery).toHaveBeenCalledWith('gal-2', { category: 'Portrait' });
    });
  });
});
