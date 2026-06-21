import type { Collection, Photo } from '../../lib/types.js';

export const COLLECTIONS: (Collection & { coverGradients: string[] })[] = [
  {
    id: 'col-1',
    ownerId: 'me',
    name: 'Wall-worthy',
    note: "Pieces I'd hang at home",
    count: 24,
    coverPhotoIds: ['p1', 'p2', 'p3', 'p4'],
    coverGradients: [
      'linear-gradient(145deg,#9aa79b,#5f6f63)',
      'linear-gradient(145deg,#7e8893,#525c68)',
      'linear-gradient(145deg,#c0ab9a,#8f7967)',
      'linear-gradient(145deg,#869a93,#566b63)',
    ],
    photoIds: [],
  },
  {
    id: 'col-2',
    ownerId: 'me',
    name: 'Cold palettes',
    note: 'Blues, fog, and frost',
    count: 18,
    coverPhotoIds: ['p5', 'p6', 'p7', 'p8'],
    coverGradients: [
      'linear-gradient(145deg,#8f93a3,#5e6374)',
      'linear-gradient(145deg,#7e9396,#52696c)',
      'linear-gradient(145deg,#7e8893,#525c68)',
      'linear-gradient(145deg,#9a96a6,#675f74)',
    ],
    photoIds: [],
  },
  {
    id: 'col-3',
    ownerId: 'me',
    name: 'Golden hour',
    note: 'Warm light only',
    count: 31,
    coverPhotoIds: ['p9', 'p10', 'p11', 'p12'],
    coverGradients: [
      'linear-gradient(145deg,#bda988,#8a7150)',
      'linear-gradient(145deg,#c0ab9a,#8f7967)',
      'linear-gradient(145deg,#b3a886,#857a5b)',
      'linear-gradient(145deg,#b09092,#7a5e60)',
    ],
    photoIds: [],
  },
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

export const LIKED_PHOTOS: (Photo & { gradient: string })[] = GRADIENTS.map((g, i) => ({
  id: `fav-${i}`,
  code: `PFX·${4200 + i}`,
  title: TITLES[i] ?? `Photo ${i + 1}`,
  url: '',
  thumbUrl: '',
  width: 1200,
  height: 1200,
  exif: { aperture: 'ƒ2.8', shutter: '1/250', iso: '400', focalLength: '50mm' },
  galleryId: 'g1',
  photographerId: 'p1',
  status: 'published',
  counts: { likes: 0, comments: 0, views: 0 },
  favoritedByMe: true,
  gradient: g,
}));
