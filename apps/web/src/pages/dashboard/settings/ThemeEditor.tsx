import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { hexColorSchema, type ThemeTokens } from '@blueflutes/shared';
import { X } from 'lucide-react';

type FontToken = ThemeTokens['fontHeading'];
type GalleryLayout = ThemeTokens['galleryLayout'];
import { Button } from '../../../components/ui/Button.js';
import { Chip } from '../../../components/ui/Chip.js';
import { Input } from '../../../components/ui/Input.js';
import { StateView } from '../../../components/ui/StateView.js';
import { getMySettings, updateTheme } from '../../../api/settings.js';
import { qk, queryClient } from '../../../lib/query-client.js';
import { FONT_STACKS } from '../../../lib/theme.js';

const FONT_OPTIONS: { value: FontToken; label: string }[] = [
  { value: 'newsreader', label: 'Newsreader' },
  { value: 'hanken', label: 'Hanken Grotesk' },
  { value: 'spacemono', label: 'Space Mono' },
  { value: 'system-serif', label: 'System serif' },
  { value: 'system-sans', label: 'System sans' },
];

const LAYOUT_OPTIONS: { value: GalleryLayout; label: string }[] = [
  { value: 'grid', label: 'Grid' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'editorial', label: 'Editorial' },
];

const GRID_COLUMN_OPTIONS = [2, 3, 4, 5, 6] as const;

const COLOR_FIELDS: { key: keyof ThemeTokens & string; label: string }[] = [
  { key: 'colorBg', label: 'Background' },
  { key: 'colorInk', label: 'Ink' },
  { key: 'colorAccent', label: 'Accent' },
  { key: 'colorMuted', label: 'Muted' },
];

function themesEqual(a: ThemeTokens, b: ThemeTokens): boolean {
  return (
    a.colorBg === b.colorBg &&
    a.colorInk === b.colorInk &&
    a.colorAccent === b.colorAccent &&
    a.colorMuted === b.colorMuted &&
    a.fontHeading === b.fontHeading &&
    a.fontBody === b.fontBody &&
    a.galleryLayout === b.galleryLayout &&
    a.gridColumns === b.gridColumns
  );
}

function diffTheme(saved: ThemeTokens, draft: ThemeTokens): Partial<ThemeTokens> {
  const patch: Partial<ThemeTokens> = {};
  (Object.keys(draft) as (keyof ThemeTokens)[]).forEach((key) => {
    if (draft[key] !== saved[key]) {
      (patch as Record<string, unknown>)[key] = draft[key];
    }
  });
  return patch;
}

/** WCAG 2.1 relative luminance from a 6-digit hex color. */
function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.1 contrast ratio between two 6-digit hex colors. */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function isValidHex(v: string): v is string {
  return /^#[0-9a-fA-F]{6}$/.test(v);
}

interface ContrastWarning {
  pair: string;
  ratio: number;
}

function checkContrast(draft: ThemeTokens): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  const pairs: [string, string, string][] = [
    [draft.colorInk, draft.colorBg, 'Ink / Background'],
    [draft.colorMuted, draft.colorBg, 'Muted / Background'],
    [draft.colorAccent, draft.colorBg, 'Accent / Background'],
  ];
  for (const [fg, bg, label] of pairs) {
    if (isValidHex(fg) && isValidHex(bg)) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < 4.5) {
        warnings.push({ pair: label, ratio });
      }
    }
  }
  return warnings;
}

