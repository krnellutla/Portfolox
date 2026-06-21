# Handoff: Portfolix — photographer portfolio + print store + community

## Overview
**Portfolix** is a platform for professional photographers to host portfolios, sell
prints affordably, run private client galleries, and talk to peers in a community
space. This bundle covers **15 screens** across three areas — Public, Account, and
Admin/Studio — plus a mobile pass. The differentiator is **affordability**: the
lowest print commissions in the category, surfaced throughout pricing and analytics.

The aesthetic is a **monochrome "contact-sheet / darkroom-index"** system: warm paper,
near-black ink, hairline borders, an editorial serif for display, a clean grotesk for
UI, and a monospace for metadata (frame codes, EXIF, section eyebrows). The UI chrome
stays colorless on purpose so the **photographs** carry all the color.

---

## About the design files
The files in `reference/` are a **design reference created in HTML/JS** — a prototype
that shows intended look, layout, and behavior. **It is not production code to copy.**
Your task is to **re-implement these designs in the target codebase** —
**React (Vite) + Tailwind CSS, custom components (no component library), talking to a
REST/GraphQL API** — using that project's established patterns.

- `reference/Portfolix.dc.html` — all 15 screens. It is a single-file component
  framework prototype; ignore its `<x-dc>` / `support.js` runtime entirely. Read it
  for **markup structure, exact inline style values, copy, and interaction logic**.
- `reference/ios-frame.jsx` — the iPhone bezel used only to present the mobile screens.
  Do **not** ship it; it is presentation scaffolding. Build mobile as responsive
  breakpoints of the real screens.
- `reference/support.js` — prototype runtime. **Ignore.**

How to open the reference: open `Portfolix.dc.html` in a browser. A dark **switcher
bar** across the top lets you jump between every screen (grouped Public / Account /
Admin / Mobile). The bar is a **preview tool, not part of the product** — do not build it.

---

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and copy are final and intended to be
matched. Recreate the UI pixel-accurately using your Tailwind setup and custom
components. The **only** thing that is placeholder is **imagery**: every "photo" in the
prototype is a muted two-tone CSS gradient (see `tokens.tailwind.js → PHOTO_TONES`).
Replace **all** of them with real images (`<img>` / `next/image` / your image
component). Keep the gradient only as a loading skeleton if useful.

---

## The design system (summary)
Full machine-readable tokens are in **`tokens.tailwind.js`** (drop into `theme.extend`).
Key points:

- **Color** — `paper #f4f3f0` (bg), `surface #ffffff` (cards), `ink #16150f`
  (text/buttons/active), `ink-3 #56544c` (secondary), `muted #9a988f` (tertiary/mono),
  `line #e0ded8` (hairlines), `field #d6d3cb` (input borders).
  Semantics: `positive #3f7a5e`, `negative #c0683f`. No gradients in chrome; the only
  saturated color appears in the six search **color chips**.
- **Type** — Display: **Newsreader** (serif, weight 500, tight tracking) for headlines,
  names, prices, big numbers. UI/body: **Hanken Grotesk** (400–700). Metadata:
  **Space Mono** (codes, EXIF, eyebrows, uppercase labels with `0.14–0.22em` tracking).
  Load all three from Google Fonts.
- **Layout** — page content max-width **1280px** (narrow pages 1080px), `32px` side
  padding. Hairline 1px borders define structure far more than shadows; the product is
  near-flat. Cards radius **14px**, panels **16px**, controls/inputs **9px**, tiles
  **8px**, pills **999px**.
- **Motion** — each screen mounts with `pfxFade` (fadeUp 10px, 0.4s ease). Buttons/tabs
  transition `background`/`color` at 0.15s. Keep it restrained.
- **Eyebrow convention** — most screens open with a mono label like `02 — SEARCH`
  (`Space Mono`, 11px, `letter-spacing:0.22em`, color `muted`). These numbers are the
  switcher indices; in production they can be dropped or kept as a stylistic touch.

