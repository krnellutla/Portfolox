import type { Photo, SearchFilters } from '../../lib/types.js';

export const DEFAULT_FILTERS: SearchFilters = {
  q: '',
  styles: [],
  colors: [],
  locations: [],
  sort: 'popular',
};

export const STYLE_OPTIONS = [
  'Landscape', 'Portrait', 'Street', 'Wedding', 'Fine Art', 'Documentary', 'Architecture', 'Wildlife',
] as const;

export const COLOR_OPTIONS = [
  { label: 'Warm',    hex: '#c4a882' },
  { label: 'Cool',    hex: '#8aa6c4' },
  { label: 'Green',   hex: '#8aab90' },
  { label: 'Neutral', hex: '#a8a49c' },
  { label: 'Mono',    hex: '#585550' },
  { label: 'Dusk',    hex: '#9c8aae' },
] as const;

export const LOCATION_OPTIONS = [
  'Iceland', 'Japan', 'Patagonia', 'Morocco', 'Norway', 'New York', 'Scotland',
] as const;

const PHOTO_GRADIENTS = [
  'linear-gradient(145deg,#7e8893,#525c68)',
  'linear-gradient(145deg,#9aa79b,#5f6f63)',
  'linear-gradient(145deg,#c4a882,#8a7150)',
  'linear-gradient(145deg,#8aab90,#4d7255)',
  'linear-gradient(145deg,#bda988,#7a6347)',
  'linear-gradient(145deg,#8f93a3,#5e6374)',
  'linear-gradient(145deg,#a6a49c,#6b6760)',
  'linear-gradient(145deg,#9a96a6,#675f74)',
  'linear-gradient(145deg,#c0b89a,#8a7f62)',
  'linear-gradient(145deg,#94a8a0,#5e706a)',
  'linear-gradient(145deg,#a8b4b0,#68797a)',
  'linear-gradient(145deg,#b4a894,#7a6f60)',
];

const TITLES = [
  'First Light', 'Tideline', 'Northbound', 'Quiet Hours', 'Drift',
  'Exposure', 'Silver Hour', 'Deep Field', 'Still Life #4', 'Passage',
  'Remnants', 'Threshold',
];

export const MOCK_PHOTOS: Photo[] = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i + 1}`,
  code: `PFX-${String(4200 + i).padStart(4, '0')}`,
  title: TITLES[i],
  url: '',
  thumbUrl: '',
  width: 1200,
  height: 1200,
  exif: { aperture: 'f/2.8', shutter: '1/250', iso: '400', focalLength: '50mm' },
  galleryId: `g${(i % 3) + 1}`,
  photographerId: `ph${(i % 4) + 1}`,
  status: 'published' as const,
  priceFrom: [18, 45, 80, 120, 210][i % 5],
  counts: { likes: 40 + i * 11, comments: 2 + i, views: 200 + i * 90 },
  likedByMe: i % 5 === 0,
  favoritedByMe: false,
  placeholderGradient: PHOTO_GRADIENTS[i],
})) as Array<Photo & { placeholderGradient: string }>;

export const SORT_OPTIONS = [
  { value: 'popular',    label: 'Most popular' },
  { value: 'recent',     label: 'Most recent' },
  { value: 'price-asc',  label: 'Price: low–high' },
  { value: 'price-desc', label: 'Price: high–low' },
] as const;
