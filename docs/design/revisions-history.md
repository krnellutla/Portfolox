# Blueflutes — Design revisions v2 (October 2026)

This file is the outcome of a design review of the 15-screen handoff. It **amends**
`README.md`. Read both; where they disagree, this file wins.

**Precedence:** `REVISIONS.md` → `README.md` → `reference/Blueflutes.dc.html` → `screenshots/`.
The prototype and screenshots still show the v1 design. They have **not** been redrawn
for the changes below, so new screens (16–20) are specified in words, built from the
existing primitives and tokens.

Each section has an ID (R1…R13). `../build-prompts.md` has one Claude Code prompt per ID.

---

## Where the codebase stands

- All 15 screens exist in `apps/web/src/features/*` and are routed in `apps/web/src/App.tsx`.
- Tokens live in **`apps/web/src/index.css`** inside a Tailwind **v4** `@theme` block.
  There is no `tailwind.config.js`. `tokens.tailwind.js` in this folder is a reference
  copy only; edit `index.css`.
- Shared primitives are in `apps/web/src/components/ui/` (not `components/primitives/`).
- Contracts are Zod schemas in `packages/shared/src/schemas/`. `data-models.ts` here is
  the design-side description; the Zod schemas are the source of truth.
- Every API response uses the `{ data, error }` envelope.
- Auth is **OAuth only: Google and GitHub**. There is no Apple sign-in and no
  email/password.
- There are **two admin shells**: the older `/dashboard/*` (`pages/dashboard`: node tree,
  `GalleryManager`, `ThemeEditor`) and the designed `/studio/*`. See R9 and R10.
- About 50 class names still use Tailwind `slate-*` colors (for example `StateView.tsx`).
  These are off-system. See R3.

---

## R1 — Tokens and accessibility

The v1 tertiary gray fails WCAG AA for text, and input borders fail the 3:1 rule for
control boundaries. Change these in `apps/web/src/index.css`:

| Token | v1 | v2 | Contrast (v2) |
|---|---|---|---|
| `--color-muted` | `#9a988f` | `#6b6960` | 4.96 on paper, 5.51 on surface |
| `--color-muted-2` | `#8c8a82` | `#56544c` | 6.07 on canvas |
| `--color-muted-inverse` (new) | — | `#9a988f` | 6.3 on ink, 6.6 on lightbox `#100f0b` |
| `--color-field` | `#d6d3cb` | `#8a877f` | 3.59 on surface, 3.23 on paper |
| `--color-negative` | `#c0683f` | `#a8552f` | 5.24 on surface, 4.72 on paper |

Unchanged: `paper`, `surface`, `canvas`, `ink*`, `line*` (hairlines are decorative),
`positive`, the six `chip-*` swatches, and `--color-accent` (`#c0683f`).

Rules:

1. **Muted on dark.** On `bg-ink` and the lightbox, use `text-muted-inverse`, never
   `text-muted`. The v2 muted is too dark there.
2. **Muted on canvas.** On `bg-canvas`, use `muted-2`.
3. **Placeholders** use `muted` (the v1 `#a9a79d` is 2.4:1). 
4. **Accent is not a text color** at body sizes (3.58 on paper). Use it for fills,
   borders, and text of 18px+ only.
5. **Minimum sizes.** Mono labels and eyebrows: 12px minimum (v1 used 10–11px). Body: 14px
   minimum. Keep the letter-spacing values.
6. **Focus.** Every interactive element gets
   `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink`
   (`outline-paper` on dark surfaces). Remove bare `outline-none`. Inputs keep the
   border-darkens-to-ink behavior in addition to the ring.
7. **Chart bars.** Idle bars keep the `#cfccc3` fill and gain a 1px `field` border.
   The current-period bar stays solid `ink`.
8. **Icons.** Replace the Unicode glyph stand-ins with `lucide-react` (add the
   dependency). Icon-only buttons need an `aria-label`. Decorative icons get
   `aria-hidden`.
9. **Targets.** Interactive targets are at least 44×44px on touch layouts. The 30px
   favorite and select circles keep their visual size and get padding to reach 44px.
10. **Photos.** Every `PhotoTile` image needs `alt` (photo title; empty string only when
    the title is rendered next to it).
11. **Tenant themes.** `ThemeEditor` lets a tenant override `colorMuted`, `colorInk`, and
    `colorBg`. Show the contrast ratio next to each pair and block Save below 4.5:1
    for ink/bg and muted/bg.

