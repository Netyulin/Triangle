# Design System — Triangle

## Product Context
- **What this is:** Chinese software/tools/game download site with AdSense + CPS monetization
- **Who it's for:** Tech-savvy users, geeks, tool enthusiasts
- **Space/industry:** Download站 / 工具聚合
- **Project type:** Content site with app-like sections (downloads, listings)

---

## Aesthetic Direction
- **Direction:** Clean Tech — muted blue accent, slate neutrals, glass-morphism light panels
- **Decoration level:** Minimal — typography and whitespace do the work
- **Mood:** Professional, trustworthy, efficient. Not flashy. Feels like a tool worth bookmarking.
- **Reference:** Vercel dashboard, Linear, Raycast — the "serious tool" aesthetic

---

## Typography

| Role | Font | CDN / Loading | Fallback |
|------|------|---------------|----------|
| **Display / Hero** | Geist | `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap` | system-ui |
| **Body / UI** | Geist Sans | `https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap` | system-ui |
| **Code / Data** | JetBrains Mono | `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap` | monospace |

**Scale (in `rem`, base 16px):**
```
text-xs:   0.75rem  / 12px  — labels, captions
text-sm:   0.875rem / 14px  — secondary text, metadata
text-base: 1rem     / 16px  — body text
text-lg:   1.125rem / 18px  — emphasized body
text-xl:   1.25rem  / 20px  — card titles
text-2xl:  1.5rem   / 24px  — section headings
text-3xl:  1.875rem / 30px  — page headings
text-4xl:  2.25rem  / 36px  — hero headings
text-5xl:  3rem     / 48px  — marketing hero (rare)
```

**Line height**: body `1.6`, headings `1.2`, mono `1.5`
**Letter spacing**: headings `-0.02em`, body `0`, labels `0.04em`

---

## Color

**Light mode:**
```
--background:   244 247 251  (near-white with cool tint)
--foreground:   15 23 42     (near-black slate)
--surface:      255 255 255  (card/panel background)
--primary:      11 18 32     (dark for contrast buttons)
--secondary:    234 240 248  (tinted gray)
--accent:       14 165 233   (sky blue — trust, tech)
--accent-hover:  2 132 199   (darker sky on hover)
--muted:        238 243 249  (subtle backgrounds)
--muted-foreground: 100 116 139 (secondary text)
--border:       215 225 237  (light gray)
--card:         255 255 255
```

**Dark mode:**
```
--background:   7 17 31      (deep navy)
--foreground:   232 240 251  (off-white)
--surface:      15 28 46      (slightly lighter navy)
--primary:      223 234 255  (light text on dark)
--secondary:    19 36 58      (dark panel)
--accent:       56 189 248    (brighter sky for dark bg)
--accent-hover: 14 165 233
--muted:        16 32 51
--muted-foreground: 142 163 189
--border:       32 50 74      (subtle navy border)
--card:         12 23 40
```

**Semantic:**
```
--success: 16 185 129  (emerald-500)
--warning: 245 158 11   (amber-500)
--error:   239 68 68   (red-500)
--info:    59 130 246   (blue-500)
```

---

## Spacing

**Base unit**: 4px
**Density**: Comfortable — this is a content site, not a dense dashboard

| Token | Value | Usage |
|-------|-------|-------|
| `space-2xs` | 2px | Icon gaps |
| `space-xs` | 4px | Tight inline |
| `space-sm` | 8px | Component internal |
| `space-md` | 16px | Standard gap |
| `space-lg` | 24px | Section internal |
| `space-xl` | 32px | Section gap |
| `space-2xl` | 48px | Page section |
| `space-3xl` | 64px | Hero spacing |

---

## Border Radius — **Consolidated (Critical Fix)**

| Token | Value | Usage |
|-------|-------|-------|
| `radius-sm` | 6px | Inputs, badges, small chips |
| `radius-md` | 12px | Buttons, dropdowns, small cards |
| `radius-lg` | 16px | Cards, panels, modals |
| `radius-xl` | 20px | Hero cards, featured panels |
| `radius-full` | 9999px | Pills, avatars, toggles |

**Replaces ALL magic numbers**: `rounded-xl` → `radius-lg`, `rounded-2xl` → `radius-xl`, `rounded-[28px]` → `radius-xl`, `rounded-[30px]` → `radius-xl`.

---

## Motion

**Approach**: Minimal-functional — transitions aid comprehension, never distract

| Type | Duration | Easing |
|------|----------|--------|
| Micro (hover) | 150ms | ease-out |
| State change | 200ms | ease-in-out |
| Panel open | 250ms | ease-out |
| Page transition | 300ms | ease-in-out |

**No**: entrance choreography, scroll-linked animations, bouncing, loading spinners (use skeleton)

---

## Layout

- **Max content width**: 1200px
- **Grid**: 12-column, 24px gutter
- **Border radius on panels**: `radius-lg` (16px)
- **Border radius on nested elements**: `radius-sm` (6px) or `radius-md` (12px)
- **Shadow budget**: Subtle only — `shadow-sm` on cards, `shadow-md` on hover. No `shadow-xl` on page load elements.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-09 | Initial design system created | Clean tech aesthetic with Geist + JetBrains Mono |
| 2026-04-09 | Border radius consolidated to 4 tiers | Replaces chaotic mix of rounded-xl/2xl/[28px] |
| 2026-04-09 | Background hero-glow reduced opacity | Reduces AI-generated feel |
