# Rebrand: Athletic Terminal (Identity + Chrome First) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Replace UFD's gilded-shield + sport-colored-bar identity with the locked "Athletic Terminal" brand (electric-lime accent on cool near-black, Space Grotesk + Inter + JetBrains Mono, the new UFD logo/favicon assets), and restyle the My Team + Players surfaces to match. Chrome is global; other page bodies keep current styling until a later rollout. Local only, branch `redesign/my-team-first`.

**Verification model:** This is a visual rebrand, not logic. Each task verifies with `npm run build` (must succeed), `npm run type-check` (no new errors beyond the 4 known pre-existing: yahoo-daily-stats-methods.ts, DraftPage.vue, HistoryPage.vue, MatchupsPage.vue), `npm test` (still 32), and a dev-server visual check. No new unit tests required.

**Locked brand values:**
- Palette: Canvas #0B0E13, Panel #12161F, Border #222835, Text #E6EAF2, TextSecondary #A6AEC0, Muted #8A93A6, **Electric Lime #C6FF3A** (rgb 198,255,58), Warning Amber #F2B33A, Alert Red #FF5C5C.
- Fonts: Space Grotesk (display/headings/logo-type), Inter (UI/body, default), JetBrains Mono (tabular numbers).
- Assets (already in `src/assets/brand/`): ufd-primary-dark.png (dark tile, white "UFD_"), ufd-primary-light.png, ufd-primary-lime.png (lime tile), ufd-masthead.png, ufd-icon-dark.png, ufd-icon-light.png, ufd-icon-lime.png.

---

## Task 1: Stage assets + retheme tokens, palette, fonts (foundation)

**Files:** copy assets to `public/brand/`; `index.html`; `tailwind.config.js`; `src/style.css`.