---

## R2 — Responsive layout

v1 specified 1440px and a phone pass only. The code uses `md:` almost exclusively.
Use Tailwind's default breakpoints (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).

Global rules:

- Button labels never wrap: `whitespace-nowrap`. If a header row runs out of room, the
  action group wraps below the title.
- Truncated text uses `truncate` (ellipsis), never a hard clip. This applies to album
  names, conversation previews, and table titles.
- Display headings scale: `display-xl` 40 / 48 / 62px at base / `md` / `lg`;
  `display-l` 36 / 44 / 54px; `display-m` 30 / 36 / 40px.
- Page side padding: 16px base, 24px `md`, 32px `lg`.
- Sticky side rails only apply from `lg` up.
- Under `md`, the top nav is replaced by `MobileTabBar`.

Columns per screen (base / `md` / `lg` / `xl`):

| Screen | Layout |
|---|---|
| 01 Discover | Featured 1 / 2 / 3 / 3. Fresh frames 2 / 3 / 4 / 4. Featured becomes a horizontal rail under `md`. |
| 02 Search | Grid 2 / 3 / 3 / 4. Under `lg` the filter sidebar becomes a "Filters" button that opens a sheet; active chips stay visible. |
| 03 Portfolio | Grid 2 / 3 / 4 / 5. Cover 200 / 260 / 300 / 300px. Under `md`, Follow and Message sit below the name at full width. |
| 04 Lightbox | From `lg`: image + 344px panel. Under `lg`: image on top, panel below, thumbnail strip scrolls horizontally. |
| 05 Community | Under `md`: feed only, Spaces as a horizontal chip row. `md`: left rail + feed. `lg`+: three columns. |
| 06 Chat | Under `md`: one pane (list, then thread with a back button). `md`+: `280px / 1fr`. Height is `calc(100dvh - nav)`, not a fixed 660px. |
| 07 Collections | Cards 1 / 2 / 3 / 4. Liked photos 2 / 3 / 4 / 6. |
| 08 Pricing | Plans 1 / 3 / 3 / 3. |
| 09 Client gallery | Grid 2 / 3 / 3 / 4. Selection pill is fixed to the bottom under `md`. |
| 10 Onboarding | Card is full width with 16px gutters under `md`; step labels hide and only the numbered dots show. |
| 11 Dashboard | Stat cards 2 / 2 / 4 / 4. Chart and Recent sales stack under `lg`. Top galleries 2 / 2 / 4 / 4. |
| 12 Analytics | KPIs 2 / 2 / 4 / 4. Table and right column stack under `lg`. The table scrolls horizontally under `md`. |
| 13 Upload | Under `lg` the album rail becomes a select above the dropzone. Under `md` the Manage table becomes a card list. |
| 14 Builder | Grid 2 / 2 / 3 / 3. Under `lg` the settings panel moves below the grid. |
| 16–20 (new) | Two-column layouts stack under `lg`, summary column first on checkout. |

**Mobile theme:** v1 drew mobile Upload in a dark theme. Drop that. Mobile uses the same
light theme as every other screen.

Lightbox detail (visible at 1440px too): EXIF rows are a `grid-cols-[96px_1fr]` grid
with right-aligned values. Split the exposure row in two so it never wraps:
`EXPOSURE ƒ1.4 · 1/2000` and `ISO / FOCAL 100 · 24mm`.

---

## R3 — Loading, empty, and error states

`components/ui/StateView.tsx` exists and is already used on most screens, but it is
styled with `slate-*` and `red-*` classes. Restyle it with tokens and use it everywhere.

- **Loading (grids and lists):** skeletons, not a spinner. A skeleton tile is
  `bg-field-bg` with a `line` border and the tile's radius, pulsing opacity 1 → 0.6
  over 1.2s. Show the same number of tiles the layout will have. Use the spinner only
  for actions under two seconds (button busy state).
- **Empty:** centered block, max width 420px: mono eyebrow (`muted`), Newsreader 22px
  title, 15px `ink-3` body, one action button.
- **Error:** same block; title in `negative`; outline "Try again" button; the mono
  eyebrow shows the error code from the API envelope.
- Remove every `slate-*`, `red-*`, and other default-palette class in `apps/web/src`.

Empty-state copy:

| Screen | Title | Body | Action |
|---|---|---|---|
| Search | No frames match | Try removing a filter or searching a wider area. | Clear filters |
| Portfolio (owner) | Your portfolio is empty | Upload your first frames to publish this page. | Upload photos |
| Portfolio (visitor) | Nothing published yet | Follow to hear when new work goes up. | Follow |
| Community feed | Quiet in here | Be the first to post in this space. | New post |
| Chat | No conversations yet | Message a photographer from their portfolio. | Discover photographers |
| Collections | No collections yet | Save frames you love and group them here. | New collection |
| Client gallery | No frames in this view | Switch back to all photos. | All photos |
| Dashboard / Analytics | No data for this range | Sales and views will appear once your work is live. | Upload photos |
| Upload queue | Nothing uploading | Drop files above to start. | — |
| Orders | No orders yet | Turn on prints for a gallery to start selling. | Open gallery builder |
| Cart | Your cart is empty | Prints you add will show up here. | Back to portfolio |

---

## R4 — Print purchase flow (new screens 16, 17, 18)

v1 sent a buyer from the lightbox's "Choose size & checkout" to the subscription
pricing page. Buyers and photographers are different people; the flow below replaces
that link. Buyers can check out **as guests** (no Blueflutes account).

A cart holds prints from **one photographer** (one tenant). This keeps payouts and
shipping simple.

### 04 Lightbox — changed
- The "Buy a print" card's button reads **"Choose size"** and opens the **PrintPanel**
  in place of the meta panel (same 344px column; a bottom sheet under `lg`). It does
  not navigate.
- If the photo has `edition`, show `EDITION 12 of 25 · 13 left`. When none are left,
  the card reads "Edition sold out" and the button is disabled.
- If the gallery has prints turned off, the card is not rendered.

### PrintPanel (inside the lightbox)
- Header: back arrow to the meta panel, Newsreader 22px "Choose a print", photo title
  in mono.
- **Size list:** radio rows (the onboarding plan-row pattern): size (600 weight), mono
  `kind`, Newsreader price on the right. From `GET /photos/:id/print-options`.
- **Finish:** chips for unframed / framed, when the option offers both.
- **Quantity:** stepper, 1–10, capped by remaining edition.
- **Summary:** hairline, then "Total" with the Newsreader 26px price; mono note
  "SHIPPING CALCULATED AT CHECKOUT".
- Actions: solid-inverse **"Add to cart"**, outline **"Buy now"** (adds and goes to
  checkout).
- After adding: the button shows "Added ✓" for 2s and the nav cart count updates.

### Nav cart
- A cart icon button in the site header with a count badge (the chat unread badge
  style). Hidden when the count is zero. Opens `/cart`.

### 16 — Cart (`/cart`, `features/checkout/CartPage.tsx`)
- 1080 column. Eyebrow `16 — CART`, Newsreader 40px "Your cart".
- Two columns `1fr / 340px`. Left: item rows — 96px `PhotoTile` thumb, title
  (Newsreader 19px), mono `size · kind`, quantity stepper, line price, text "Remove".
  Right (sticky): summary card — Subtotal, Shipping ("Calculated next"), Total, solid
  "Checkout →", mono "SECURE PAYMENT".

### 17 — Checkout (`/checkout`, `features/checkout/CheckoutPage.tsx`)
- Two columns `1fr / 380px`. Left: three numbered sections using the `StepIndicator`
  dot style vertically — **1 Contact** (email), **2 Shipping** (name, address lines,
  city, region, postcode, country; then delivery method radio rows with price and
  estimate), **3 Payment** (the payment processor's hosted element — do not build card
  fields).
- Right (sticky): order summary — item thumbs with quantity badges, Subtotal, Shipping,
  Tax, Total (Newsreader 30px). Under `lg` this collapses to an expandable bar at the top.
- Primary action: solid "Pay {total}". Inline field errors in `negative` below the
  field, 13px. Payment failures show an error banner above the button and keep all
  input.

### 18 — Order confirmation (`/orders/:id`, `features/checkout/OrderPage.tsx`)
- Reuses the onboarding "Done" pattern: ink check circle, Newsreader 34px "Thank you,
  {firstName}.", mono order number, a line saying a receipt went to {email}.
- Surface card: items, shipping address, delivery estimate, totals.
- A status timeline (see R5) so the same URL works later as the tracking page. Guests
  reach it through a signed link in the receipt email.
- Actions: outline "Back to {photographer}'s portfolio".

---

## R5 — Studio orders (new screen 19)

`/studio/orders`, `features/studio/OrdersPage.tsx`. Photographers had no way to see
what was bought.