---

## Suggested file / folder structure
```
src/
  app/ or routes/                 # your router's convention
  components/
    primitives/                   # the shared kit (see Component Inventory)
      Button.tsx                  # variants: solid | outline | ghost | pill
      Input.tsx  Textarea.tsx  Toggle.tsx  Radio.tsx  Checkbox.tsx
      Chip.tsx                    # filter/category pill (selectable)
      Eyebrow.tsx                 # mono section label
      StatCard.tsx                # KPI card (label / value / delta)
      Avatar.tsx                  # circle, gradient/photo, optional online dot
    photo/
      PhotoTile.tsx               # square/ratio image tile + code + overlays
      PhotoGrid.tsx               # responsive grid wrapper (cols configurable)
      FavoriteButton.tsx          # heart toggle
    nav/
      TopNav.tsx  MobileTabBar.tsx
  features/
    discover/      DiscoverPage.tsx  FeaturedCard.tsx
    search/        SearchPage.tsx    FilterSidebar.tsx
    portfolio/     PortfolioPage.tsx PortfolioHeader.tsx
    lightbox/      Lightbox.tsx      PhotoMetaPanel.tsx  CommentThread.tsx
    community/     CommunityPage.tsx PostCard.tsx        Composer.tsx
    chat/          ChatPage.tsx      ConversationList.tsx MessageThread.tsx
    collections/   CollectionsPage.tsx CollectionCard.tsx
    pricing/       PricingPage.tsx   PlanCard.tsx        PrintCard.tsx
    client/        ClientGalleryPage.tsx
    onboarding/    OnboardingFlow.tsx  StepIndicator.tsx
    studio/                          # admin area
      DashboardPage.tsx  AnalyticsPage.tsx
      UploadPage.tsx     UploadQueue.tsx  ManageTable.tsx
      GalleryBuilder.tsx
  lib/   api.ts  ws.ts  types.ts(=data-models.ts)
  styles/ tailwind config (+ tokens.tailwind.js)
```

---

## Component inventory (shared primitives)
Build these once; every screen composes them.

| Component | Spec |
|---|---|
| **Button** | radius 9px, weight 600. **solid**: `bg-ink text-paper`. **outline**: `bg-surface border-field text-ink`. **ghost/pill**: 999px radius, used for chips/filters. Padding ≈ `11–14px × 18–24px`. |
| **Input / Textarea** | `border-field`, radius 9–10px, padding `12–14px`, `placeholder:text-[#a9a79d]`, `outline-none`, focus = darken border to `ink`. Recessed variant uses `bg-[#faf9f6]`. |
| **Toggle** | 42×24 pill, `bg-ink` when on, white 20px knob, knob slides L↔R. |
| **Radio** | 20px circle, `border-field`; selected = `bg-ink` with `inset 0 0 0 3px #fff`. |
| **Checkbox** | 18px, radius 5px; checked = `bg-ink` white ✓. |
| **Chip** | pill; default `bg-surface border-field text-ink-3`; active `bg-ink text-paper`. Removable variant shows a trailing ✕. |
| **Eyebrow** | mono 11px, `tracking-[0.22em]`, `text-muted`, uppercase. |
| **StatCard** | surface card, radius 14, padding 20–22; mono uppercase label (10px), Newsreader value (34–38px), delta in `positive`/`negative` 12–13px. |
| **Avatar** | circle; gradient or photo; sizes 30/36/42/46/72/116; optional `positive` online dot bottom-right with 2px paper ring. |
| **PhotoTile** | ratio box (1:1, 4:3, 3:2, or 16:9), `rounded-tile`, `overflow-hidden`. Overlays: faint diagonal hatch (`repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0 2px, transparent 2px 8px)`), inner vignette (`inset shadow`), mono code bottom-left, optional FavoriteButton top-right. In production the hatch+vignette are optional flourishes over the real image. |
| **PhotoGrid** | CSS grid, `gap` 12–14px. Column counts per screen noted below. Responsive: see Responsive section. |

