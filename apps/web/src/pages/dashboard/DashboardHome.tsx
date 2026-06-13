import { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { pickFiles } from '../../lib/file-picker.js';
import { isDesktop } from '../../lib/platform.js';

export default function DashboardHome() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  async function handlePickFiles() {
    setSelectedFiles(await pickFiles());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">Welcome to your PortfolioHub dashboard.</p>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-6">
        <h2 className="text-sm font-medium text-slate-200">What's next</h2>
        <p className="mt-2 text-sm text-slate-400">
          Your public portfolio is live at{' '}
          <a href="/" className="font-medium text-slate-200 underline underline-offset-2 hover:text-white">
            the portfolio viewer
          </a>
          . Gallery and page management is coming in a future update.
        </p>
      </div>

      {isDesktop() && (
        <div className="rounded-lg border border-slate-800 bg-slate-800/50 p-6">
          <h2 className="text-sm font-medium text-slate-200">Import media</h2>
          <p className="mt-2 text-sm text-slate-400">
            Pick files from your computer. Uploading them to your portfolio is coming in a future update.
          </p>
          <Button variant="secondary" className="mt-4" onClick={handlePickFiles}>
            Choose files
          </Button>
          {selectedFiles.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-400">
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
