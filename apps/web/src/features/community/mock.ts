import type { CommunitySpace, FeedPost, Photographer } from '../../lib/types.js';

export const SPACES: { id: CommunitySpace; label: string; count: number }[] = [
  { id: 'show-your-work',   label: 'Show Your Work',    count: 412 },
  { id: 'critique',         label: 'Critique Corner',   count: 189 },
  { id: 'pricing-business', label: 'Pricing & Business',count: 94 },
  { id: 'gear',             label: 'Gear Talk',         count: 266 },
  { id: 'locations',        label: 'Locations',         count: 137 },
];

const PHOTOGRAPHERS: Pick<Photographer, 'id' | 'handle' | 'displayName' | 'avatarUrl' | 'specialty'>[] = [
  { id: 'ph1', handle: 'miracalder',  displayName: 'Mira Calder',  avatarUrl: null, specialty: 'Landscape' },
  { id: 'ph2', handle: 'studio.ridge',displayName: 'Ridge Studio', avatarUrl: null, specialty: 'Portrait' },
  { id: 'ph3', handle: 'k.møller',   displayName: 'K. Møller',    avatarUrl: null, specialty: 'Street' },
  { id: 'ph4', handle: 'noahp',      displayName: 'Noah Petersen', avatarUrl: null, specialty: 'Fine Art' },
];

const PH_GRADIENTS = [
  'linear-gradient(145deg,#bda988,#8a7150)',
  'linear-gradient(145deg,#7e8893,#525c68)',
  'linear-gradient(145deg,#9aa79b,#5f6f63)',
  'linear-gradient(145deg,#9a96a6,#675f74)',
];

export const PHOTOGRAPHER_GRADIENTS = Object.fromEntries(
  PHOTOGRAPHERS.map((p, i) => [p.id, PH_GRADIENTS[i]])
);

export const FEED_POSTS: (FeedPost & { photoGradient?: string })[] = [
  {
    id: 'post1',
    author: PHOTOGRAPHERS[0],
    body: 'Shot this last week on the Icelandic coast — the light lasted maybe 4 minutes. Worth every freezing second.',
    photoIds: ['p1'],
    photoGradient: 'linear-gradient(145deg,#7e8893,#525c68)',
    createdAt: '2026-06-21T06:00:00Z',
    counts: { likes: 84, comments: 12 },
    likedByMe: false,
    space: 'show-your-work',
  },
  {
    id: 'post2',
    author: PHOTOGRAPHERS[1],
    body: 'Had a productive studio day. Anyone else finding that rembrandt lighting makes clients look more relaxed than butterfly? Curious to hear your workflows.',
    photoIds: [],
    createdAt: '2026-06-21T04:30:00Z',
    counts: { likes: 31, comments: 7 },
    likedByMe: true,
    space: 'critique',
  },
  {
    id: 'post3',
    author: PHOTOGRAPHERS[2],
    body: 'Finally printing "Tideline" at 24×36 giclée. The tonal separation at the waterline is everything. Highly recommend Hahnemühle FineArt.',
    photoIds: ['p2'],
    photoGradient: 'linear-gradient(145deg,#9aa79b,#5f6f63)',
    createdAt: '2026-06-20T21:00:00Z',
    counts: { likes: 56, comments: 4 },
    likedByMe: false,
    space: 'show-your-work',
  },
  {
    id: 'post4',
    author: PHOTOGRAPHERS[3],
    body: "Does anyone have experience with dynamic pricing? I'm thinking about raising my 16×20 prints from $45 to $65 mid-season and wondering how it affects volume.",
    photoIds: [],
    createdAt: '2026-06-20T15:00:00Z',
    counts: { likes: 19, comments: 22 },
    likedByMe: false,
    space: 'pricing-business',
  },
];

export const TRENDING_TAGS = ['#iceland', '#fineart', '#print-edition', '#critique', '#35mm', '#landscape'];

export const ACTIVE_NOW = [
  { id: 'ph2', name: 'Ridge Studio', gradient: PH_GRADIENTS[1] },
  { id: 'ph3', name: 'K. Møller',    gradient: PH_GRADIENTS[2] },
  { id: 'ph4', name: 'Noah Petersen',gradient: PH_GRADIENTS[3] },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export { relativeTime };
