import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getClientGallery, unlockGallery, ApiError } from '../../api/client-gallery.js';
import { qk, queryClient } from '../../lib/query-client.js';
import { seedPhotoUrl } from '../../lib/seed-photos.js';

// ---------------------------------------------------------------------------
// Password gate UI
// ---------------------------------------------------------------------------
function PasswordGate({
  shareToken,
  onUnlocked,
}: {
  shareToken: string;
  onUnlocked: () => void;
}) {
  const [password, setPassword] = useState('');

  const { mutate: unlock, isPending, error } = useMutation({
    mutationFn: () => unlockGallery(shareToken, password),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: qk.clientGallery(shareToken) });
      onUnlocked();
    },
  });

  const wrongPassword =
    error instanceof ApiError && error.code === 'INVALID_PASSWORD';

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mx-auto mb-4 h-8 w-8 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
            />
          </svg>
          <h1 className="text-xl font-light text-gray-900">Private Gallery</h1>
          <p className="mt-1 text-sm text-gray-400">Enter the password to view</p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && password.length > 0 && unlock()}
          placeholder="Password"
          className="w-full border-b border-gray-200 py-3 text-center text-sm outline-none focus:border-gray-900"
          autoFocus
        />

        <button
          onClick={() => unlock()}
          disabled={isPending || password.length === 0}
          className="mt-4 w-full bg-gray-900 py-3 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40 transition-colors"
        >
          {isPending ? 'Checking…' : 'View Gallery'}
        </button>

        {wrongPassword && (
          <p className="mt-3 text-center text-sm text-red-500">Incorrect password</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gallery grid
// ---------------------------------------------------------------------------
function GalleryGrid({ photoOrder, title }: { photoOrder: string[]; title: string }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-2xl font-light text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-400">{photoOrder.length} photos</p>
      </header>

      <div className="px-4 pb-10">
        <div className="flex flex-wrap" style={{ gap: '4px' }}>
          {photoOrder.map((id, i) => (
            <div
              key={id}
              style={{ height: '220px', flexGrow: 1, flexBasis: '280px', overflow: 'hidden' }}
            >
              <img
                src={seedPhotoUrl(i)}
                alt=""
                className="photo-protected w-full h-full object-cover"
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
          ))}
          {/* filler to prevent last row from stretching */}
          <div style={{ flexGrow: 10, flexBasis: '280px', height: '220px' }} aria-hidden />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ClientGallery() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [unlocked, setUnlocked] = useState(false);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: qk.clientGallery(shareToken ?? ''),
    queryFn: () => getClientGallery(shareToken ?? ''),
    retry: (failureCount, err) => {
      // Don't retry on auth/lock errors
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return false;
      return failureCount < 2;
    },
    enabled: !!shareToken,
  });

  if (!shareToken) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span className="text-sm text-gray-400">Loading…</span>
      </div>
    );
  }

  // Gallery is locked
  if (error instanceof ApiError && error.code === 'GALLERY_LOCKED') {
    return (
      <PasswordGate
        shareToken={shareToken}
        onUnlocked={() => {
          setUnlocked(true);
          void refetch();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <p className="text-sm text-gray-400">Gallery not found.</p>
      </div>
    );
  }

  if (!data) return null;

  return <GalleryGrid photoOrder={data.photoOrder} title={data.title} />;
}
