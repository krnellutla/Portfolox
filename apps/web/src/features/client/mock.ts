import type { Photo } from '../../lib/types.js';

export type PhotoCategory = 'all' | 'favorites' | 'ceremony' | 'reception';

const GRADIENTS = [
  'linear-gradient(145deg,#c4a882,#8a7150)',
  'linear-gradient(145deg,#9aa79b,#5f6f63)',
  'linear-gradient(145deg,#7e8893,#525c68)',
  'linear-gradient(145deg,#bda988,#7a6347)',
  'linear-gradient(145deg,#8aab90,#4d7255)',
  'linear-gradient(145deg,#8f93a3,#5e6374)',
  'linear-gradient(145deg,#a6a49c,#6b6760)',
  'linear-gradient(145deg,#9a96a6,#675f74)',
  'linear-gradient(145deg,#c0b89a,#8a7f62)',
  'linear-gradient(145deg,#94a8a0,#5e706a)',
  'linear-gradient(145deg,#a8b4b0,#68797a)',
  'linear-gradient(145deg,#b4a894,#7a6f60)',
  'linear-gradient(145deg,#7e9393,#5c6868)',
  'linear-gradient(145deg,#9393a6,#5e5e74)',
  'linear-gradient(145deg,#a69393,#745e5e)',
  'linear-gradient(145deg,#93a693,#5e7461)',
];

const CATEGORIES: PhotoCategory[] = ['ceremony', 'ceremony', 'reception', 'ceremony', 'reception', 'ceremony', 'reception', 'reception', 'ceremony', 'reception', 'ceremony', 'reception', 'ceremony', 'reception', 'ceremony', 'reception'];

export const CLIENT_PHOTOS: Array<Photo & { gradient: string; category: PhotoCategory }> = Array.from({ length: 16 }, (_, i) => ({
  id: `cp${i + 1}`,
  code: `DLG-${String(i + 1).padStart(3, '0')}`,
  title: `Frame ${i + 1}`,
  url: '',
  thumbUrl: '',
  width: 1200,
  height: 800,
  exif: { aperture: 'f/2.8', shutter: '1/500', iso: '800', focalLength: '85mm' },
  galleryId: 'client-gallery-1',
  photographerId: 'ph1',
  status: 'published' as const,
  counts: { likes: 0, comments: 0, views: 0 },
  likedByMe: false,
  favoritedByMe: i < 4,
  gradient: GRADIENTS[i],
  category: CATEGORIES[i],
}));

export const CLIENT_GALLERY_META = {
  title: 'Delgado Wedding — Final Selects',
  clientName: 'A. Delgado',
  frameCount: 248,
  expiresAt: '2026-09-21',
  shareToken: 'dlg-2026',
};
