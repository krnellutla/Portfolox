# Blueflutes — Claude Code build prompts

Ready-to-paste prompts for integrating the Blueflutes designs into your codebase
(**React + Vite · Tailwind · custom components · REST/WS API**).

**How to use:** run the **Setup** prompt once, then work **one screen per prompt** in
the order below (simplest first, to validate your shared primitives before the complex
screens). Review and merge each screen's diff before pasting the next, so corrections
carry forward instead of repeating.

All prompts reference files in this folder:
- `README.md` — per-screen specs, component inventory, file structure
- `tokens.tailwind.js` — design tokens for `theme.extend`
- `data-models.ts` — TypeScript domain models
- `api-spec.md` — suggested REST/WS endpoints per screen
- `screenshots/NN-name.png` — visual reference per screen
- `reference/Blueflutes.dc.html` — the prototype (each screen is an `isXxx` block)

---

## Setup (run once, before any screen)
```
Read design_handoff_blueflutes/README.md and tokens.tailwind.js. Merge the tokens into my tailwind.config.js under theme.extend and add the Newsreader / Hanken Grotesk / Space Mono font links. Then build the shared primitives listed in the README's "Component inventory" (Button, Input, Textarea, Toggle, Radio, Checkbox, Chip, Eyebrow, StatCard, Avatar, PhotoTile, PhotoGrid). Match the token values exactly and use my existing component conventions. Don't build any screens yet — show me the config + primitives diff. NOTE: the HTML in reference/ is a design reference, not code to copy — re-implement in React/Tailwind. Replace every gradient photo placeholder with a real image component. Do not build the dark switcher bar — it's a preview tool, not part of the product.
```

---

## 1 — Pricing
```
Build screen 08 — Pricing per the README spec. Reference screenshots/08-pricing.png for layout and the isPricing block in reference/Blueflutes.dc.html for exact structure, styles, and copy. Use the Plan and PrintOption types from data-models.ts and the /plans, /print-options, /checkout/* endpoints in api-spec.md. Stub the API with mock data for now.
```

## 2 — Collections
```
Build screen 07 — Collections per the README spec. Reference screenshots/07-collections.png and the isCollections block in reference/Blueflutes.dc.html for structure, styles, and copy. Use the Collection and Photo types from data-models.ts, and the favorite endpoints in api-spec.md. Stub the API with mock data for now.
```

## 3 — Portfolio
```
Build screen 03 — Portfolio per the README spec. Reference screenshots/03-portfolio.png and the isPortfolio block in reference/Blueflutes.dc.html. Use the Photographer, Gallery, and Photo types from data-models.ts and the /photographers/:handle, /galleries, /photos, and follow endpoints in api-spec.md. Tiles open the lightbox (built later) — leave a click handler stub. Stub the API with mock data for now.
```

## 4 — Discover
```
Build screen 01 — Discover per the README spec. Reference screenshots/01-discover.png and the isDiscover block in reference/Blueflutes.dc.html. Use the Photographer and Photo types from data-models.ts and the /discover/featured, /discover/fresh, and follow endpoints in api-spec.md. The FeaturedCard links to a photographer's Portfolio. Stub the API with mock data for now.
```

## 5 — Onboarding
```
Build screen 10 — Onboarding per the README spec. Reference screenshots/10-onboarding.png and the isOnboarding block in reference/Blueflutes.dc.html. It's a 4-step flow (Account / Plan / Studio setup / Done) — use the OnboardingState, PlanTier, and Specialty types from data-models.ts and the /auth/signup, /auth/oauth/:provider, /me/plan, /me/studio, and /handles/:handle/available endpoints in api-spec.md. Manage step state locally (0–3). Stub the API with mock data for now.
```

## 6 — Studio Dashboard
```
Build screen 11 — Studio Dashboard per the README spec. Reference screenshots/11-dashboard.png and the isDashboard block in reference/Blueflutes.dc.html. Use the AnalyticsSummary, Order, and Gallery types from data-models.ts and the /me/analytics/summary, /me/analytics/revenue, /me/sales/recent endpoints in api-spec.md. Reuse the StatCard primitive. Stub the API with mock data for now.
```

## 7 — Search & filter
```
Build screen 02 — Search per the README spec. Reference screenshots/02-search.png and the isSearch block in reference/Blueflutes.dc.html. Use the SearchFilters and SearchResult types from data-models.ts and the /search and /search/facets endpoints in api-spec.md. Toggling any facet updates active chips and re-queries; color buckets are server-side per the api-spec note. Stub the API with mock data for now.
```

