import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button.js';
import { pickFiles } from '../../lib/file-picker.js';
import { isDesktop } from '../../lib/platform.js';
import { useAuthStore } from '../../stores/auth-store.js';

export default function DashboardHome() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  async function handlePickFiles() {
    setSelectedFiles(await pickFiles());
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back{user?.displayName ? `, ${user.displayName}` : ''}.
        </p>
      </div>

      {/* Quick-stats row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">—</p>
          <p className="mt-1 text-sm text-gray-500">Galleries</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-2xl font-semibold text-gray-900">—</p>
          <p className="mt-1 text-sm text-gray-500">Photos</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
            View portfolio →
          </a>
          <p className="mt-1 text-sm text-gray-500">Public URL</p>
        </div>
      </div>

      {/* Get started card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Upload your first photos</h2>
        <p className="mt-1 text-sm text-gray-500">
          Create a gallery, then drag photos in. Your portfolio updates instantly.
        </p>
        <button
          type="button"
          onClick={() => navigate('/dashboard/content')}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Go to Content →
        </button>
      </div>

      {/* Desktop file picker (Tauri only) */}
      {isDesktop() && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Import media</h2>
          <p className="mt-1 text-sm text-gray-500">
            Pick files from your computer. Uploading them to your portfolio is coming in a future
            update.
          </p>
          <Button variant="outline" className="mt-4" onClick={handlePickFiles}>
            Choose files
          </Button>
          {selectedFiles.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-500">
              {selectedFiles.map((path) => (
                <li key={path} className="truncate">
                  {path}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