- [ ] **Step 1: Put root-referenceable copies in public/**
```bash
mkdir -p public/brand && cp src/assets/brand/*.png public/brand/
ls public/brand/
```

- [ ] **Step 2: Fonts + favicon + title in `index.html`**
- In `<head>`, add before the existing favicon line:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet" />
<meta name="theme-color" content="#0B0E13" />
```
- Replace the favicon line `<link rel="icon" type="image/png" href="/UFD_V8.png" />` with:
```html
<link rel="icon" type="image/png" href="/brand/ufd-icon-lime.png" />
<link rel="apple-touch-icon" href="/brand/ufd-icon-lime.png" />
```

- [ ] **Step 3: Tailwind tokens + fonts in `tailwind.config.js`**
- Update `theme.extend.colors.dark` to the brand palette and add accent semantics; keep `primary` as the CSS var:
```javascript
colors: {
  primary: 'var(--color-primary, #C6FF3A)',
  accent: 'var(--color-primary, #C6FF3A)',
  warn: '#F2B33A',
  alert: '#FF5C5C',
  dark: {
    bg: '#0B0E13',
    elevated: '#12161F',
    elevatedSoft: '#181D29',
    card: '#12161F',
    cardHover: '#181D29',
    border: '#222835',
    text: '#E6EAF2',
    textSecondary: '#A6AEC0',
    textMuted: '#8A93A6'
  }
}
```
- Add `fontFamily` to `theme.extend`:
```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
  display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
}
```

- [ ] **Step 4: Accent + body font in `src/style.css`**
- Change `:root` vars:
```css
:root {
  --color-primary: #C6FF3A; /* Electric Lime — the active edge */
  --color-primary-rgb: 198, 255, 58;
}
```
- Ensure the app body defaults to Inter (add if not present, scoped to not fight LandingPage's Barlow):
```css
body { font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
```
- IMPORTANT: search the codebase for any place that overrides `--color-primary` per sport at runtime (e.g. App.vue setting it from `sportColor`). If found, neutralize it so the accent stays Electric Lime regardless of sport. Quote what you find in the report.

- [ ] **Step 5: Verify**
- `npm run build` succeeds; `npm test` = 32; `npm run type-check` no new errors. Run `npm run dev`, load the app: fonts should be Inter/Space Grotesk, accent elements lime. Don't worry yet that the bar is still sport-colored (Task 2).
- Commit: `feat(rebrand): athletic-terminal palette, fonts, accent token, favicon`

---

## Task 2: Top bar / chrome restyle (App.vue)

**Files:** `src/App.vue` (header nav ~387-391, top strip ~135-147, tabs ~622-639, logo ~411/434/828, league switcher, gear).

- [ ] **Step 1: Kill the sport-colored bar**
- The nav element (~387-391) sets `:style="{ background: sportColor, ... }"`. Change the background to the dark panel token (`#12161F` / `dark.elevated`), independent of sport. Keep the height/scroll behavior. Apply to both scrolled and unscrolled states. The top strip (~135) is already `#0a0c14` — align it to `#0B0E13` (canvas) or leave.
- `sportColor` may still be used for a small sport-label accent (top strip "FANTASY BASEBALL"); that small colored label is fine to keep. Only the full-bar background changes to dark.

- [ ] **Step 2: Retheme the nav tabs (~622-639)**
- Tab container `bg-black/30 rounded-full` → keep (reads fine on dark). 
- Active regular tab: change `bg-white text-gray-900 shadow-md` → `bg-primary text-dark-bg shadow-md` (lime pill, dark text).
- Inactive regular tab: `text-white hover:bg-white/15` → `text-dark-textSecondary hover:text-dark-text hover:bg-white/10`.
- "Ultimate Tools" (isUltimate): replace the gold/orange gradient. Active → `bg-primary text-dark-bg shadow-md`; inactive → `text-primary border border-primary/50 hover:bg-primary/15`. (Kill `from-yellow-500 to-orange-500` and `text-yellow-300`.)
- Mobile menu equivalents (~855-858): same retheme (lime instead of gold/white).

- [ ] **Step 3: Swap the header logo**
- Header nav logo (~411) `<img src="/UFD_V8.png" ...>` → `src="/brand/ufd-primary-dark.png"`. Keep the responsive height bindings but cap so the tile reads ~40px tall when unscrolled, ~32px scrolled (a tile logo shouldn't be 82px). Adjust the inline height style accordingly (e.g. 40px / 32px).
- Mobile logo (~434) and mobile-menu header logo (~828): same swap to `/brand/ufd-primary-dark.png`, sized appropriately.
- (Leave the landing-page header logo at ~12 and free-tools header at ~52 for now — those are separate surfaces in the rollout; only swap if trivial and on-brand. If unsure, leave and note.)

- [ ] **Step 4: Verify**
- `npm run build` + `npm run dev`. The top bar is now dark (not red/sport), the active tab is lime, "Ultimate Tools" is lime-outline not gold, and the header shows the new UFD logo. Type-check/tests unchanged.
- Commit: `feat(rebrand): dark terminal top bar, lime active tabs, new header logo`

---

## Task 3: Footer + share-card logo swaps

**Files:** `src/components/AppFooter.vue` (~9); `src/views/MatchupsView.vue` (~3033); `src/components/UnifiedHomeComponent.vue` (~3763, ~4146).

- [ ] **Step 1: Footer logo**
- AppFooter (~9) `<img src="/UFD_V8.png" ...>` → `/brand/ufd-primary-dark.png`. Keep the tagline text as-is for now.

- [ ] **Step 2: Share-card logos**
- The programmatic fetches of `/UFD_V8.png` in MatchupsView (~3033) and UnifiedHomeComponent (~3763, ~4146) generate share images. Update those path strings to `/brand/ufd-primary-dark.png` (or `/brand/ufd-icon-lime.png` if a square mark fits the card better — pick what suits the card layout) so shared cards aren't stamped with the old shield. Only change the path string; do not alter the canvas logic.

- [ ] **Step 3: Verify**
- `npm run build`; load footer (new logo). Generate a share card if easy, else visually confirm the path is valid. Commit: `feat(rebrand): new logo in footer + share cards`

---

## Task 4: Restyle My Team (MyTeamView.vue)

**Files:** `src/views/MyTeamView.vue`, `src/components/myteam/SituationStrip.vue`, `src/components/myteam/ActionFeed.vue`.

Apply the athletic-terminal treatment (reference the in-context mock from the brand board: verdict-first, mono numbers, lime edge):
- [ ] **Step 1: Type + numbers**
- Page `<h1>` and section headings → `font-display` (Space Grotesk).
- All numbers (record, the `#9/12` rank, category ranks, "12th") → `font-mono` with `tabular-nums`. Make the rank prominent.
- SituationStrip: make it a confident identity row, team name in `font-display`, record + rank in `font-mono`, the rank emphasized in lime (`text-primary`).
- ActionFeed: weakness severity dots stay (red/amber); "Your edge" rows use lime (`text-primary`) for the headline number; keep the existing focus ring / a11y.

- [ ] **Step 2: Verify**
- `npm run dev`, open My Team on the live Yahoo baseball league: headings in Space Grotesk, numbers monospaced/tabular, lime on rank + edge. `npm test` still 32, type-check clean. Commit: `feat(rebrand): My Team in athletic-terminal type + lime accents`

---

## Task 5: Restyle Players (PlayersView.vue)

**Files:** `src/views/PlayersView.vue`, `src/components/players/AddCard.vue`.

- [ ] **Step 1: Type + numbers**
- Page `<h1>` + the "Adds for X" section headings → `font-display`.
- AddCard: the stat value + label → `font-mono tabular-nums`, the value emphasized (bright/lime for the targeted category). Player name in `font-sans` (Inter) semibold. Keep rows compact.

- [ ] **Step 2: Verify**
- `npm run dev`, open Players: headings Space Grotesk, stat values monospaced, lime emphasis. Build + type-check + tests green. Commit: `feat(rebrand): Players in athletic-terminal type + lime accents`

---

## Task 6: Final gate

- [ ] `npm test` → 32 pass.
- [ ] `npm run type-check` → only the 4 known pre-existing errors.
- [ ] `npm run build` → succeeds. DO NOT deploy/push.
- [ ] `npm run dev` final visual pass: top bar dark + lime, new logo + favicon, My Team + Players restyled. Commit any remainder.

---

## Notes
- Local only; no push, no `vercel --prod`.
- Scope = chrome (global) + My Team + Players. Other page bodies keep current styling and will look transitional against the new bar until a later rollout (accepted).
- The accent swap (green→lime) re-accents the whole app via the CSS var; pages with hardcoded `#22c55e` greens (not the token) will stay green until rolled out — note any obvious ones.
- Do NOT touch LandingPage.vue's scoped Barlow fonts (separate surface).
- Do NOT add any dependency on `src/editorial/`.