- Header: eyebrow `19 — ORDERS`, Newsreader 40px "Orders", status filter chips
  (All / Paid / In production / Shipped / Delivered / Refunded).
- Table in the "Manage frames" style: Order (mono number + date) / Buyer / Items
  (thumb + title + mono size) / Total / **Your payout** / Status pill.
- Status pill colors: Paid and In production — neutral (`field-bg` fill, `ink-3` text);
  Shipped and Delivered — `positive` tint; Refunded — `negative` tint.
- A row opens a right drawer (420px; full screen under `md`): timeline (Paid → In
  production → Shipped → Delivered, each with a mono timestamp), shipping address,
  tracking link, payout breakdown (sale price − print cost − commission = payout),
  outline "Refund order" with a confirm step.
- Printing and shipping are handled by the platform's print partner, so the
  photographer's view is read-only apart from refunds.
- The dashboard's "Recent sales" card gains a mono "VIEW ALL →" link to this screen.
- Add "Orders" to the studio navigation.

---

## R6 — Pricing page (screen 08, changed)

- **Remove the "À la carte prints" section.** Buyers choose prints in the lightbox (R4).
- Every plan lists its commission, in the same position:
  Solo **12%** · Studio **8%** · Atelier **4%**.
- Replace "with the lowest commissions in the business" with a claim the page can
  support: "You set the markup. We take a small commission on it — as low as 4%."
- Below the plans, add a **payout example** card (surface, radius 14): a 16 × 20″ print
  sold at $45 with a $22 print cost — Markup $23 → Solo keeps $20.24, Studio $21.16,
  Atelier $22.08. Three columns, Newsreader values, mono labels.
- Trial copy is the same everywhere: plan buttons read "Start 14-day free trial";
  onboarding reads "Free for 14 days. No card required."
- The Annual toggle shows the annual price per month and a mono "BILLED ANNUALLY" note.

---

## R7 — Client gallery (screen 09, changed)

v1 showed a check mark on every tile whether or not it was selected, mixed "select"
with "favorite", and put the photographer's "Share link" button in the client's view.

- **Favorite = the proofing pick.** Each tile has a heart button top-right
  (`FavoriteButton`). This replaces the always-visible check.
- **Selection is a mode.** A "Select" outline button in the header turns it on. In
  select mode each tile shows an empty ring; selected tiles show a filled `ink` circle
  with a white check and a 2px `ink` ring around the tile. Clicking a tile toggles it.
  Outside select mode, clicking a tile opens the lightbox.
- Selection pill actions: "Download selected", "Add to favorites", "Clear".
- **Client view** header actions: "Download all" (outline, only if `allowDownload`),
  "Submit selects" (solid). Submitting sends the favorites to the photographer and
  shows a confirmation line with the time submitted. If the photographer set a limit,
  show a mono counter: `12 OF 40 SELECTS`.
- **Photographer view** (signed-in owner) keeps "Share link" and gains "Edit expiry"
  and a read-only "Client selects" filter chip.
- An expired link shows the error state: "This gallery link has expired" with a
  "Message {photographer}" action.

---

## R8 — Analytics definitions (screens 11 and 12, changed)

The sample numbers contradicted each other. Use these definitions in the API and in
tooltips on each KPI label.

| Metric | Definition |
|---|---|
| Profile views | Visits to the portfolio page (dashboard only). |
| Photo views | A photo shown on screen for at least one second. Top of the funnel. |
| Lightbox opens | Photo opened in the lightbox. |
| Added to cart | Print added to a cart. |
| Purchases | Paid orders. |
| Conversion | Purchases ÷ photo views, for the selected range. |
| Per-frame Conv. | That frame's sales ÷ that frame's photo views. |
| Avg. order | Print revenue ÷ purchases. |

Consistent sample data: photo views 48,210 → lightbox opens 19,440 (40%) → added to
cart 2,910 (6%) → purchases 128 (0.3%). Conversion KPI **0.27%**. Avg. order $25.31.
Dashboard profile views **12.4k** (a different number from photo views). Table rows use
sales ÷ views (Northbound: 42 ÷ 8,210 = 0.5%).

---

## R9 — Tenant model and studio settings (new screen 20)

The platform is multi-tenant by host, but v1 only drew one marketplace. The split:

- **Platform host** (`blueflutes.com`): the marketplace — Discover, Search, Community,
  Chat, Collections, Pricing, Onboarding. Uses the Blueflutes tokens unchanged.
  `/portfolio/:handle` here is the photographer's profile within the marketplace.
