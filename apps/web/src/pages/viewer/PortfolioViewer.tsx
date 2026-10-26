import { useEffect, useState } from 'react';
import { listNodes } from '../../api/nodes.js';
import { buildNodeTree, type NodeTreeItem } from '../../lib/build-tree.js';

// ─── Photo data ────────────────────────────────────────────────────────────

interface Photo {
  src: string;
  alt: string;
  orientation?: 'portrait' | 'landscape';
}

const CITY_LANDSCAPES: Photo[] = [
  { src: '/portfolio/city-landscapes/k7k_0825_6_7_tonemapped.jpg', alt: 'Singapore Marina Bay at blue hour — LV building and city skyline' },
  { src: '/portfolio/city-landscapes/gbtb-public.jpg',             alt: 'Gardens by the Bay — Supertree Grove at night' },
  { src: '/portfolio/city-landscapes/k7k_2465.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_2739.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_2754.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_3862.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_4196.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_4338.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_5362_pp.jpg',             alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/k7k_8087-wo-cpy.jpg',         alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/_dsc7558.jpg',                alt: 'City landscape' },
  { src: '/portfolio/city-landscapes/fireworksii.2018__280.jpg',   alt: 'Fireworks 2018' },
];

const BW: Photo[] = [
  { src: '/portfolio/bw/catrip.oct_161024_21.jpg', alt: 'San Francisco tram — black and white street' },
  { src: '/portfolio/bw/catrip.oct_161024_40.jpg', alt: 'California trip — black and white' },
  { src: '/portfolio/bw/catrip.oct_161024_41.jpg', alt: 'California trip — black and white' },
  { src: '/portfolio/bw/catrip.oct_161024_47.jpg', alt: 'California trip — black and white' },
  { src: '/portfolio/bw/catrip.oct_161024_61.jpg', alt: 'California trip — black and white' },
  { src: '/portfolio/bw/catrip.oct_161024_62.jpg', alt: 'California trip — black and white' },
  { src: '/portfolio/bw/img_2011.jpg',              alt: 'Black and white' },
  { src: '/portfolio/bw/img_2012.jpg',              alt: 'Black and white' },
];

const PORTRAITS: Photo[] = [
  { src: '/portfolio/portraits/k7k_5584.jpg',                alt: 'Child at the beach — candid portrait', orientation: 'portrait' },
  { src: '/portfolio/portraits/deepavali-05874-04112021.jpg', alt: 'Deepavali portrait', orientation: 'portrait' },
  { src: '/portfolio/portraits/deepavali-05876-04112021.jpg', alt: 'Deepavali portrait', orientation: 'portrait' },
];

const FAMILY: Photo[] = [
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-017.jpg', alt: 'Family portrait session' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-050.jpg', alt: 'Family portrait session' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-066.jpg', alt: 'Family portrait session' },
  { src: '/portfolio/family/maheshmansafamilyshoot-24062023-143.jpg', alt: 'Family portrait session' },
  { src: '/portfolio/family/sravanthi13oct_photoshoot-05030.jpg',     alt: 'Photoshoot' },
  { src: '/portfolio/family/sravanthi13oct_photoshoot-05040.jpg',     alt: 'Photoshoot' },
  { src: '/portfolio/family/vibhu-00851.jpg',                         alt: 'Portrait session' },
  { src: '/portfolio/family/vibhu-00856.jpg',                         alt: 'Portrait session' },
];

// ─── Lightbox ──────────────────────────────────────────────────────────────