---

## Screens / views

> For each: the eyebrow index matches the switcher. All measurements are from the
> reference; treat them as the intended spec. Copy is final.

### 01 — Discover  (`features/discover`)
- **Purpose:** landing / browse photographers + fresh work.
- **Layout:** centered 1280 column. **Hero** (64px top pad, bottom hairline): eyebrow,
  Newsreader h1 `62px` (`max-width:15ch`, "Where photographers keep their best work."),
  body 17px `ink-3` max 54ch, a **search row** (input flex + solid Search button, max
  580), then a wrap of **category chips**. **Featured photographers**: section header
  (Newsreader 30px + mono "VIEW ALL →"), 3-col grid of **FeaturedCard**s. **Fresh
  frames**: header + 4-col `PhotoGrid` of square tiles.
- **FeaturedCard:** surface card r12; 4:3 cover PhotoTile with a small mono specialty
  chip top-left; body row = 42px avatar + name (Newsreader 19) + mono `@handle · loc` +
  a Follow Button (toggles to "Following", solid when followed). Whole card → portfolio.

### 02 — Search & filter  (`features/search`)
- **Purpose:** find frames by style, color, location.
- **Layout:** 2-col `262px / 1fr`. **FilterSidebar** (sticky): eyebrow, search input,
  **Style** checkbox list, **Color** 3-col swatch grid (6 chips; selected = `ink` ring +
  white inset), **Location** list rows with `›`. **Results:** header = Newsreader count
  ("2,418 frames") + sort pill; **active filter chips** row (removable, solid); 4-col
  `PhotoGrid` with a FavoriteButton on each tile.
- **Behavior:** toggling any facet updates active state + chips; results re-query
  (`GET /search`). Color buckets are server-side (see api-spec).

### 03 — Portfolio  (`features/portfolio`)
- **Purpose:** a photographer's public page.
- **Layout:** full-bleed **cover** band (300px, gradient→paper fade, mono caption).
  Content 1280: avatar 116px (4px paper ring, `shadow-avatar`) pulled up `-58px`,
  overlapping; name Newsreader 42px + mono meta; Follow (solid) + Message (outline).
  Bio 16px max 62ch. **Stats bar** (top+bottom hairline): Frames / Followers / Prints
  sold — Newsreader 26px values + mono uppercase labels, divided by hairlines.
  **Gallery chips** (active = solid). **5-col** `PhotoGrid` of square tiles → lightbox.

### 04 — Lightbox  (`features/lightbox`)
- **Purpose:** single-photo view, buy, discuss. **Dark surface** (`#100f0b`, paper text).
- **Layout:** top bar (back to portfolio w/ avatar+name, mono `N / total` counter, ✕).
  Center: prev/next round buttons flanking a **3:2 hero image** (max 760, `shadow-lightbox`).
  Right **PhotoMetaPanel** (344px, scrolls): title Newsreader 30 + mono code; EXIF rows
  (label mono / value) — Exposure, Camera, Edition, Released; a **Buy a print** block
  (translucent card, "from $18", solid-inverse "Choose size & checkout" → pricing);
  Like / Share row; then **CommentThread** (input + Post, list of comments w/ avatar,
  name, time, body, ♡count + Reply).
- **Behavior:** prev/next cycle the active gallery (wrap-around). Posting a comment
  prepends optimistically. Open from any grid tile across the app.

### 05 — Community  (`features/community`)
- **Purpose:** feed + comments ("Feed + reactions" model).
- **Layout:** 3-col `236px / 1fr / 280px`. Left rail (sticky): eyebrow, solid "+ New
  post", **Spaces** list (name + mono count; active = surface card). Center: **Composer**
  (avatar + input + Photo/Poll + solid Post) then a column of **PostCard**s. Right rail
  (sticky): Trending tag pills, "Active now" mini-list with online dots.
