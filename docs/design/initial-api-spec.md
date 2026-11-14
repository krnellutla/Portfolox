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


---

# v2 additions (see REVISIONS.md)

> Conventions from the codebase apply to everything in this file: every response is
> wrapped in `{ data, error }`; every request is validated with a Zod schema from
> `packages/shared`; every tenant-scoped table has `tenant_id` and an RLS policy; all
> money is an integer in minor units with a `currency` code. Types are the v2 types in
> `data-models.ts`.

**Changed from v1**
- `GET /print-options` (global list) is replaced by `GET /photos/:id/print-options`.
- `POST /checkout/print` is replaced by the cart and checkout endpoints below.
- `GET /plans` returns `PlanV2[]` (minor units, `commissionPct` on every plan, `trialDays`).
- `GET /me/analytics/summary` returns `AnalyticsSummaryV2`.
- `POST /auth/signup` and `POST /auth/login` (email/password) do not exist. Auth is
  OAuth with Google and GitHub only.

## Prints, cart, checkout (R4) — tenant host, guest allowed
| Method | Path | Body | Returns | Drives |
|---|---|---|---|---|
| GET | `/photos/:id/print-options` | — | `PhotoPrintOption[]` (without `printCost`) | Lightbox · PrintPanel |
| GET | `/cart` | — | `Cart` | nav badge; 16 — Cart |
| POST | `/cart/items` | `{ photoId, printOptionId, qty }` | `Cart` | PrintPanel · "Add to cart" |
| PATCH | `/cart/items/:id` | `{ qty }` | `Cart` | Cart · quantity stepper |
| DELETE | `/cart/items/:id` | — | `Cart` | Cart · "Remove" |
| GET | `/checkout/shipping-methods?country=&postcode=` | — | `ShippingMethod[]` | 17 — Checkout · delivery |
| POST | `/checkout/session` | `{ email, shippingAddress, shippingMethodId }` | `{ orderId, clientSecret }` | Checkout · payment element |
| GET | `/orders/:id?token=` | — | `OrderV2` (no `payout`) | 18 — Confirmation / tracking |
| POST | `/webhooks/payments` | processor event | `200` | marks the order `paid` |

> The cart is identified by an httpOnly cookie for guests and by the user for signed-in
> buyers. Reject `qty` above the remaining edition with error code `EDITION_SOLD_OUT`.
> An order is created as pending at `/checkout/session` and becomes `paid` only from
> the webhook, never from the client. `token` is a signed link from the receipt email.

## Studio orders (R5)
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/me/orders?status=&cursor=` | `OrderV2[]` (with `payout`) | 19 — Orders table |
| GET | `/me/orders/:id` | `OrderV2` (with `payout`) | Orders · drawer |
| POST | `/me/orders/:id/refund` | `OrderV2` | Orders · "Refund order" |

## Client galleries — v2 (R7)
| Method | Path | Body | Returns | Drives |
|---|---|---|---|---|
| GET | `/client/:shareToken` | — | `ClientGalleryV2` (`410` + `LINK_EXPIRED` if expired) | 09 — Client gallery |
| PUT | `/client/:shareToken/favorites` | `{ photoIds[] }` | `{ favoritePhotoIds[] }` | heart toggles |
| POST | `/client/:shareToken/submit` | — | `{ selectsSubmittedAt }` | "Submit selects" |
| POST | `/client/:shareToken/download` | `{ photoIds[]? }` | `{ url }` (zip; all photos if omitted) | "Download all / selected" |
| PATCH | `/me/client-galleries/:id` | `{ expiresAt?, selectLimit?, allowDownload? }` | `ClientGalleryV2` | owner · "Edit expiry" |

## Studio settings (R9)
| Method | Path | Body | Returns | Drives |
|---|---|---|---|---|
| PATCH | `/me/studio` | profile fields | `Photographer` | Settings · Profile |
| GET / PATCH | `/me/settings/theme` | `ThemeTokens` (exists today) | `ThemeTokens` | Settings · Branding |
| GET | `/me/domains` | — | `TenantDomain[]` | Settings · Domain |
| POST | `/me/domains` | `{ host }` | `TenantDomain` (with `records`) | add custom domain |
| POST | `/me/domains/:id/verify` | — | `TenantDomain` | "Verify" |
| DELETE | `/me/domains/:id` | — | `204` | remove domain |
| GET | `/me/billing` | — | `BillingSummary` | Settings · Plan & billing |
| POST | `/checkout/subscribe` | `{ plan, interval }` | checkout session | "Change plan" |
| POST | `/me/payouts/connect` | — | `{ url }` | "Connect payouts" |
| GET / PATCH | `/me/settings/notifications` | `NotificationPrefs` | `NotificationPrefs` | Settings · Notifications |

> Custom domains require the Studio or Atelier plan; return `PLAN_REQUIRED` otherwise.
> A domain must be verified before it is added to tenant resolution or the CORS allowlist.

## Albums (R10)
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/nodes` (exists) | node tree → `AlbumNode[]` | 13 — Upload · album tree |
| POST / PATCH / DELETE | `/nodes`, `/nodes/:id` (exist) | node | New album / New folder / rename / move |

## Community (R12)
| Method | Path | Returns | Drives |
|---|---|---|---|
| GET | `/community/posts/:id` | `FeedPost` | post detail view |
| POST | `/community/posts/:id/comments` | `{ body }` → `Comment` | post detail · comment |

## Messaging (R12)
| Method | Path | Returns | Drives |
|---|---|---|---|
| POST | `/conversations/:id/read` | `{ unreadCount: 0 }` | clears the unread badge on open |
