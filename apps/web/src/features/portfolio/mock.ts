import type { Photo, Photographer } from '../../lib/types.js';

export const PHOTOGRAPHER: Photographer = {
  id: 'mira-calder',
  handle: 'miracalder',
  displayName: 'Mira Calder',
  avatarUrl: null,
  coverUrl: null,
  location: 'Reykjavík, Iceland',
  specialty: 'Landscape',
  bio: 'Chasing long light along the Ring Road and the fjords of the north. Large-format landscapes, limited print editions, and the occasional 4am alarm. Prints made affordable so the work can live on real walls.',
  plan: 'studio',
  stats: { frames: 248, followers: 12400, printsSold: 1204 },
  isFollowedByMe: false,
};

export const GALLERIES = [
  { id: 'all', name: 'All work' },
  { id: 'g1', name: 'Iceland — Ring Road' },
  { id: 'g2', name: 'Coastal Long Exposure' },
  { id: 'g3', name: 'Northern Light' },
  { id: 'g4', name: 'Studio' },
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
  'linear-gradient(145deg,#9aa79b,#5f6f63)',
  'linear-gradient(145deg,#bda988,#8a7150)',
  'linear-gradient(145deg,#8f93a3,#5e6374)',
];

const TITLES = [
  'Northbound', 'Salt & Static', 'Quiet Hours', 'Field Notes', 'After Rain',
  'Tideline', 'Concrete Bloom', 'Long Exposure', 'First Light', 'Cold Open',
  'Paper Moon', 'Driftwood', 'Low Tide', 'Ember', 'Half Light',
];

export const PHOTOS: (Photo & { gradient: string })[] = GRADIENTS.map((g, i) => ({
  id: `photo-${i}`,
  code: `PFX·${4200 + i}`,
  title: TITLES[i] ?? `Frame ${i + 1}`,
  url: '',
  thumbUrl: '',
  width: 1200,
  height: 1200,
  exif: {
    aperture: ['ƒ2.8', 'ƒ4', 'ƒ5.6'][i % 3],
    shutter: ['1/250', '1/500', '1/125'][i % 3],
    iso: ['100', '200', '400'][i % 3],
    focalLength: ['35mm', '50mm', '85mm'][i % 3],
    camera: 'Leica Q3',
  },
  galleryId: 'g1',
  photographerId: 'mira-calder',
  status: 'published',
  priceFrom: 1800,
  counts: { likes: 120 + i * 7, comments: 8 + i, views: 800 + i * 50 },
  gradient: g,
}));
