import type { NodeResponse } from '@portfoliohub/shared';
import { slugify } from '@portfoliohub/shared';
import { useState } from 'react';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';

interface Props {
  parentId: string | null;
  onConfirm: (
    type: NodeResponse['type'],
    name: string,
    slug: string,
    parentId: string | null,
  ) => Promise<void>;
  onClose: () => void;
}

const NODE_TYPES: { value: NodeResponse['type']; label: string }[] = [
  { value: 'folder', label: 'Folder' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'page', label: 'Page' },
];

export function CreateNodeDialog({ parentId, onConfirm, onClose }: Props) {
  const [type, setType] = useState<NodeResponse['type']>('gallery');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim() || slugify(trimmedName);
    if (!trimmedName) return;

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(type, trimmedName, trimmedSlug, parentId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create node');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-sm font-semibold text-slate-100">New node</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {NODE_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex-1 rounded border px-2 py-1.5 text-xs transition-colors ${
                  type === t.value
                    ? 'border-slate-500 bg-slate-700 text-slate-100'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Name</label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My Gallery"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400">Slug</label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="my-gallery"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!name.trim() || submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