- **Tenant host** (`{handle}.blueflutes.com` or a custom domain): that photographer's
  own site — the portfolio viewer at `/`, galleries, lightbox, client galleries, cart,
  and checkout. It is themed by the tenant's `ThemeTokens`. It does **not** show the
  marketplace nav. Its header is: studio name (heading font), gallery links, cart
  icon. Solo-plan sites show a mono "POWERED BY BLUEFLUTES" footer link.

### 20 — Studio settings (`/studio/settings/*`, `features/studio/settings/`)
Two columns `236px / 1fr`; the left rail is a section list in the Upload album-rail style.

- **Profile** — avatar, display name, handle, location, specialty chips, bio.
- **Branding** — move the existing `ThemeEditor` here (colors, heading and body font,
  gallery layout, grid columns) with a live preview and the contrast guard from R1.
- **Domain** — the subdomain is always shown. Custom domain (Studio and Atelier): enter
  a domain → show the DNS records to add (mono, with copy buttons) → "Verify" → status
  pill: Pending / Verified / Error with the reason. Solo sees the field disabled with
  an "Upgrade to Studio" link.
- **Plan & billing** — current plan card, "Change plan", invoices table, payout account
  status with "Connect payouts".
- **Notifications** — email toggles: new order, new message, client submitted selects,
  new follower.

---

## R10 — Albums are a tree; one admin shell

- The data model already nests (`nodes.parent_id`). Screen 13's flat album rail becomes
  a **tree**: 16px indent per level, chevron to expand, mono counts, lock icon for
  private. Reuse `pages/dashboard/content/NodeTree.tsx`. Actions: "New album",
  "New folder", drag a photo row onto an album to move it.
- A folder holds albums; an album holds photos. On the portfolio, top-level albums are
  the gallery chips and folders render as cover cards.
- **Retire `/dashboard/*`.** Move `GalleryManager` behavior into `/studio/upload` and
  `ThemeEditor` into `/studio/settings/branding` (R9). Redirect `/dashboard` to
  `/studio/dashboard`.

---

## R11 — Sign in and onboarding

- Onboarding step 0 and `/login` offer **"Continue with Google"** and **"Continue with
  GitHub"** only. Remove the Apple button, the OR divider, and the Email and Password
  fields — the backend does not support them.
- `/login` uses the onboarding card without the step indicator: wordmark, Newsreader
  30px "Welcome back", the two OAuth buttons, and a "New here? Create a studio" link.
  Restyle it with tokens (it currently uses the older skeleton styling).
- The handle field checks availability as the user types and shows "Available" in
  `positive` or "Taken" in `negative` under the field.

---

## R12 — Smaller fixes

- **Chat:** opening a conversation clears its unread badge.
- **Community:** remove the "Poll" composer button (no data model). Add a post detail
  view at `/community/posts/:id` that reuses the lightbox `CommentThread`; the comment
  count on a `PostCard` links to it.
- **Money:** every amount in the API is an integer in minor units (cents) with a
  `currency` code. Plan prices were whole dollars (`14`); they become `1400`. Format
  with one shared `formatMoney(amount, currency)` helper.
- **Gallery layout names:** the design said `grid | masonry | feature`; the theme schema
  says `grid | masonry | editorial`. Use the schema's names.
- **Eyebrow numbers** (`02 — SEARCH`): keep them on the marketplace host as a stylistic
  touch; omit them on tenant sites.

---

## R13 — Naming

The product is **Blueflutes** (renamed from Portfolix/PortfolioHub in June 2026). This
folder and the prototype file were renamed to match, and the screenshots were
re-captured at 1440px from the Blueflutes prototype. `PFX·` photo codes stay as they
are; they are display data, not branding.

---

## Open decisions

These were chosen as defaults so work is not blocked. Change them here if needed.

| # | Decision | Default used above |
|---|---|---|
| 1 | Solo plan commission | 12% |
| 2 | What commission applies to | The markup (sale price − print cost) |
| 3 | Tenant model | Marketplace on the platform host; own themed site per tenant host (R9) |
| 4 | Payment processor | Stripe (Checkout/Elements for payment, Connect for payouts) |
| 5 | Guest checkout | Allowed |
| 6 | Mobile Upload theme | Light, like the rest |
| 7 | Print fulfilment | Platform print partner; photographers do not ship |