interface LightboxState {
  photos: Photo[];
  index: number;
}

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: Photo[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const photo = photos[index]!;
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo lightbox"
    >
      <img
        src={photo.src}
        alt={photo.alt}
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />

      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition-colors hover:text-white"
        aria-label="Close lightbox"
      >
        <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {hasPrev && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 transition-colors hover:text-white"
          aria-label="Previous photo"
        >
          <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/60 transition-colors hover:text-white"
          aria-label="Next photo"
        >
          <svg className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {photos.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs text-white/40">
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
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-[#f4f3f0]/90 backdrop-blur-sm border-b border-[#e0ded8]' : ''
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <span className="font-sans text-sm font-medium tracking-wide text-gray-900">
          Krishna Nellutla
        </span>
        <div className="flex items-center gap-8">
          <a
            href="#work"
            className="font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-900"
          >
            Work
          </a>
          <a
            href="#about"
            className="font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-900"
          >
            About
          </a>
          <a
            href="mailto:krishna.nellutla@gmail.com"
            className="font-mono text-xs uppercase tracking-widest text-gray-500 transition-colors hover:text-gray-900"
          >
            Contact
          </a>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="relative h-screen min-h-[600px] w-full overflow-hidden">
      <img
        src={CITY_LANDSCAPES[0]!.src}
        alt={CITY_LANDSCAPES[0]!.alt}
        className="photo-protected h-full w-full object-cover object-center"
        fetchPriority="high"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* Subtle dark gradient only at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

      {/* Bottom-left editorial text block */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 lg:px-12 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">
            Photography
          </p>
          <h1 className="font-sans text-5xl font-light leading-none tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl">
            Krishna<br />Nellutla
          </h1>
          <p className="mt-4 max-w-xs text-sm text-white/60 leading-relaxed">
            City landscapes · Portraits<br />Black &amp; white
          </p>
          <a
            href="#work"
            className="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/60 transition-colors hover:text-white"
            aria-label="Scroll to work"
          >
            View work
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Intro statement ───────────────────────────────────────────────────────

function IntroSection() {
  return (
    <section className="bg-[#f4f3f0] px-6 py-16 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[1fr_2fr] md:items-start">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500 md:pt-1">
            About the work
          </p>
          <p className="max-w-2xl font-sans text-2xl font-light leading-snug tracking-tight text-gray-900 sm:text-3xl">
            I photograph the spaces between — city light and shadow, candid moments, the quiet geometry of daily life.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Gallery section ───────────────────────────────────────────────────────

function GallerySection({
  index,
  eyebrow,
  title,
  photos,
  onPhotoClick,
}: {
  index: number;
  eyebrow: string;
  title: string;
  photos: Photo[];
  onPhotoClick: (i: number) => void;
}) {
  const num = String(index).padStart(2, '0');

  return (
    <section className="bg-[#f4f3f0] px-6 pb-16 lg:px-12 lg:pb-20">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-6 flex items-end justify-between border-t border-[#d6d4ce] pt-6">
          <div className="flex items-baseline gap-4">
            <span className="font-mono text-[10px] text-gray-400">{num}</span>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500">{eyebrow}</p>
              <h2 className="font-sans text-xl font-light tracking-tight text-gray-900 sm:text-2xl">
                {title}
              </h2>
            </div>
          </div>
          <span className="font-mono text-[10px] text-gray-400">{photos.length} photos</span>
        </div>

        {/* Photo grid */}
        <div className="flex flex-wrap" style={{ gap: '3px' }}>
          {photos.map((photo, i) => (
            <button
              key={i}
              type="button"
              className="group overflow-hidden cursor-zoom-in"
              style={{
                height: '220px',
                flexGrow: 1,
                flexBasis: photo.orientation === 'portrait' ? '145px' : '270px',
              }}
              onClick={() => onPhotoClick(i)}
              aria-label={`View ${photo.alt}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="photo-protected w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] group-hover:brightness-95"
              />
            </button>
          ))}
          <div style={{ flexGrow: 10, flexBasis: '270px', height: '220px' }} aria-hidden />
        </div>
      </div>
    </section>
  );
}

// ─── About ─────────────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section className="bg-[#edecea] px-6 py-16 lg:px-12 lg:py-24" id="about">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">

          {/* Photo */}
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
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500">
              About
            </p>
            <h2 className="font-sans text-3xl font-light leading-snug tracking-tight text-gray-900 sm:text-4xl">
              Capturing light,<br />people &amp; cities
            </h2>
            <p className="mt-6 text-sm leading-relaxed text-gray-600">
              I'm Krishna Nellutla — a photographer based in Singapore, drawn to the interplay of
              city light and human moments. From the blue-hour glow of Marina Bay to candid portraits
              and black &amp; white street scenes, I look for stories in the spaces between.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">
              Available for portrait sessions, events, and commissioned work.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Contact CTA ───────────────────────────────────────────────────────────

function ContactSection() {
  return (
    <section className="bg-[#f4f3f0] px-6 py-20 lg:px-12 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="border-t border-[#d6d4ce] pt-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.3em] text-gray-500">
            Get in touch
          </p>
          <a
            href="mailto:krishna.nellutla@gmail.com"
            className="group inline-block font-sans text-3xl font-light tracking-tight text-gray-900 transition-opacity hover:opacity-60 sm:text-4xl lg:text-5xl"
          >
            krishna.nellutla
            <br />
            @gmail.com
            <svg
              className="ml-3 inline-block h-6 w-6 translate-y-[-2px] transition-transform group-hover:translate-x-1"
              fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24" aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-[#d6d4ce] bg-[#f4f3f0] px-6 py-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <p className="font-mono text-[10px] text-gray-400">
          © {new Date().getFullYear()} Krishna Nellutla
        </p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          Singapore
        </p>
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

  const openLightbox = (photos: Photo[], index: number) =>
    setLightbox({ photos, index });
  const closeLightbox = () => setLightbox(null);
  const prevPhoto = () =>
    setLightbox((s) => s && s.index > 0 ? { ...s, index: s.index - 1 } : s);
  const nextPhoto = () =>
    setLightbox((s) => s && s.index < s.photos.length - 1 ? { ...s, index: s.index + 1 } : s);

  return (
    <div className="min-h-screen bg-[#f4f3f0] text-gray-900">
      <Nav />
      <main>
        <HeroSection />
        <IntroSection />

        <div id="work">
          <GallerySection
            index={1}
            eyebrow="City & Landscape"
            title="Singapore & beyond"
            photos={CITY_LANDSCAPES}
            onPhotoClick={(i) => openLightbox(CITY_LANDSCAPES, i)}
          />
          <GallerySection
            index={2}
            eyebrow="Black & White"
            title="California, 2024"
            photos={BW}
            onPhotoClick={(i) => openLightbox(BW, i)}
          />
          <GallerySection
            index={3}
            eyebrow="Portraits"
            title="People"
            photos={PORTRAITS}
            onPhotoClick={(i) => openLightbox(PORTRAITS, i)}
          />
          <GallerySection
            index={4}
            eyebrow="Events & Family"
            title="Moments"
            photos={FAMILY}
            onPhotoClick={(i) => openLightbox(FAMILY, i)}
          />
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