## 8 — Community
```
Build screen 05 — Community per the README spec. Reference screenshots/05-community.png and the isCommunity block in reference/Blueflutes.dc.html. Use the FeedPost, Comment, and CommunitySpace types from data-models.ts and the /community/spaces, /community/posts, and like endpoints in api-spec.md. Likes and new posts update optimistically. Stub the API with mock data for now.
```

## 9 — Client gallery
```
Build screen 09 — Client gallery per the README spec. Reference screenshots/09-client.png and the isClient block in reference/Blueflutes.dc.html. Use the ClientGallery and Photo types from data-models.ts and the /client/:shareToken, favorites, and download endpoints in api-spec.md. Per-tile circular checkbox drives multi-select; a floating action pill summarizes the count; tile body opens the lightbox. Stub the API with mock data for now.
```

## 10 — Upload & manage
```
Build screen 13 — Upload & manage per the README spec. Reference screenshots/13-upload.png and the isUpload block in reference/Blueflutes.dc.html. Use the Photo and Gallery types from data-models.ts and the /me/galleries, /me/photos/upload, upload status, and PATCH /me/photos/:id endpoints in api-spec.md. Implement the presigned-upload flow described in the api-spec, with a live progress queue. Stub the API with mock data for now.
```

## 11 — Analytics deep-dive
```
Build screen 12 — Analytics per the README spec. Reference screenshots/12-analytics.png and the isAnalytics block in reference/Blueflutes.dc.html. Use the AnalyticsSummary, PhotoPerformance, FunnelStage, and BuyerSummary types from data-models.ts and the /me/analytics/* endpoints in api-spec.md. The 7-day sparkline and conversion funnel are CSS bars — keep them lightweight (no chart lib unless I already have one). Stub the API with mock data for now.
```

## 12 — Lightbox
```
Build screen 04 — Lightbox per the README spec. Reference screenshots/04-lightbox.png and the isLightbox block in reference/Blueflutes.dc.html. It's a dark surface (#100f0b). Use the Photo, Exif, Comment, and PrintOption types from data-models.ts and the /photos/:id, like, /comments, and /print-options endpoints in api-spec.md. Prev/next cycle the active gallery (wrap-around); posting a comment prepends optimistically; "Choose size & checkout" links to Pricing. It opens from any photo grid across the app. Stub the API with mock data for now.
```

## 13 — Chat / DMs
```
Build screen 06 — Chat per the README spec. Reference screenshots/06-chat.png and the isChat block in reference/Blueflutes.dc.html. Use the Conversation and Message types from data-models.ts and the /conversations, /conversations/:id/messages REST endpoints plus the WS /ws events in api-spec.md. Enter or Send appends my message optimistically and clears the input; wire a WebSocket client for inbound messages, presence (online dots), and typing. Switching conversations swaps the thread. Stub REST with mock data and mock the WS layer for now.
```

## 14 — Gallery builder (drag-reorder)
```
Build screen 14 — Gallery builder per the README spec. Reference screenshots/14-builder.png and the isBuilder block in reference/Blueflutes.dc.html. Use the Gallery and Photo types from data-models.ts and PATCH /me/galleries/:id + PUT /me/galleries/:id/order in api-spec.md. Use @dnd-kit/sortable for the drag-reorder (not raw HTML5 DnD) for accessibility + touch; order-number badges update on drop and persist via the order endpoint. The right panel has Title, Description, Visibility/Prints toggles, and a layout picker. Stub the API with mock data for now.
```

## 15 — Mobile / responsive
```
Make the product responsive per screen 15 — Mobile in the README. Reference screenshots/15-mobile.png. These are not separate pages — they're the responsive collapses of Discover (01), Portfolio (03), Community (05), and Upload (13). Under the md breakpoint, replace the top nav with a bottom MobileTabBar (Discover / Search / Community / Profile) and collapse grids to the column counts shown. The mobile Admin Upload uses the dark theme (bg-ink, paper text). Don't ship the iOS bezel from reference/ios-frame.jsx — that's presentation scaffolding only.
```

---

## Reminders to keep in your prompts
- The `reference/` HTML is a **design reference, not code to copy** — re-implement in React/Tailwind using your patterns.
- **Replace every gradient photo placeholder** with a real image component — none of the photos are real.
- **Don't build the dark switcher bar** — it's a preview tool, not part of the product.
- If your real API differs from `api-spec.md`, give Claude Code your actual endpoints up front — the spec is a suggestion, not a constraint.