- **PostCard:** surface card r14 pad 20; header avatar 44 + name (Newsreader 18) + mono
  `@handle · specialty · time` + `···`; body 15px; optional 16:9 photo; reaction row =
  Like (toggles solid + ♥ + count), comment count, Share.

### 06 — Chat / DMs  (`features/chat`)
- **Purpose:** real-time messaging (clients + peers).
- **Layout:** bordered 16px container, fixed height 660px, 2-col `320px / 1fr`.
  **ConversationList** (left, `#faf9f6`): "Messages" + search; rows = avatar (online dot)
  + name + preview (truncated) + time + unread badge; active row = surface card.
  **MessageThread** (right): header (avatar, name, "● Online now" in `positive`, search/
  more icons); scrolling message area (`#faf9f6`) with a centered "TODAY" divider and
  bubbles — **mine**: `bg-ink text-paper`, right-aligned, radius `14 14 4 14`; **theirs**:
  surface + border, left, radius `14 14 14 4`; mono timestamp under each. Composer: `+`,
  input, solid Send.
- **Behavior:** Enter or Send appends my message instantly (optimistic), clears input.
  Wire to WS for inbound + presence + typing. Switching conversations swaps the thread.

### 07 — Collections / favorites  (`features/collections`)
- **Purpose:** saved work, organized.
- **Layout:** header (eyebrow, Newsreader 40 "Saved & organized", solid "+ New
  collection"). 4-col grid of **CollectionCard**s + a dashed "Create collection" card.
  Then "Liked photos" header (+ mono saved count) and a **6-col** `PhotoGrid` with heart
  toggles.
- **CollectionCard:** surface card; cover is a **2×2 mosaic** (first 4 photos, 2px gaps);
  name Newsreader 20 + note + mono "{count} FRAMES".

### 08 — Pricing / store  (`features/pricing`)
- **Purpose:** plans + à-la-carte prints; sell affordability.
- **Layout:** centered 1080, centered text. Eyebrow, Newsreader 54 "Pricing that gets
  out of the way.", body, a **Monthly / Annual** pill segmented control. 3-col **PlanCard**
  grid (Solo $6 / **Studio $14 highlighted** / Atelier $29) — highlighted card is
  `bg-ink text-paper`. Each: mono tag, Newsreader price + period, name, em-dash feature
  list, full-width CTA (inverse on highlighted). Then a hairline + **À la carte prints**:
  header + mono "NO SUBSCRIPTION REQUIRED" + 4-col **PrintCard** grid (4:3 cover, size,
  mono kind, Newsreader price + solid "Add").
- **PlanCard features** (final copy): Solo — Unlimited storage / 1 portfolio site /
  Community / Basic store / subdomain. Studio — +Custom domain / Client galleries +
  proofing / **8% commission** / Analytics. Atelier — +**4% commission** / Unlimited
  client galleries / Priority support / Second-shooter seats.

### 09 — Client gallery  (`features/client`)
- **Purpose:** private, shareable, proofing.
- **Layout:** header — mono "⬚ PRIVATE · 09 — CLIENT GALLERY", Newsreader 38 title
  ("Delgado Wedding — Final Selects"), shared-with line (client, frame count, expiry);
  right: "↓ Download all" (outline) + "↗ Share link" (solid). Filter chips
  (All / ♡ Favorites / Ceremony / Reception). When ≥1 photo selected, a dark **selection
  pill** appears (count + "Add to favorites"). 4-col `PhotoGrid` of 3:2 tiles; each tile
  has a **circular check** top-right (toggles selected; selected = `ink` ring + filled
  check) — clicking the tile body opens the lightbox; clicking the check selects.

### 10 — Onboarding  (`features/onboarding`)
- **Purpose:** sign up → choose plan → studio setup → done.
- **Layout:** centered, brand wordmark, a **StepIndicator** (4 steps: Account / Plan /
  Studio setup / Done — numbered dots fill `ink` as completed, connected by hairlines),
  then a 520-wide surface card with step content:
  - **0 Account:** OAuth buttons (Google/Apple), OR divider, Email + Password, solid
    "Create account →".
  - **1 Plan:** PlanCard-as-radio-rows (radio + name/tag + price); Back + "Continue →".
  - **2 Studio setup:** avatar upload (72px + ＋ badge), Display name, **handle** input
    with `portfolix.com/` prefix, Specialty chips, Back + "Finish setup →".
  - **3 Done:** ink check circle, "You're all set, Mira.", live URL line, "Upload photos"
    + "Build a gallery" CTAs.
- **Behavior:** step state 0–3; dots are clickable; Back/Continue step through. Persist
  via the `/me/*` PATCH endpoints.

### 11 — Studio dashboard  (admin · `features/studio/Dashboard`)
- **Layout:** header (eyebrow, "Good morning, Mira.", range pill, solid "↑ Upload
  photos"). 4 **StatCard**s (Profile views / Print revenue / Prints sold / Followers,
  each with `positive` delta). 2-col `1.4fr / 1fr`: **revenue bar chart** card (12 monthly
  bars, last bar `ink`, rest `#cfccc3`, mono month labels) + **Recent sales** list (item /
  mono buyer·time / Newsreader amount). Full-width **Top galleries**: 4-col cards
  (16:9 cover, title, mono "{frames} frames · {views} views").

### 12 — Analytics deep-dive  (admin · `features/studio/Analytics`)
- **Layout:** header + **range segmented** (30 days / 90 / All). 4 KPI cards (Photo
  views / Conversion / Avg. order / Print revenue; ▲▼ in `positive`/`negative`). 2-col
  `1.55fr / 1fr`: **Top performing frames** table (cols: Frame [thumb+title+code] /
  Views / Sales / Revenue / Conv. / 7-day **sparkline** [7 mini bars]) — right column
  stacks **Conversion funnel** (4 horizontal bars, width = %, opacity steps down, value
  inside) and **Top buyers** (avatar + mono handle + orders + Newsreader spent).

### 13 — Upload & manage  (admin · `features/studio/Upload`)
- **Layout:** 2-col `236px / 1fr`. Left rail (sticky): eyebrow, "Albums" + `+`, album
  rows (surface, name [lock glyph if private] + mono count). Right: a **dropzone**
  (2px dashed, `#fbfaf7`, ink ↑ tile, "Drop RAW or JPEG…", target album, solid "Browse
  files"). **Upload queue** card: rows = thumb + mono filename + size + **progress bar**
  (`ink` filling; `positive` when done) + status dot + mono status label. **Manage
  frames** card: a table (Frame [thumb+title+code] / Album / Status ["Published" pill in
  `positive` tint] / Price / `···`).
- **Behavior:** uploads show live progress (poll/WS); manage rows edit status/price/album.

### 14 — Gallery builder  (admin · `features/studio/GalleryBuilder`)
- **Purpose:** arrange a gallery, **drag to reorder**.
- **Layout:** header (eyebrow, gallery title Newsreader 36, mono "DRAG TO REORDER",
  outline Preview + solid Publish). 2-col `1fr / 300px`: left = **3-col grid** of 4:3
  draggable tiles — each shows an **order-number badge** (top-left, mono, paper bg), a
  grip glyph `⠿` (top-right), mono code; `cursor:grab`. Right **settings panel** (sticky):
  Title input, Description textarea, **Visibility** toggle (+caption), **Prints for sale**
  toggle, **Layout** picker (3 mini-diagrams: grid selected w/ `ink` border, feature, full).
- **Behavior (real):** HTML5 drag-and-drop. On `dragStart` record index; `dragOver`
  preventDefault; on `drop` splice the dragged id to the target index and re-render
  (numbers update). Persist order via `PUT /me/galleries/:id/order`. In React, use
  `@dnd-kit/sortable` (recommended) over raw HTML5 DnD for accessibility + touch.

### 15 — Mobile
- **Purpose:** show the system on phones (presentation only — build as responsive).
- Four representative screens inside iPhone bezels on a gray board: Discover (header +
  horizontal featured rail + 2-col grid + bottom **MobileTabBar**), Portfolio (cover +
  overlapping avatar + stats + 2-col grid), Community (header + stacked PostCards +
  tab bar), and a **dark** Admin Upload (dropzone + queue + album row).
- **Build note:** these are the responsive collapses of screens 01/03/05/13. The
  bottom tab bar (◎ Discover / ⌕ Search / ◰ Community / ◐ Profile) replaces the top nav
  under `md`. The admin Upload mobile uses a **dark** theme (`bg-ink`, paper text).

---

## Interactions & behavior (global)
- **Navigation:** the dark switcher is prototype-only. In production use your router;
  the cross-links that exist (Lightbox→Pricing, Dashboard→Upload, Onboarding→Upload/
  Builder, etc.) map to real routes.
- **Optimistic updates:** likes, follows, favorites, comment posts, and chat sends all
  update instantly in the prototype — keep that, reconcile with the server response.
- **Selection (client gallery):** multi-select via per-tile checks; a floating action
  pill summarizes the count.
- **Drag-reorder (builder):** see screen 14.
- **Screen-enter motion:** `pfxFade` 0.4s. **Hover:** tabs/buttons 0.15s color/bg; tiles
  may lift subtly. Keep transitions short and quiet.

## State management
Mostly server state + light local UI state. Suggested:
- **Server cache:** TanStack Query (or your choice) keyed by the api-spec endpoints.
- **Local UI state** (component-level `useState`/reducer): onboarding step (0–3);
  active conversation; chat draft + optimistic outgoing messages; search filter object
  (`SearchFilters`); selected client-photo ids; gallery `photoOrder` while dragging;
  favorited/liked/following maps (mirror server, optimistic).
- **Real-time:** a WS/SSE client for `conversations` (new messages, presence, typing)
  and optionally community activity.
- See `data-models.ts` for every entity and `api-spec.md` for the endpoint contract.

## Design tokens
See **`tokens.tailwind.js`** — colors, fonts, the type scale, radii, shadows, max-widths,
and the `pfxFade` keyframe, ready to merge into `theme.extend`. `PHOTO_TONES` there
reproduces the placeholder gradients (replace with real images).

## Assets
- **Fonts:** Newsreader, Hanken Grotesk, Space Mono (Google Fonts). Weights used:
  Newsreader 400/500/600 (+italic available), Hanken 400/500/600/700, Space Mono 400/700.
- **Imagery:** none real — all gradient placeholders. Wire your photo CDN / image
  component. The prototype's hatch + vignette overlays are optional stylistic flourishes
  you may keep over real photos or drop.
- **Icons:** the prototype uses Unicode glyphs (⌕ ↗ ↓ ✓ ♡ ♥ ⠿ ◎ ◰ ◐ ▲ ▼ ⬚ ···) as
  stand-ins. Swap for your icon set (e.g. Lucide): search, share, download, check,
  heart/heart-filled, grip-vertical, home, message-square, user, chevrons, lock,
  more-horizontal.
- No logo asset — "Portfolix" is set in Newsreader 600.

## Files in this bundle
- `reference/Portfolix.dc.html` — all 15 screens (design reference; ignore the runtime).
- `reference/ios-frame.jsx`, `reference/support.js` — prototype scaffolding; do not ship.
- `tokens.tailwind.js` — design tokens for `theme.extend` (+ `PHOTO_TONES`).
- `data-models.ts` — TypeScript domain models.
- `api-spec.md` — suggested REST/WS endpoints per screen.
- `screenshots/` — PNG of each screen (visual reference).
