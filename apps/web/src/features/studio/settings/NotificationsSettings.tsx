import { useRef, useState } from 'react';
import { Eyebrow } from '../../../components/ui/Eyebrow.js';
import { Toggle } from '../../../components/ui/Toggle.js';

interface NotifPrefs {
  newOrder: boolean;
  newMessage: boolean;
  clientSelects: boolean;
  newFollower: boolean;
}

const ROWS: { key: keyof NotifPrefs; label: string }[] = [
  { key: 'newOrder', label: 'New order' },
  { key: 'newMessage', label: 'New message' },
  { key: 'clientSelects', label: 'Client submitted selects' },
  { key: 'newFollower', label: 'New follower' },
];

export default function NotificationsSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    newOrder: true,
    newMessage: true,
    clientSelects: true,
    newFollower: false,
  });
  const [saved, setSaved] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function toggle(key: keyof NotifPrefs, val: boolean) {
    setPrefs((p) => ({ ...p, [key]: val }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Stub — no API call
    setSaved(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <Eyebrow>NOTIFICATIONS</Eyebrow>
      <h2 className="font-serif text-[28px] font-medium text-ink mt-1 mb-8">Notifications</h2>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex flex-col divide-y divide-line rounded-[12px] border border-line overflow-hidden">
          {ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm text-ink">{label}</span>
              <Toggle
                checked={prefs[key]}
                onChange={(v) => toggle(key, v)}
                label={label}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="font-mono text-[12px] text-emerald-600">Saved</span>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded-[9px] bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors"
          >
            Save preferences
          </button>
        </div>
      </form>
    </div>
  );
}
