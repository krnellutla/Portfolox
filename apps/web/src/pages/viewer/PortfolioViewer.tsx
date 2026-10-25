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

// ─── Components ────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <div className="relative h-[90vh] min-h-[560px] w-full overflow-hidden">
      <img
        src={CITY_LANDSCAPES[0]!.src}
        alt={CITY_LANDSCAPES[0]!.alt}
        className="photo-protected h-full w-full object-cover object-center"
        fetchPriority="high"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/70" />
      <div className="absolute inset-0 flex flex-col items-center justify-end px-4 pb-20 text-center text-white">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
          Photography
        </p>
        <h1 className="font-sans text-5xl font-light tracking-tight sm:text-6xl lg:text-8xl">
          Krishna Nellutla
        </h1>
        <p className="mt-5 max-w-sm text-base text-white/70">
          City landscapes · Portraits · Black & white
        </p>
        <a
          href="#work"
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
        >
          View work
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function GallerySection({ title, eyebrow, photos }: { title: string; eyebrow: string; photos: Photo[] }) {
  return (
    <section className="pt-10 pb-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 border-b border-gray-200 pb-4">
          <p className="mb-1 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">{eyebrow}</p>
          <h2 className="font-sans text-2xl font-light tracking-tight text-gray-900">{title}</h2>
        </div>
        <div className="flex flex-wrap" style={{ gap: '4px' }}>
          {photos.map((photo, i) => (
            <div
              key={i}
              className="group overflow-hidden rounded-sm"
              style={{
                height: '220px',
                flexGrow: 1,
                flexBasis: photo.orientation === 'portrait' ? '150px' : '280px',
              }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                className="photo-protected w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          ))}
          <div style={{ flexGrow: 10, flexBasis: '280px', height: '220px' }} aria-hidden />
        </div>
      </div>
    </section>
  );
}

function AboutSection() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 py-20" id="about">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-gray-500">About</p>
            <h2 className="font-sans text-3xl font-light tracking-tight text-gray-900">
              Capturing light, people & cities
            </h2>
            <p className="mt-5 text-gray-500 leading-relaxed">
              I'm Krishna Nellutla — a photographer based in Singapore, drawn to the interplay of
              city light and human moments. From the blue-hour glow of Marina Bay to candid portraits
              and black & white street scenes, I look for stories in the spaces between.
            </p>
            <p className="mt-4 text-gray-500 leading-relaxed">
              Available for portrait sessions, events, and commissioned work.
            </p>
            <a
              href="mailto:krishna.nellutla@gmail.com"
              className="mt-6 inline-block text-sm font-medium text-gray-900 underline underline-offset-4 hover:text-gray-600"
            >
              Get in touch →
            </a>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-sm">
            <img
              src="/portfolio/profilepic.jpg"
              alt="Krishna Nellutla"
              className="photo-protected w-full object-cover"
              loading="lazy"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
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
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Krishna Nellutla
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

  useEffect(() => {
    let cancelled = false;
    listNodes()
      .then((nodes) => { if (!cancelled) setRealNodes(buildNodeTree(nodes)); })
      .catch(() => { if (!cancelled) setRealNodes([]); });
    return () => { cancelled = true; };
  }, []);

  // For now always show the personal portfolio. Once real gallery content
  // exists (galleries with media), we'll surface the NodeGrid below the hero.
  const showRealContent = realNodes !== null && hasContent(realNodes);
  void showRealContent; // reserved for phase 2

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <HeroSection />

      <div id="work">
        <GallerySection
          eyebrow="City & Landscape"
          title="Singapore & beyond"
          photos={CITY_LANDSCAPES}
        />
        <div className="border-t border-gray-200" />
        <GallerySection
          eyebrow="Black & White"
          title="California, 2024"
          photos={BW}
        />
        <div className="border-t border-gray-200" />
        <GallerySection
          eyebrow="Portraits"
          title="People"
          photos={PORTRAITS}
        />
        <div className="border-t border-gray-200" />
        <GallerySection
          eyebrow="Events & Family"
          title="Moments"
          photos={FAMILY}
        />
      </div>

      <AboutSection />
      <Footer />
    </div>
  );
}
