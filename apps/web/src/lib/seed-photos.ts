// Pexels CDN URL — photos are free to use under the Pexels License.
// Format: https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg
const px = (id: string, w = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;

export interface SeedPhoto {
  id: string;
  subject: string;
  category: 'landscape' | 'portrait' | 'street' | 'wedding' | 'fine-art' | 'documentary';
  ratio: '1:1' | '3:2' | '4:3' | '16:9';
  url: string;
  thumbUrl: string;
}

export const SEED_PHOTOS: SeedPhoto[] = [
  // ── Landscapes ───────────────────────────────────────────────────────────
  { id: '1070378',  subject: 'Misty Mountain Valley',   category: 'landscape', ratio: '3:2', url: px('1070378', 1600),  thumbUrl: px('1070378', 400)  },
  { id: '1769106',  subject: 'Golden Coastline',        category: 'landscape', ratio: '3:2', url: px('1769106', 1600),  thumbUrl: px('1769106', 400)  },
  { id: '1101201',  subject: 'Autumn Forest Path',      category: 'landscape', ratio: '3:2', url: px('1101201', 1600),  thumbUrl: px('1101201', 400)  },
  { id: '6640401',  subject: 'Snow-capped Peaks',       category: 'landscape', ratio: '3:2', url: px('6640401', 1600),  thumbUrl: px('6640401', 400)  },
  { id: '13344256', subject: 'Lavender Field Sunset',   category: 'landscape', ratio: '3:2', url: px('13344256', 1600), thumbUrl: px('13344256', 400) },
  { id: '20208915', subject: 'Desert Dunes at Dusk',    category: 'landscape', ratio: '16:9', url: px('20208915', 1600), thumbUrl: px('20208915', 400) },
  { id: '26311729', subject: 'Northern Lake Reflection',category: 'landscape', ratio: '3:2', url: px('26311729', 1600), thumbUrl: px('26311729', 400) },
  { id: '27289392', subject: 'Rolling Green Hills',     category: 'landscape', ratio: '3:2', url: px('27289392', 1600), thumbUrl: px('27289392', 400) },
  { id: '29202983', subject: 'Stormy Ocean Cliffs',     category: 'landscape', ratio: '3:2', url: px('29202983', 1600), thumbUrl: px('29202983', 400) },
  { id: '38271767', subject: 'Pine Forest Fog',         category: 'landscape', ratio: '3:2', url: px('38271767', 1600), thumbUrl: px('38271767', 400) },
  { id: '10625959', subject: 'Glacial River Delta',     category: 'landscape', ratio: '16:9', url: px('10625959', 1600), thumbUrl: px('10625959', 400) },
  { id: '37152301', subject: 'Volcanic Crater Lake',    category: 'landscape', ratio: '3:2', url: px('37152301', 1600), thumbUrl: px('37152301', 400) },

  // ── Portraits ────────────────────────────────────────────────────────────
  { id: '3979997',  subject: 'Natural Light Portrait',  category: 'portrait',  ratio: '3:2', url: px('3979997', 1600),  thumbUrl: px('3979997', 400)  },
  { id: '8100060',  subject: 'Golden Hour Glow',        category: 'portrait',  ratio: '3:2', url: px('8100060', 1600),  thumbUrl: px('8100060', 400)  },
  { id: '10577611', subject: 'Studio Black & White',    category: 'portrait',  ratio: '4:3', url: px('10577611', 1600), thumbUrl: px('10577611', 400) },
  { id: '11844304', subject: 'Window Light Silhouette', category: 'portrait',  ratio: '3:2', url: px('11844304', 1600), thumbUrl: px('11844304', 400) },
  { id: '13327309', subject: 'Environmental Portrait',  category: 'portrait',  ratio: '3:2', url: px('13327309', 1600), thumbUrl: px('13327309', 400) },
  { id: '15227500', subject: 'Candid Laugh',            category: 'portrait',  ratio: '3:2', url: px('15227500', 1600), thumbUrl: px('15227500', 400) },
  { id: '15649980', subject: 'Moody Studio',            category: 'portrait',  ratio: '3:2', url: px('15649980', 1600), thumbUrl: px('15649980', 400) },
  { id: '18051189', subject: 'Outdoor Close-up',        category: 'portrait',  ratio: '3:2', url: px('18051189', 1600), thumbUrl: px('18051189', 400) },
  { id: '34867545', subject: 'Soft Backlight',          category: 'portrait',  ratio: '3:2', url: px('34867545', 1600), thumbUrl: px('34867545', 400) },
  { id: '36697251', subject: 'Character Study',         category: 'portrait',  ratio: '4:3', url: px('36697251', 1600), thumbUrl: px('36697251', 400) },

  // ── Street ───────────────────────────────────────────────────────────────
  { id: '34965583', subject: 'Rainy Night Reflections', category: 'street',    ratio: '3:2', url: px('34965583', 1600), thumbUrl: px('34965583', 400) },
  { id: '33076681', subject: 'Neon Alley',              category: 'street',    ratio: '3:2', url: px('33076681', 1600), thumbUrl: px('33076681', 400) },
  { id: '27665348', subject: 'Commuter Blur',           category: 'street',    ratio: '3:2', url: px('27665348', 1600), thumbUrl: px('27665348', 400) },
  { id: '33154292', subject: 'Market Stall Light',      category: 'street',    ratio: '3:2', url: px('33154292', 1600), thumbUrl: px('33154292', 400) },
  { id: '40016974', subject: 'Morning Mist Alley',      category: 'street',    ratio: '3:2', url: px('40016974', 1600), thumbUrl: px('40016974', 400) },

  // ── Wedding ──────────────────────────────────────────────────────────────
  { id: '3990404',  subject: 'First Dance',             category: 'wedding',   ratio: '3:2', url: px('3990404', 1600),  thumbUrl: px('3990404', 400)  },
  { id: '6679832',  subject: 'Vow Exchange',            category: 'wedding',   ratio: '3:2', url: px('6679832', 1600),  thumbUrl: px('6679832', 400)  },
  { id: '11277389', subject: 'Bouquet Detail',          category: 'wedding',   ratio: '3:2', url: px('11277389', 1600), thumbUrl: px('11277389', 400) },
  { id: '15291907', subject: 'Garden Ceremony',         category: 'wedding',   ratio: '16:9', url: px('15291907', 1600), thumbUrl: px('15291907', 400) },
  { id: '17057198', subject: 'Getting Ready',           category: 'wedding',   ratio: '3:2', url: px('17057198', 1600), thumbUrl: px('17057198', 400) },
  { id: '17794569', subject: 'Reception Joy',           category: 'wedding',   ratio: '3:2', url: px('17794569', 1600), thumbUrl: px('17794569', 400) },
  { id: '37828118', subject: 'Golden Hour Kiss',        category: 'wedding',   ratio: '3:2', url: px('37828118', 1600), thumbUrl: px('37828118', 400) },
  { id: '38845444', subject: 'Details & Rings',         category: 'wedding',   ratio: '1:1', url: px('38845444', 1600), thumbUrl: px('38845444', 400) },

  // ── Fine Art / Documentary ────────────────────────────────────────────────
  { id: '20943861', subject: 'Abstract Geometry',       category: 'fine-art',  ratio: '1:1', url: px('20943861', 1600), thumbUrl: px('20943861', 400) },
  { id: '27583914', subject: 'Monochrome Study',        category: 'fine-art',  ratio: '3:2', url: px('27583914', 1600), thumbUrl: px('27583914', 400) },
  { id: '39719487', subject: 'Light & Shadow',          category: 'fine-art',  ratio: '3:2', url: px('39719487', 1600), thumbUrl: px('39719487', 400) },
  { id: '30757600', subject: 'Texture Macro',           category: 'fine-art',  ratio: '1:1', url: px('30757600', 1600), thumbUrl: px('30757600', 400) },
  { id: '36720270', subject: 'Documentary Moment',      category: 'documentary', ratio: '3:2', url: px('36720270', 1600), thumbUrl: px('36720270', 400) },
  { id: '30133734', subject: 'Urban Life',              category: 'documentary', ratio: '3:2', url: px('30133734', 1600), thumbUrl: px('30133734', 400) },
];

// Avatar photos — faces, tightly cropped
export const SEED_AVATARS: { id: string; name: string }[] = [
  { id: '3979997',  name: 'Alex Chen' },
  { id: '5552597',  name: 'Maria Santos' },
  { id: '5946219',  name: 'James Okafor' },
  { id: '8066653',  name: 'Priya Nair' },
  { id: '13469411', name: 'Luca Ferrari' },
  { id: '13357909', name: 'Aiko Tanaka' },
  { id: '267389',   name: 'David Kim' },
  { id: '6812782',  name: 'Sophie Laurent' },
  { id: '33393745', name: 'Carlos Rivera' },
  { id: '39842764', name: 'Emma Walsh' },
];

export function seedPhoto(index: number): SeedPhoto {
  return SEED_PHOTOS[index % SEED_PHOTOS.length]!;
}

export function seedPhotoByCategory(category: SeedPhoto['category'], index = 0): SeedPhoto {
  const filtered = SEED_PHOTOS.filter((p) => p.category === category);
  return filtered.length > 0 ? filtered[index % filtered.length]! : seedPhoto(index);
}

export function seedPhotoUrl(index: number, w = 800): string {
  const p = SEED_PHOTOS[index % SEED_PHOTOS.length]!;
  return px(p.id, w);
}

export function seedThumbUrl(index: number): string {
  return seedPhotoUrl(index, 400);
}

export function seedAvatarUrl(index: number, size = 120): string {
  const a = SEED_AVATARS[index % SEED_AVATARS.length]!;
  return px(a.id, size);
}

// Named photographer avatars for demo feed / community
export const DEMO_PHOTOGRAPHERS = [
  { handle: 'alex_chen',    name: 'Alex Chen',      specialty: 'Landscape',    avatarUrl: px('3979997', 120)  },
  { handle: 'maria_santos', name: 'Maria Santos',   specialty: 'Portrait',     avatarUrl: px('5552597', 120)  },
  { handle: 'james_okafor', name: 'James Okafor',   specialty: 'Street',       avatarUrl: px('5946219', 120)  },
  { handle: 'priya_nair',   name: 'Priya Nair',     specialty: 'Wedding',      avatarUrl: px('8066653', 120)  },
  { handle: 'luca_ferrari', name: 'Luca Ferrari',   specialty: 'Fine Art',     avatarUrl: px('13469411', 120) },
  { handle: 'aiko_tanaka',  name: 'Aiko Tanaka',    specialty: 'Documentary',  avatarUrl: px('13357909', 120) },
  { handle: 'david_kim',    name: 'David Kim',      specialty: 'Landscape',    avatarUrl: px('267389', 120)   },
  { handle: 'sophie_l',     name: 'Sophie Laurent', specialty: 'Portrait',     avatarUrl: px('6812782', 120)  },
];
