// ─────────────────────────────────────────────────────────────────────────
// Blueflutes — Domain data models (TypeScript).
// These describe the entities the UI binds to. Field names mirror what the
// reference prototype renders. Adapt nullability / IDs to your API.
// ─────────────────────────────────────────────────────────────────────────

export type ID = string;
export type ISODate = string; // e.g. "2026-03-14T10:31:00Z"

// ── USERS ────────────────────────────────────────────────────────────────
export type Specialty =
  | 'Landscape' | 'Portrait' | 'Street' | 'Wedding'
  | 'Fine Art' | 'Documentary' | 'Architecture' | 'Wildlife';

export type PlanTier = 'solo' | 'studio' | 'atelier';

export interface Photographer {
  id: ID;
  handle: string;              // unique slug, used as blueflutes.com/<handle>
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string;            // "Reykjavík, Iceland"
  specialty: Specialty;
  bio: string;
  plan: PlanTier;
  stats: {
    frames: number;
    followers: number;
    printsSold: number;
  };
  isFollowedByMe?: boolean;    // viewer-relative
}

// ── PHOTOS ───────────────────────────────────────────────────────────────
export interface Exif {
  aperture: string;            // "ƒ2.8"
  shutter: string;             // "1/250"
  iso: string;                 // "400"
  focalLength: string;         // "50mm"
  camera?: string;             // "Leica Q3"
  lens?: string;
}

export interface Photo {
  id: ID;
  code: string;                // human display code, e.g. "PFX·4200"
  title: string;
  url: string;                 // full-res / display image
  thumbUrl: string;
  width: number;
  height: number;
  exif: Exif;
  galleryId: ID;
  photographerId: ID;
  edition?: { number: number; of: number }; // limited print edition
  releasedAt?: ISODate;
  status: 'published' | 'draft';
  priceFrom?: number;          // cents or smallest unit; "from $18"
  counts: { likes: number; comments: number; views: number };
  likedByMe?: boolean;
  favoritedByMe?: boolean;
}

// ── GALLERIES / ALBUMS ─────────────────────────────────────────────────────
export type GalleryVisibility = 'public' | 'unlisted' | 'private';
export type GalleryLayout = 'grid' | 'masonry' | 'feature';

export interface Gallery {
  id: ID;
  photographerId: ID;
  title: string;
  description: string;
  coverPhotoId: ID | null;
  visibility: GalleryVisibility;
  layout: GalleryLayout;
  printsForSale: boolean;
  photoOrder: ID[];            // ordered photo IDs — drives the builder drag-reorder
  counts: { frames: number; views: number };
}

// Private client gallery (shareable, expiring link, selection/proofing)
export interface ClientGallery extends Gallery {
  clientName: string;          // "Ana & Marcus Delgado"
  shareToken: string;
  expiresAt: ISODate;
  allowDownload: boolean;
  favoritePhotoIds: ID[];      // client-selected "favorites"
}

// ── PRINT STORE / COMMERCE ─────────────────────────────────────────────────
export interface PrintOption {
  id: ID;
  size: string;                // "16 × 20″"
  kind: string;                // "Archival matte"
  basePrice: number;
  framed?: boolean;
}

export interface Plan {
  tier: PlanTier;
  name: string;                // "Studio"
  priceMonthly: number;        // 14
  tagline: string;             // "Most popular"
  commissionPct: number;       // print sale commission, e.g. 8
  features: string[];
  highlighted: boolean;
}

export interface Order {
  id: ID;
  buyerHandle: string;
  photoId: ID;
  printOptionId: ID;
  amount: number;
  createdAt: ISODate;
}

// ── COMMUNITY (feed + comments) ────────────────────────────────────────────
export interface FeedPost {
  id: ID;
  author: Pick<Photographer, 'id' | 'handle' | 'displayName' | 'avatarUrl' | 'specialty'>;
  body: string;
  photoIds: ID[];              // optional attached photos
  createdAt: ISODate;
  counts: { likes: number; comments: number };
  likedByMe?: boolean;
  space: CommunitySpace;       // which space/channel it belongs to
}

export type CommunitySpace =
  | 'show-your-work' | 'critique' | 'pricing-business' | 'gear' | 'locations';

export interface Comment {
  id: ID;
  parentType: 'post' | 'photo';
  parentId: ID;
  author: Pick<Photographer, 'id' | 'displayName' | 'avatarUrl'>;
  body: string;
  createdAt: ISODate;
  likes: number;
  replies?: Comment[];
}

// ── MESSAGING / DMs (real-time) ────────────────────────────────────────────
export interface Conversation {
  id: ID;
  participants: Pick<Photographer, 'id' | 'displayName' | 'handle' | 'avatarUrl'>[];
  lastMessagePreview: string;
  lastMessageAt: ISODate;
  unreadCount: number;
  online: boolean;
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  body: string;
  createdAt: ISODate;
  // UI convenience flag — derive from senderId === currentUser.id
  mine?: boolean;
}

// ── COLLECTIONS / FAVORITES ────────────────────────────────────────────────
export interface Collection {
  id: ID;
  ownerId: ID;
  name: string;
  note: string;
  coverPhotoIds: ID[];         // first 4 drive the 2×2 mosaic cover
  photoIds: ID[];
  count: number;
}

// ── ANALYTICS ──────────────────────────────────────────────────────────────
export interface AnalyticsSummary {
  range: '30d' | '90d' | 'all';
  views: number;
  conversionPct: number;
  avgOrder: number;
  revenue: number;
  deltas: { views: number; conversion: number; avgOrder: number; revenue: number };
}

export interface PhotoPerformance {
  photoId: ID;
  title: string;
  code: string;
  views: number;
  sales: number;
  revenue: number;
  conversionPct: number;
  trend: number[];             // 7 daily values → sparkline
}

export interface FunnelStage {
  label: string;               // "Lightbox opens"
  value: number;
  pctOfTop: number;            // 0..100
}

export interface BuyerSummary {
  buyerHandle: string;
  avatarUrl: string | null;
  orders: number;
  spent: number;
}

// ── ONBOARDING ─────────────────────────────────────────────────────────────
export interface OnboardingState {
  step: 0 | 1 | 2 | 3;         // Account · Plan · Studio setup · Done
  account?: { email: string };
  plan?: PlanTier;
  studio?: {
    displayName: string;
    handle: string;
    specialties: Specialty[];
    avatarUrl?: string;
  };
}

// ── SEARCH ──────────────────────────────────────────────────────────────────
export interface SearchFilters {
  q: string;
  styles: Specialty[];
  colors: ('Warm' | 'Cool' | 'Green' | 'Neutral' | 'Mono' | 'Dusk')[];
  locations: string[];
  sort: 'recent' | 'popular' | 'price-asc' | 'price-desc';
}

export interface SearchResult {
  total: number;
  photos: Photo[];
}