export default function ThemeEditor() {
  const { data, status, error, refetch } = useQuery({
    queryKey: qk.mySettings(),
    queryFn: getMySettings,
  });

  const [draft, setDraft] = useState<ThemeTokens | null>(null);
  const [colorErrors, setColorErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  const mutation = useMutation({
    mutationFn: (patch: Partial<ThemeTokens>) => updateTheme(patch),
    onSuccess: (result) => {
      queryClient.setQueryData(qk.mySettings(), result);
      queryClient.setQueryData(qk.theme(), result);
      setDraft(result);
    },
  });

  if (status === 'pending' || !draft) {
    return <StateView variant="loading" title="Loading theme…" />;
  }

  if (status === 'error') {
    return (
      <StateView
        variant="error"
        title="Failed to load theme"
        description={error instanceof Error ? error.message : undefined}
        action={
          <Button onClick={() => void refetch()} className="mt-4">
            Retry
          </Button>
        }
      />
    );
  }

  const saved = data;
  const isDirty = !themesEqual(saved, draft);
  const hasColorErrors = Object.values(colorErrors).some(Boolean);
  const contrastWarnings = checkContrast(draft);
  const hasContrastFailure = contrastWarnings.length > 0;

  function setField<K extends keyof ThemeTokens>(key: K, value: ThemeTokens[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleHexChange(key: keyof ThemeTokens, value: string) {
    setField(key, value as never);
    const result = hexColorSchema.safeParse(value);
    setColorErrors((prev) => ({ ...prev, [key]: result.success ? undefined : 'Must be a 6-digit hex color' }));
  }

  function handleDiscard() {
    setDraft(saved);
    setColorErrors({});
  }

  function handleSave() {
    const patch = diffTheme(saved, draft!);
    if (Object.keys(patch).length === 0) return;
    mutation.mutate(patch);
  }

  const headingFont = FONT_STACKS[draft.fontHeading];
  const bodyFont = FONT_STACKS[draft.fontBody];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-ink">Theme</h1>
        <p className="mt-1 text-sm text-muted">
          Customize the colors, type, and gallery layout your visitors see on your public portfolio.
        </p>
      </div>

      {mutation.isError && (
        <div className="flex items-center justify-between rounded border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          <span>{mutation.error instanceof Error ? mutation.error.message : 'Failed to save theme'}</span>
          <button
            className="ml-4 text-negative/70 hover:text-negative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            onClick={() => mutation.reset()}
            aria-label="Dismiss error"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      {hasContrastFailure && (
        <div className="rounded border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-ink">
          <p className="font-medium">Contrast too low — Save blocked</p>
          <ul className="mt-1 list-disc pl-4 text-muted">
            {contrastWarnings.map((w) => (
              <li key={w.pair}>
                {w.pair}: {w.ratio.toFixed(2)}:1 (needs 4.5:1)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-lg border border-line bg-canvas/50 p-6">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Colors</h2>
            <div className="grid grid-cols-2 gap-4">
              {COLOR_FIELDS.map(({ key, label }) => (
                <div key={key} className="space-y-1.5">
                  <label htmlFor={`theme-${key}`} className="text-xs text-muted">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      aria-label={`${label} color picker`}
                      value={/^#[0-9a-fA-F]{6}$/.test(draft[key] as string) ? (draft[key] as string) : '#000000'}
                      onChange={(e) => handleHexChange(key, e.target.value)}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    />
                    <Input
                      id={`theme-${key}`}
                      value={draft[key] as string}
                      onChange={(e) => handleHexChange(key, e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  {colorErrors[key] && <p className="text-xs text-negative">{colorErrors[key]}</p>}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Heading font</h2>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={draft.fontHeading === opt.value}
                  onClick={() => setField('fontHeading', opt.value)}
                  style={{ fontFamily: FONT_STACKS[opt.value] }}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Body font</h2>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={draft.fontBody === opt.value}
                  onClick={() => setField('fontBody', opt.value)}
                  style={{ fontFamily: FONT_STACKS[opt.value] }}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Gallery layout</h2>
            <div className="flex flex-wrap gap-2">
              {LAYOUT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  active={draft.galleryLayout === opt.value}
                  onClick={() => setField('galleryLayout', opt.value)}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-ink">Grid columns</h2>
            <div className="flex flex-wrap gap-2">
              {GRID_COLUMN_OPTIONS.map((n) => (
                <Chip key={n} active={draft.gridColumns === n} onClick={() => setField('gridColumns', n)}>
                  {n}
                </Chip>
              ))}
            </div>
          </section>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={!isDirty || hasColorErrors || hasContrastFailure || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <Button variant="outline" onClick={handleDiscard} disabled={!isDirty || mutation.isPending}>
              Discard changes
            </Button>
            {!isDirty && !mutation.isPending && (
              <span className="text-xs text-muted">All changes saved</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-medium text-ink">Preview</h2>
          <div
            className="overflow-hidden rounded-lg border border-line"
            style={{ backgroundColor: draft.colorBg, color: draft.colorInk }}
          >
            <div className="p-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: draft.colorMuted, fontFamily: bodyFont }}
              >
                Portfolio
              </p>
              <h3 className="mt-2 text-2xl" style={{ fontFamily: headingFont }}>
                A quiet body of work
              </h3>
              <p className="mt-2 text-sm" style={{ color: draft.colorMuted, fontFamily: bodyFont }}>
                Selected prints, {draft.galleryLayout} layout, {draft.gridColumns} columns.
              </p>
              <div
                className="mt-4 grid gap-2"
                style={{ gridTemplateColumns: `repeat(${Math.min(draft.gridColumns, 4)}, 1fr)` }}
              >
                {Array.from({ length: Math.min(draft.gridColumns, 4) }).map((_, i) => (
                  <div key={i} className="aspect-square rounded" style={{ backgroundColor: draft.colorMuted, opacity: 0.35 }} />
                ))}
              </div>
              <button
                type="button"
                className="mt-4 rounded-[9px] px-[18px] py-[11px] text-sm font-semibold"
                style={{ backgroundColor: draft.colorAccent, color: draft.colorBg, fontFamily: bodyFont }}
              >
                View gallery
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
