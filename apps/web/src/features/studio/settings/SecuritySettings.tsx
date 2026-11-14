import { useCallback, useEffect, useState } from 'react';
import type { PasskeyCredential } from '@blueflutes/shared';
import {
  listPasskeys,
  registerPasskey,
  renamePasskey,
  deletePasskey,
} from '../../../api/passkeys.js';

function formatDate(d: Date | string | null): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function DeviceIcon({ deviceType, backedUp }: { deviceType: string; backedUp: boolean }) {
  if (backedUp) {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M7 10l2.5 2.5L14 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (deviceType === 'singleDevice') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="5" y="2" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="10" cy="15" r="1" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="6" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 6V5a4 4 0 018 0v1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

interface CredentialRowProps {
  cred: PasskeyCredential;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CredentialRow({ cred, onRename, onDelete }: CredentialRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cred.friendlyName ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveRename() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === (cred.friendlyName ?? '')) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onRename(cred.id, trimmed);
      setEditing(false);
    } catch {
      setError('Could not rename. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Remove "${cred.friendlyName ?? 'this passkey'}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(cred.id);
    } catch {
      setError('Could not remove. Try again.');
      setBusy(false);
    }
  }

  return (
    <li className="flex items-start gap-3 py-4 border-b border-divider last:border-0">
      <span className="mt-0.5 text-ink-3 shrink-0">
        <DeviceIcon deviceType={cred.deviceType} backedUp={cred.backedUp} />
      </span>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              className="flex-1 min-w-0 px-2 py-1 rounded border border-divider bg-field-bg text-ink text-sm"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveRename();
                if (e.key === 'Escape') setEditing(false);
              }}
              disabled={busy}
            />
            <button
              className="text-xs text-ink-3 hover:text-ink px-2 py-1"
              onClick={() => void saveRename()}
              disabled={busy}
            >
              Save
            </button>
            <button
              className="text-xs text-ink-3 hover:text-ink px-2 py-1"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="font-medium text-sm text-ink hover:underline text-left"
            onClick={() => setEditing(true)}
          >
            {cred.friendlyName ?? 'Unnamed passkey'}
          </button>
        )}

        <p className="text-xs text-ink-3 mt-0.5">
          {cred.backedUp ? 'Synced across devices' : 'Single-device only'}
          {' · '}Added {formatDate(cred.createdAt)}
          {cred.lastUsedAt && ` · Used ${formatDate(cred.lastUsedAt)}`}
        </p>

        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <button
        className="shrink-0 text-xs text-ink-3 hover:text-red-500 transition-colors"
        onClick={() => void handleDelete()}
        disabled={busy}
        aria-label="Remove passkey"
      >
        Remove
      </button>
    </li>
  );
}

export default function SecuritySettings() {
  const [creds, setCreds] = useState<PasskeyCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const { credentials } = await listPasskeys();
      setCreds(credentials);
    } catch {
      setFetchError('Could not load passkeys. Refresh to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    setAdding(true);
    setAddError(null);
    try {
      const created = await registerPasskey();
      setCreds((prev) => [...prev, created]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('NotAllowedError') && !msg.includes('AbortError')) {
        setAddError('Could not register passkey. Try again.');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string, name: string) {
    await renamePasskey(id, name);
    setCreds((prev) =>
      prev.map((c) => (c.id === id ? { ...c, friendlyName: name } : c)),
    );
  }

  async function handleDelete(id: string) {
    await deletePasskey(id);
    setCreds((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-lg font-semibold text-ink">Security</h1>
        <p className="text-sm text-ink-3 mt-1">
          Manage passkeys for fast, password-free sign-in.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Passkeys</h2>
          <button
            className="text-sm font-medium text-ink border border-divider rounded-[9px] px-3 py-1.5 hover:bg-field-bg transition-colors disabled:opacity-50"
            onClick={() => void handleAdd()}
            disabled={adding}
          >
            {adding ? 'Follow your device…' : 'Add a passkey'}
          </button>
        </div>

        {addError && (
          <p className="text-xs text-red-500">{addError}</p>
        )}

        {loading ? (
          <p className="text-sm text-ink-3">Loading…</p>
        ) : fetchError ? (
          <p className="text-sm text-red-500">{fetchError}</p>
        ) : creds.length === 0 ? (
          <div className="border border-dashed border-divider rounded-xl p-6 text-center">
            <p className="text-sm text-ink-3">No passkeys yet.</p>
            <p className="text-xs text-ink-3 mt-1">
              Passkeys use your device's biometrics or PIN — no password needed.
            </p>
          </div>
        ) : (
          <ul className="border border-divider rounded-xl px-4">
            {creds.map((cred) => (
              <CredentialRow
                key={cred.id}
                cred={cred}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
