# Blueflutes — API surface (suggested REST contract)

> Suggested endpoints the UI implies. Adapt verbs/shapes to your existing
> REST or GraphQL conventions. Auth assumed via bearer token; `me` = current user.
> Types referenced below are defined in `data-models.ts`.

## Auth & onboarding
| Method | Path | Body / Query | Returns | Drives screen |
|---|---|---|---|---|
| POST | `/auth/signup` | `{ email, password }` or OAuth callback | `{ user, token }` | 10 — Onboarding · step 0 |
| POST | `/auth/login` | `{ email, password }` | `{ user, token }` | (login, not mocked) |
| POST | `/auth/oauth/:provider` | provider token | `{ user, token }` | Onboarding · "Continue with Google/Apple" |
| GET | `/me` | — | `Photographer` | global |
| PATCH | `/me/plan` | `{ plan: PlanTier }` | `Photographer` | Onboarding · step 1 |
| PATCH | `/me/studio` | `{ displayName, handle, specialties[], avatarUrl }` | `Photographer` | Onboarding · step 2 |
| GET | `/handles/:handle/available` | — | `{ available: boolean }` | Onboarding · handle field (live check) |

## Discover & profiles
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/discover/featured` | `Photographer[]` | 01 — Discover · featured row |
| GET | `/discover/fresh?cursor=` | `Photo[]` (paginated) | 01 — Discover · fresh frames grid |
| GET | `/photographers/:handle` | `Photographer` | 03 — Portfolio header |
| GET | `/photographers/:handle/galleries` | `Gallery[]` | Portfolio · gallery tabs |
| GET | `/photographers/:handle/photos?gallery=` | `Photo[]` | Portfolio · grid |
| POST | `/photographers/:id/follow` · DELETE same | `{ following: boolean }` | Follow buttons |

## Photo / lightbox / comments
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/photos/:id` | `Photo` (with `exif`, `edition`) | 04 — Lightbox |
| POST | `/photos/:id/like` · DELETE same | `{ liked, count }` | like buttons |
| POST | `/photos/:id/favorite` · DELETE same | `{ favorited }` | heart toggles (search, collections) |
| GET | `/photos/:id/comments` | `Comment[]` | Lightbox · comment thread |
| POST | `/photos/:id/comments` | `{ body }` → `Comment` | Lightbox · "Post" |

## Search
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/search?q=&styles=&colors=&locations=&sort=&cursor=` | `SearchResult` | 02 — Search |
| GET | `/search/facets` | counts per style/location/color | filter sidebar counts |

> Color search: `colors` maps to perceptual buckets (Warm/Cool/Green/Neutral/Mono/Dusk).
> Implement server-side via dominant-color extraction at upload time (store an
> average LAB/HSL on each `Photo`), then bucket at query time.

## Community
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/community/spaces` | `{ space, count }[]` | 05 — Community · left rail |
| GET | `/community/posts?space=&cursor=` | `FeedPost[]` | Community · feed |
| POST | `/community/posts` | `{ body, photoIds[], space }` → `FeedPost` | composer |
| POST | `/community/posts/:id/like` · DELETE | `{ liked, count }` | post reactions |
| GET | `/community/posts/:id/comments` | `Comment[]` | post comments |

## Messaging (real-time)
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/conversations` | `Conversation[]` | 06 — Chat · list |
| GET | `/conversations/:id/messages?cursor=` | `Message[]` | Chat · thread |
| POST | `/conversations/:id/messages` | `{ body }` → `Message` | Chat · send |
| WS | `/ws` (or SSE) | `message.created`, `presence`, `typing` events | live updates + online dots |

> Real-time: prefer WebSocket. Channel per conversation `conv:<id>`; presence
> channel for online dots. Optimistically append the sent message (the prototype
> appends instantly on Enter / Send), then reconcile on the server echo.

## Galleries & uploads (admin)
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/me/galleries` | `Gallery[]` | 13 — Upload · album rail; 14 — Builder |
| POST | `/me/galleries` | `{ title }` → `Gallery` | "New album/collection" |
| PATCH | `/me/galleries/:id` | partial `Gallery` (title, description, visibility, layout, printsForSale) | Builder · settings |
| PUT | `/me/galleries/:id/order` | `{ photoOrder: ID[] }` | Builder · drag-reorder (persist on drop) |
| POST | `/me/photos/upload` | multipart; returns presigned flow or `Photo` | 13 — Upload · dropzone |
| GET | `/me/photos/upload/:id/status` | `{ status, pct }` | Upload · queue progress |
| PATCH | `/me/photos/:id` | `{ status, priceFrom, galleryId }` | Upload · manage table |

> Recommended upload flow: `POST /me/photos/upload` returns a presigned PUT URL +
> photo id; client uploads directly to storage; server processes (thumbs, EXIF,
> dominant color) and flips `status` to `published`. Poll status or push via WS.

## Print store / commerce
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/plans` | `Plan[]` | 08 — Pricing · plan cards |
| GET | `/print-options` | `PrintOption[]` | Pricing · à la carte; Lightbox · "Choose size" |
| POST | `/checkout/print` | `{ photoId, printOptionId, qty }` → checkout session | Lightbox / store CTAs |
| POST | `/checkout/subscribe` | `{ plan }` → checkout session | Pricing CTAs |

> Use Stripe (or your processor) for both print orders and subscriptions.
> `Plan.commissionPct` is the platform's cut on print sales — the product's core
> "affordable" promise is the low commission (8% Studio / 4% Atelier).

## Client galleries
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/client/:shareToken` | `ClientGallery` | 09 — Client gallery (public, tokenized) |
| POST | `/client/:shareToken/favorites` | `{ photoIds[] }` | client "Add to favorites" |
| GET | `/client/:shareToken/download` | zip stream | "Download all" |

## Analytics
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/me/analytics/summary?range=` | `AnalyticsSummary` | 11 — Dashboard KPIs; 12 — Analytics |
| GET | `/me/analytics/revenue?range=` | monthly series | Dashboard · bar chart |
| GET | `/me/analytics/photos?range=&sort=` | `PhotoPerformance[]` | 12 — top frames table |
| GET | `/me/analytics/funnel?range=` | `FunnelStage[]` | 12 — conversion funnel |
| GET | `/me/analytics/buyers?range=` | `BuyerSummary[]` | 12 — top buyers |
| GET | `/me/sales/recent` | `Order[]` | Dashboard · recent sales |
