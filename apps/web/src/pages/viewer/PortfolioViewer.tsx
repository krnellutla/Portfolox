import { useEffect, useState } from 'react';
import { listNodes } from '../../api/nodes.js';
import { ApiError } from '../../api/client.js';
import { buildNodeTree, type NodeTreeItem } from '../../lib/build-tree.js';
import { NodeGrid } from './NodeGrid.js';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; tree: NodeTreeItem[] };

// High-quality Pexels photos used as placeholders when the portfolio has no content.
// Each entry: { id, alt, photographer, aspect } — aspect controls grid spanning.
const PLACEHOLDER_PHOTOS = [
  { id: 1366919, alt: 'Woman standing on mountain top', photographer: 'Nina Uhlikova', aspect: 'tall' },
  { id: 2662116, alt: 'City skyline at dusk', photographer: 'Picography', aspect: 'wide' },
  { id: 3408744, alt: 'Misty forest at sunrise', photographer: 'Pixabay', aspect: 'normal' },
  { id: 1563356, alt: 'Portrait with natural light', photographer: 'Burst', aspect: 'normal' },
  { id: 1761279, alt: 'Ocean waves at sunset', photographer: 'Enric Cruz López', aspect: 'wide' },
  { id: 3225517, alt: 'Closeup of spring flowers', photographer: 'Pixabay', aspect: 'normal' },
  { id: 1105666, alt: 'Modern architecture detail', photographer: 'Expect Best', aspect: 'normal' },
  { id: 2253879, alt: 'Desert landscape golden hour', photographer: 'Pixabay', aspect: 'normal' },
  { id: 1040881, alt: 'Urban street photography', photographer: 'Snapwire', aspect: 'tall' },
] as const;

function pexelsUrl(id: number, w = 800): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

function HeroSection() {
  return (
    <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden">
      <img
        src={pexelsUrl(PLACEHOLDER_PHOTOS[0]!.id, 1600)}
        alt={PLACEHOLDER_PHOTOS[0]!.alt}
        className="h-full w-full object-cover"
      />
      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/60" />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center text-white">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-white/70">
          Visual Portfolio
        </p>
        <h1 className="text-5xl font-light tracking-tight sm:text-6xl lg:text-7xl">
          Captured Moments
        </h1>
        <p className="mt-4 max-w-md text-base text-white/80">
          A curated collection of photography exploring light, texture, and the beauty of everyday life.
        </p>
        <a
          href="#work"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          View the work
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>

      {/* Photo credit */}
      <p className="absolute bottom-3 right-4 text-xs text-white/40">
        Photo: {PLACEHOLDER_PHOTOS[0]!.photographer} / Pexels
      </p>
    </div>
  );
}

function PlaceholderGallery() {
  return (
    <section id="work" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mb-12 flex items-end justify-between border-b border-gray-100 pb-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">Featured Work</p>
            <h2 className="text-2xl font-light tracking-tight text-gray-900">Selected photography</h2>
          </div>
          <p className="text-sm text-gray-400">Placeholder images · Pexels</p>
        </div>

        {/* Masonry-style grid */}
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {PLACEHOLDER_PHOTOS.slice(1).map((photo) => (
            <div
              key={photo.id}
              className="group mb-4 overflow-hidden rounded-xl break-inside-avoid shadow-sm transition-shadow duration-300 hover:shadow-md"
            >
              <div className="relative overflow-hidden">
                <img
                  src={pexelsUrl(photo.id)}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="p-4">
                    <p className="text-sm font-medium text-white">{photo.alt}</p>
                    <p className="text-xs text-white/60">{photo.photographer} / Pexels</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutStrip() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-500">About</p>
            <h2 className="text-3xl font-light tracking-tight text-gray-900">
              Passionate about the art of the image
            </h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Based everywhere, shooting everything. This portfolio showcases editorial, landscape, and documentary work collected over years of travel and practice.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              All placeholder content — add your own galleries from the dashboard.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-sm">
            <img
              src={pexelsUrl(1040881, 600)}
              alt="Street photography"
              className="w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white py-8">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-400 sm:px-6 lg:px-8">
        <p>Built with Blueflutes · <a href="/login" className="underline underline-offset-2 hover:text-gray-600">Manage portfolio</a></p>
      </div>
    </footer>
  );
}

export default function PortfolioViewer() {
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    listNodes()
      .then((nodes) => {
        if (!cancelled) setState({ status: 'ready', tree: buildNodeTree(nodes) });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : 'Failed to load portfolio.';
        setState({ status: 'error', message });
      });

    return () => { cancelled = true; };
  }, []);

  // While loading — show the full landing page immediately (skeleton feel)
  // Error state — still show the landing page, content just won't update
  // Ready with real content — show real NodeGrid below the hero
  // Only show real content when there are non-empty gallery/folder nodes
  function hasContent(nodes: NodeTreeItem[]): boolean {
    return nodes.some((n) => n.type === 'gallery' || (n.type === 'folder' && hasContent(n.children)));
  }
  const hasRealContent = state.status === 'ready' && hasContent(state.tree);
  const showPlaceholder = !hasRealContent;

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HeroSection />

      {hasRealContent ? (
        <section id="work" className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-12 border-b border-gray-100 pb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">Galleries</p>
              <h2 className="text-2xl font-light tracking-tight text-gray-900">Your work</h2>
            </div>
            <NodeGrid nodes={state.tree} />
          </div>
        </section>
      ) : showPlaceholder ? (
        <PlaceholderGallery />
      ) : null}

      {state.status === 'error' && (
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {state.message}
          </p>
        </div>
      )}

      <AboutStrip />
      <Footer />
    </div>
  );
}
