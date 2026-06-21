import type { Photo, Specialty } from '../../lib/types.js';

export interface FeaturedPhotographer {
  name: string;
  handle: string;
  loc: string;
  spec: Specialty;
  frames: number;
  coverGradient: string;
  avatarGradient: string;
}

export const CATEGORIES: string[] = [
  'Landscape', 'Portrait', 'Street', 'Wedding',
  'Fine Art', 'Documentary', 'Architecture', 'Wildlife', 'Black & White',
];

export const FEATURED: FeaturedPhotographer[] = [
  { name: 'Mira Calder', handle: '@miracalder', loc: 'Reykjavík', spec: 'Landscape', frames: 248, coverGradient: 'linear-gradient(145deg,#7e8893,#525c68)', avatarGradient: 'linear-gradient(145deg,#bda988,#8a7150)' },
  { name: 'Søren Lafield', handle: '@sorenl', loc: 'Berlin', spec: 'Street', frames: 512, coverGradient: 'linear-gradient(145deg,#8f93a3,#5e6374)', avatarGradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)' },
  { name: 'Ana Okonkwo', handle: '@anaok', loc: 'Lagos', spec: 'Portrait', frames: 331, coverGradient: 'linear-gradient(145deg,#b09092,#7a5e60)', avatarGradient: 'linear-gradient(145deg,#c0ab9a,#8f7967)' },
  { name: 'Theo Vance', handle: '@theovance', loc: 'Portland', spec: 'Documentary', frames: 189, coverGradient: 'linear-gradient(145deg,#92997f,#646a52)', avatarGradient: 'linear-gradient(145deg,#7e9396,#52696c)' },
  { name: 'Yuki Tanaka', handle: '@yukit', loc: 'Kyoto', spec: 'Fine Art', frames: 407, coverGradient: 'linear-gradient(145deg,#9a96a6,#675f74)', avatarGradient: 'linear-gradient(145deg,#b3a886,#857a5b)' },
  { name: 'Lena Brandt', handle: '@lenabrandt', loc: 'Oslo', spec: 'Wedding', frames: 276, coverGradient: 'linear-gradient(145deg,#bb9d9a,#8a6d6b)', avatarGradient: 'linear-gradient(145deg,#869a93,#566b63)' },
];

const GRADIENTS = [
  'linear-gradient(145deg,#9aa79b,#5f6f63)',
  'linear-gradient(145deg,#bda988,#8a7150)',
  'linear-gradient(145deg,#7e8893,#525c68)',
  'linear-gradient(145deg,#b09092,#7a5e60)',
  'linear-gradient(145deg,#9a96a6,#675f74)',
  'linear-gradient(145deg,#b3a886,#857a5b)',
  'linear-gradient(145deg,#7e9396,#52696c)',
  'linear-gradient(145deg,#bb9d9a,#8a6d6b)',
  'linear-gradient(145deg,#92997f,#646a52)',
  'linear-gradient(145deg,#8f93a3,#5e6374)',
  'linear-gradient(145deg,#c0ab9a,#8f7967)',
  'linear-gradient(145deg,#869a93,#566b63)',
];

const TITLES = [
  'Northbound', 'Salt & Static', 'Quiet Hours', 'Field Notes',
  'After Rain', 'Tideline', 'Concrete Bloom', 'Long Exposure',
  'First Light', 'Cold Open', 'Paper Moon', 'Driftwood',
];

export const FRESH_PHOTOS: (Photo & { gradient: string })[] = GRADIENTS.map((g, i) => ({
  id: `fresh-${i}`,
  code: `PFX·${4300 + i}`,
  title: TITLES[i] ?? `Frame ${i + 1}`,
  url: '',
  thumbUrl: '',
  width: 1200,
  height: 1200,
  exif: { aperture: 'ƒ2.8', shutter: '1/250', iso: '400', focalLength: '50mm' },
  galleryId: 'g1',
  photographerId: 'various',
  status: 'published',
  counts: { likes: 0, comments: 0, views: 0 },
  gradient: g,
}));
