import { useEffect, useRef, useState } from 'react';
import { listNodes } from '../../api/nodes.js';
import { buildNodeTree, type NodeTreeItem } from '../../lib/build-tree.js';

// ─── Photo data ────────────────────────────────────────────────────────────

type Category = 'City' | 'B&W' | 'Portrait' | 'Family';

interface Photo {
  src: string;
  alt: string;
  caption: string;
  year: string;
  category: Category;
}

const ALL_PHOTOS: Photo[] = [
  // City & Landscape
  { src: '/portfolio/city-landscapes/k7k_0825_6_7_tonemapped.jpg', alt: 'Singapore Marina Bay at blue hour', caption: 'Marina Bay at blue hour', year: '2021', category: 'City' },
  { src: '/portfolio/city-landscapes/gbtb-public.jpg',             alt: 'Gardens by the Bay — Supertree Grove at night', caption: 'Supertree Grove after dark', year: '2022', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_2465.jpg',                alt: 'City landscape', caption: 'Downtown skyline', year: '2022', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_2739.jpg',                alt: 'City landscape', caption: 'City reflections', year: '2022', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_2754.jpg',                alt: 'City landscape', caption: 'Street level', year: '2022', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_3862.jpg',                alt: 'City landscape', caption: 'Urban geometry', year: '2023', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_4196.jpg',                alt: 'City landscape', caption: 'The bay at dusk', year: '2023', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_4338.jpg',                alt: 'City landscape', caption: 'City from above', year: '2023', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_5362_pp.jpg',             alt: 'City landscape', caption: 'Night light', year: '2023', category: 'City' },
  { src: '/portfolio/city-landscapes/k7k_8087-wo-cpy.jpg',         alt: 'City landscape', caption: 'Golden hour', year: '2023', category: 'City' },
  { src: '/portfolio/city-landscapes/_dsc7558.jpg',                alt: 'City landscape', caption: 'Singapore streets', year: '2020', category: 'City' },
  { src: '/portfolio/city-landscapes/fireworksii.2018__280.jpg',   alt: 'Fireworks 2018', caption: 'Fireworks over the bay', year: '2018', category: 'City' },
  // Black & White
  { src: '/portfolio/bw/catrip.oct_161024_21.jpg', alt: 'San Francisco tram — black and white', caption: 'San Francisco tram', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/catrip.oct_161024_40.jpg', alt: 'California trip — black and white', caption: 'California light', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/catrip.oct_161024_41.jpg', alt: 'California trip — black and white', caption: 'The street, October', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/catrip.oct_161024_47.jpg', alt: 'California trip — black and white', caption: 'Passing through', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/catrip.oct_161024_61.jpg', alt: 'California trip — black and white', caption: 'Afternoon shadows', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/catrip.oct_161024_62.jpg', alt: 'California trip — black and white', caption: 'Movement', year: '2024', category: 'B&W' },
  { src: '/portfolio/bw/img_2011.jpg',              alt: 'Black and white', caption: 'Still life', year: '2023', category: 'B&W' },
  { src: '/portfolio/bw/img_2012.jpg',              alt: 'Black and white', caption: 'Light study', year: '2023', category: 'B&W' },
  // Portraits
  { src: '/portfolio/portraits/k7k_5584.jpg',                alt: 'Child at the beach', caption: "At the water's edge", year: '2023', category: 'Portrait' },
  { src: '/portfolio/portraits/deepavali-05874-04112021.jpg', alt: 'Deepavali portrait', caption: 'Deepavali, 2021', year: '2021', category: 'Portrait' },
  { src: '/portfolio/portraits/deepavali-05876-04112021.jpg', alt: 'Deepavali portrait', caption: 'In the light', year: '2021', category: 'Portrait' },
  // Family
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-017.jpg', alt: 'Family portrait session', caption: 'Mahesh & Mansa', year: '2023', category: 'Family' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-050.jpg', alt: 'Family portrait session', caption: 'Together', year: '2023', category: 'Family' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-066.jpg', alt: 'Family portrait session', caption: 'A quiet moment', year: '2023', category: 'Family' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-143.jpg', alt: 'Family portrait session', caption: 'Joy', year: '2023', category: 'Family' },
  { src: '/portfolio/family/sravanthi13oct_photoshoot-05030.jpg',     alt: 'Photoshoot', caption: 'Sravanthi', year: '2023', category: 'Family' },
  { src: '/portfolio/family/sravanthi13oct_photoshoot-05040.jpg',     alt: 'Photoshoot', caption: 'Afternoon session', year: '2023', category: 'Family' },
  { src: '/portfolio/family/vibhu-00851.jpg',                         alt: 'Portrait session', caption: 'Vibhu', year: '2023', category: 'Family' },
  { src: '/portfolio/family/vibhu-00856.jpg',                         alt: 'Portrait session', caption: 'Natural light', year: '2023', category: 'Family' },
];

// ─── Lightbox ──────────────────────────────────────────────────────────────

interface LightboxState { photos: Photo[]; index: number; }

function Lightbox({ photos, index, onClose, onPrev, onNext }: {
  photos: Photo[]; index: number;
  onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose, onPrev, onNext]);

  const photo = photos[index]!;
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95"
      onClick={onClose}
      role="dialog" aria-modal="true" aria-label="Photo lightbox"
    >
      <img
        src={photo.src} alt={photo.alt}
        className="max-h-[85vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false} onContextMenu={(e) => e.preventDefault()}
      />
      <div className="mt-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
        <span className="font-display text-base italic text-white/70">{photo.caption}</span>
        <span className="font-mono text-[10px] text-white/30">{photo.year}</span>
      </div>

      <button onClick={onClose}
        className="absolute right-5 top-5 p-1 text-white/40 transition-colors hover:text-white"
        aria-label="Close">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-5 top-1/2 -translate-y-1/2 p-2 text-white/40 transition-colors hover:text-white"
          aria-label="Previous">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}
      {index < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-5 top-1/2 -translate-y-1/2 p-2 text-white/40 transition-colors hover:text-white"
          aria-label="Next">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}
      {photos.length > 1 && (
        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[10px] text-white/30">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}

// ─── Nav ───────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
      scrolled ? 'bg-[#0c0b08]/95 backdrop-blur-sm border-b border-white/[0.06]' : ''
    }`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <span className="font-sans text-sm font-light tracking-wide text-white/80">
          Krishna Nellutla
        </span>
        <div className="flex items-center gap-8">
          {(['Work', 'About', 'Contact'] as const).map((label) => (
            <a key={label} href={`#${label.toLowerCase()}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white/80">
              {label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="relative h-screen min-h-[640px] w-full overflow-hidden bg-[#0c0b08]">
      <img
        src={ALL_PHOTOS[0]!.src}
        alt={ALL_PHOTOS[0]!.alt}
        className="photo-protected absolute inset-0 h-full w-full object-cover object-center opacity-60"
        fetchPriority="high"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Deep vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0c0b08] via-[#0c0b08]/30 to-[#0c0b08]/50" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0b08]/40 via-transparent to-[#0c0b08]/20" />

      {/* Editorial text — bottom left */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-14 lg:px-10 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-white/30">
            Photography · Singapore
          </p>
          <h1
            className="font-display font-light italic leading-none tracking-tight text-white"
            style={{ fontSize: 'clamp(52px, 8vw, 108px)', letterSpacing: '-0.02em' }}
          >
            Krishna<br />Nellutla
          </h1>
          <div className="mt-8 flex items-center gap-6">
            <a href="#work"
              className="group flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/40 transition-colors hover:text-white/70">
              View portfolio
              <svg className="h-3 w-3 transition-transform group-hover:translate-y-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Filter bar ────────────────────────────────────────────────────────────

type Filter = 'All' | Category;
const FILTERS: Filter[] = ['All', 'City', 'B&W', 'Portrait', 'Family'];

function FilterBar({ active, onChange, counts }: {
  active: Filter;
  onChange: (f: Filter) => void;
  counts: Record<Filter, number>;
}) {
  return (
    <div className="sticky top-[61px] z-30 bg-[#0c0b08]/95 backdrop-blur-sm border-b border-white/[0.06]">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex items-center gap-1 py-3 overflow-x-auto scrollbar-none">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange(f)}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-all ${
                active === f
                  ? 'bg-white text-[#0c0b08]'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]'
              }`}
            >
              {f}
              <span className={`text-[9px] ${active === f ? 'text-[#0c0b08]/60' : 'text-white/20'}`}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Photo tile ────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Category, string> = {
  City:     'bg-blue-950/80 text-blue-200',
  'B&W':    'bg-zinc-900/80 text-zinc-300',
  Portrait: 'bg-amber-950/80 text-amber-200',
  Family:   'bg-emerald-950/80 text-emerald-200',
};

function PhotoTile({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  return (
    <div
      className="group relative cursor-zoom-in"
      style={{ breakInside: 'avoid', marginBottom: '6px', display: 'block' }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      aria-label={`View ${photo.caption}`}
    >
      {/* Image */}
      <div className="overflow-hidden">
        <img
          src={photo.src}
          alt={photo.alt}
          loading="lazy"
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="photo-protected w-full h-auto block transition-transform duration-700 group-hover:scale-[1.02]"
        />
        {/* Hover veil */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
      </div>

      {/* Category tag — top left on image */}
      <div className={`absolute top-2.5 left-2.5 rounded-full px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.16em] backdrop-blur-sm ${CATEGORY_COLORS[photo.category]}`}>
        {photo.category}
      </div>

      {/* Caption + year below image */}
      <div className="flex items-baseline justify-between pt-2 pb-1 px-0.5">
        <span className="font-display italic text-sm font-light text-white/60 leading-snug">
          {photo.caption}
        </span>
        <span className="ml-3 flex-shrink-0 font-mono text-[9px] text-white/25">
          {photo.year}
        </span>
      </div>
    </div>
  );
}

// ─── Masonry grid ──────────────────────────────────────────────────────────

function MasonryGrid({ photos, onPhotoClick }: {
  photos: Photo[];
  onPhotoClick: (i: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (photos.length === 0) {
    return (
      <div className="py-32 text-center">
        <p className="font-display italic text-2xl text-white/20">No photos in this category</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ columns: '3 260px', columnGap: '6px' }}
      className="px-6 pb-20 pt-8 lg:px-10 mx-auto max-w-7xl"
    >
      {photos.map((photo, i) => (
        <PhotoTile key={`${photo.src}-${i}`} photo={photo} onOpen={() => onPhotoClick(i)} />
      ))}
    </div>
  );
}

// ─── About ─────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="border-t border-white/[0.06] bg-[#111009] px-6 py-20 lg:px-10 lg:py-28" id="about">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-[1fr_1.2fr] md:items-center">

          {/* Profile photo */}
          <div className="overflow-hidden">
            <img
              src="/portfolio/profilepic.jpg"
              alt="Krishna Nellutla"
              className="photo-protected w-full object-cover"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          </div>

          {/* Text */}
          <div>
            <p className="mb-5 font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
              About
            </p>
            <h2
              className="font-display font-light italic text-white leading-tight"
              style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: '-0.01em' }}
            >
              Capturing light,<br />people &amp; cities
            </h2>
            <p className="mt-8 text-sm leading-relaxed text-white/45">
              I'm Krishna Nellutla — a photographer based in Singapore, drawn to the interplay of
              city light and human moments. From the blue-hour glow of Marina Bay to candid portraits
              and black &amp; white street scenes, I look for stories in the spaces between.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/45">
              Available for portrait sessions, events, and commissioned work.
            </p>

            {/* Stats row */}
            <div className="mt-10 flex gap-10 border-t border-white/[0.08] pt-8">
              {[
                { n: '30+', label: 'photos' },
                { n: '6+', label: 'years' },
                { n: 'SG', label: 'based' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <p className="font-display text-2xl font-light italic text-white/80">{n}</p>
                  <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">{label}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Contact ───────────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section className="bg-[#0c0b08] px-6 py-20 lg:px-10 lg:py-28" id="contact">
      <div className="mx-auto max-w-7xl border-t border-white/[0.06] pt-14">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
          Get in touch
        </p>
        <a
          href="mailto:contactme@knellutla.com"
          className="group inline-flex items-start gap-4 text-white/70 transition-opacity hover:opacity-60"
        >
          <span
            className="font-display font-light italic leading-tight"
            style={{ fontSize: 'clamp(26px, 4vw, 52px)', letterSpacing: '-0.01em' }}
          >
            contactme<br />@knellutla.com
          </span>
          <svg className="mt-2 h-5 w-5 flex-shrink-0 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
          </svg>
        </a>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0c0b08] px-6 py-5 lg:px-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <p className="font-mono text-[9px] text-white/20">© {new Date().getFullYear()} Krishna Nellutla</p>
        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">Singapore</p>
      </div>
    </footer>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────

function hasContent(nodes: NodeTreeItem[]): boolean {
  return nodes.some((n) => n.type === 'gallery' || (n.type === 'folder' && hasContent(n.children)));
}

export default function PortfolioViewer() {
  const [realNodes, setRealNodes] = useState<NodeTreeItem[] | null>(null);
  const [filter, setFilter] = useState<Filter>('All');
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    let cancelled = false;
    listNodes()
      .then((nodes) => { if (!cancelled) setRealNodes(buildNodeTree(nodes)); })
      .catch(() => { if (!cancelled) setRealNodes([]); });
    return () => { cancelled = true; };
  }, []);

  const showRealContent = realNodes !== null && hasContent(realNodes);
  void showRealContent;

  // Filtered view for the masonry
  const filtered = filter === 'All' ? ALL_PHOTOS : ALL_PHOTOS.filter((p) => p.category === filter);

  // Counts for filter pills
  const counts: Record<Filter, number> = {
    All: ALL_PHOTOS.length,
    City: ALL_PHOTOS.filter((p) => p.category === 'City').length,
    'B&W': ALL_PHOTOS.filter((p) => p.category === 'B&W').length,
    Portrait: ALL_PHOTOS.filter((p) => p.category === 'Portrait').length,
    Family: ALL_PHOTOS.filter((p) => p.category === 'Family').length,
  };

  const openLightbox = (index: number) => setLightbox({ photos: filtered, index });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () => setLightbox((s) => s && s.index > 0 ? { ...s, index: s.index - 1 } : s);
  const nextPhoto = () => setLightbox((s) => s && s.index < s.photos.length - 1 ? { ...s, index: s.index + 1 } : s);

  return (
    <div className="min-h-screen bg-[#0c0b08] text-white">
      <Nav />

      <main>
        <HeroSection />

        <div id="work">
          <FilterBar active={filter} onChange={setFilter} counts={counts} />
          <MasonryGrid photos={filtered} onPhotoClick={openLightbox} />
        </div>

        <AboutSection />
        <ContactSection />
      </main>

      <Footer />

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  );
}
