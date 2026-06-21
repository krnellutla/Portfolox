import type { Comment, Photo, PrintOption } from '../../lib/types.js';

export const LIGHTBOX_PHOTOS: Array<Photo & { gradient: string }> = [
  {
    id: 'lb1', code: 'PFX-4200', title: 'First Light',
    url: '', thumbUrl: '', width: 1200, height: 800,
    exif: { aperture: 'f/2.8', shutter: '1/500', iso: '200', focalLength: '35mm', camera: 'Leica M11', lens: '35mm f/2' },
    galleryId: 'g1', photographerId: 'ph1',
    edition: { number: 3, of: 25 },
    releasedAt: '2026-01-15',
    status: 'published', priceFrom: 45,
    counts: { likes: 84, comments: 12, views: 4200 },
    likedByMe: false,
    gradient: 'linear-gradient(145deg,#7e8893,#525c68)',
  },
  {
    id: 'lb2', code: 'PFX-4201', title: 'Tideline',
    url: '', thumbUrl: '', width: 1200, height: 800,
    exif: { aperture: 'f/5.6', shutter: '1/60', iso: '400', focalLength: '21mm', camera: 'Sony A7R V', lens: '21mm f/3.5' },
    galleryId: 'g1', photographerId: 'ph1',
    edition: { number: 1, of: 10 },
    releasedAt: '2026-02-08',
    status: 'published', priceFrom: 210,
    counts: { likes: 56, comments: 4, views: 2900 },
    likedByMe: true,
    gradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
  },
  {
    id: 'lb3', code: 'PFX-4202', title: 'Northbound',
    url: '', thumbUrl: '', width: 1200, height: 800,
    exif: { aperture: 'f/8', shutter: '1/250', iso: '100', focalLength: '50mm', camera: 'Leica M11', lens: '50mm f/2' },
    galleryId: 'g1', photographerId: 'ph1',
    status: 'published', priceFrom: 45,
    counts: { likes: 31, comments: 7, views: 1800 },
    likedByMe: false,
    gradient: 'linear-gradient(145deg,#c4a882,#8a7150)',
  },
];

export const PRINT_OPTIONS: PrintOption[] = [
  { id: 'po1', size: '8×10"',  kind: 'Lustre',           basePrice: 18  },
  { id: 'po2', size: '16×20"', kind: 'Archival matte',   basePrice: 45  },
  { id: 'po3', size: '18×24"', kind: 'Framed archival',  basePrice: 210, framed: true },
  { id: 'po4', size: '24×36"', kind: 'Giclée fine art',  basePrice: 120 },
];

export const LIGHTBOX_COMMENTS: Comment[] = [
  {
    id: 'c1', parentType: 'photo', parentId: 'lb1',
    author: { id: 'ph2', displayName: 'Ridge Studio', avatarUrl: null },
    body: 'That tonal range is stunning — what did you use for post?',
    createdAt: '2026-06-20T12:00:00Z',
    likes: 4,
  },
  {
    id: 'c2', parentType: 'photo', parentId: 'lb1',
    author: { id: 'ph3', displayName: 'K. Møller', avatarUrl: null },
    body: 'I keep coming back to this one. The compression at the horizon line is perfect.',
    createdAt: '2026-06-20T15:00:00Z',
    likes: 7,
  },
];

export const AUTHOR_GRADIENTS: Record<string, string> = {
  ph1: 'linear-gradient(145deg,#bda988,#8a7150)',
  ph2: 'linear-gradient(145deg,#7e8893,#525c68)',
  ph3: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
};
