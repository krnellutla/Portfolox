import { useEffect, useRef, useState } from 'react';
import { Eyebrow } from '../../../components/ui/Eyebrow.js';

const SPECIALTY_OPTIONS = [
  'Weddings', 'Portraits', 'Commercial', 'Events', 'Nature',
  'Architecture', 'Street', 'Fine Art', 'Sports', 'Travel',
] as const;

type Specialty = typeof SPECIALTY_OPTIONS[number];

interface ProfileForm {
  displayName: string;
  handle: string;
  location: string;
  bio: string;
  specialties: Specialty[];
}

export default function ProfileSettings() {
  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    handle: '',
    location: '',
    bio: '',
    specialties: [],
  });
  const [saved, setSaved] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  function toggleSpecialty(s: Specialty) {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Stub — no API call yet; show "Saved" toast
    setSaved(true);
    toastTimer.current = setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div>
      <Eyebrow>PROFILE</Eyebrow>
      <h2 className="font-serif text-[28px] font-medium text-ink mt-1 mb-8">Profile</h2>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Avatar */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-2 uppercase">
            Photo
          </label>
          <div className="relative w-20 h-20 rounded-full bg-field overflow-hidden group">
            <div className="w-full h-full rounded-full bg-canvas" />
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            >
              <span className="font-mono text-[10px] text-paper">Change</span>
            </button>
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Display name
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-[9px] bg-field-bg border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink"
            value={form.displayName}
            onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
          />
        </div>

        {/* Handle */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Handle
          </label>
          <div className="flex items-center gap-2">
            <span className="text-ink-3 text-sm font-mono">@</span>
            <input
              type="text"
              className="flex-1 px-3 py-2 rounded-[9px] bg-field-bg border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink"
              value={form.handle}
              onChange={(e) => setForm((p) => ({ ...p, handle: e.target.value }))}
            />
          </div>
          {form.handle && (
            <p className="mt-1 font-mono text-[11px] text-ink-3">
              Your studio URL: {form.handle}.blueflutes.com
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Location
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 rounded-[9px] bg-field-bg border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink"
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
          />
        </div>

        {/* Specialties */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-2 uppercase">
            Specialties
          </label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTY_OPTIONS.map((s) => {
              const selected = form.specialties.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSpecialty(s)}
                  className={`px-3 py-1 rounded-[999px] font-mono text-[11px] transition-colors border ${
                    selected
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-surface text-ink-3 border-line hover:text-ink'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="block font-mono text-[11px] text-ink-3 tracking-label mb-1.5 uppercase">
            Bio
          </label>
          <textarea
            rows={4}
            maxLength={500}
            className="w-full px-3 py-2 rounded-[9px] bg-field-bg border border-line text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ink resize-none"
            value={form.bio}
            onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
          />
          <p className="text-right font-mono text-[11px] text-ink-3 mt-0.5">
            {form.bio.length} / 500
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="font-mono text-[12px] text-emerald-600">Saved</span>
          )}
          <button
            type="submit"
            className="px-5 py-2 rounded-[9px] bg-ink text-paper text-sm font-semibold hover:bg-ink-2 transition-colors"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
