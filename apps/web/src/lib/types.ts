// Domain models for the Blueflutes web UI.
// Field names mirror the design handoff data-models.ts.

export type ID = string;
export type ISODate = string;

export type Specialty =
  | 'Landscape' | 'Portrait' | 'Street' | 'Wedding'
  | 'Fine Art' | 'Documentary' | 'Architecture' | 'Wildlife';

export type PlanTier = 'solo' | 'studio' | 'atelier';

export interface Photographer {
  id: ID;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string;
  specialty: Specialty;
  bio: string;
  plan: PlanTier;
  stats: { frames: number; followers: number; printsSold: number };
  isFollowedByMe?: boolean;
}

export interface Exif {
  aperture: string;
  shutter: string;
  iso: string;
  focalLength: string;
  camera?: string;
  lens?: string;
}

export interface Photo {
  id: ID;
  code: string;
  title: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  exif: Exif;
  galleryId: ID;
  photographerId: ID;
  edition?: { number: number; of: number };
  releasedAt?: ISODate;
  status: 'published' | 'draft';
  priceFrom?: number;
  counts: { likes: number; comments: number; views: number };
  likedByMe?: boolean;
  favoritedByMe?: boolean;
}

export type GalleryVisibility = 'public' | 'unlisted' | 'private';
export type GalleryLayout = 'grid' | 'masonry' | 'editorial';

export interface Gallery {
  id: ID;
  photographerId: ID;
  title: string;
  description: string;
  coverPhotoId: ID | null;
  visibility: GalleryVisibility;
  layout: GalleryLayout;
  printsForSale: boolean;
  photoOrder: ID[];
  counts: { frames: number; views: number };
}

export interface ClientGallery extends Gallery {
  clientName: string;
  shareToken: string;
  expiresAt: ISODate;
  allowDownload: boolean;
  favoritePhotoIds: ID[];
}

export interface PrintOption {
  id: ID;
  size: string;
  kind: string;
  basePrice: number;
  framed?: boolean;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  priceMonthly: number;
  priceAnnual?: number;
  tagline: string;
  commissionPct: number;
  trialDays?: number;
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

export interface FeedPost {
  id: ID;
  author: Pick<Photographer, 'id' | 'handle' | 'displayName' | 'avatarUrl' | 'specialty'>;
  body: string;
  photoIds: ID[];
  createdAt: ISODate;
  counts: { likes: number; comments: number };
  likedByMe?: boolean;
  space: CommunitySpace;
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
  mine?: boolean;
}

export interface Collection {
  id: ID;
  ownerId: ID;
  name: string;
  note: string;
  coverPhotoIds: ID[];
  photoIds: ID[];
  count: number;
}

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
  trend: number[];
}

export interface FunnelStage {
  label: string;
  value: number;
  pctOfTop: number;
}

export interface BuyerSummary {
  buyerHandle: string;
  avatarUrl: string | null;
  orders: number;
  spent: number;
}

export interface OnboardingState {
  step: 0 | 1 | 2 | 3;
  account?: { email: string };
  plan?: PlanTier;
  studio?: {
    displayName: string;
    handle: string;
    specialties: Specialty[];
    avatarUrl?: string;
  };
}

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
