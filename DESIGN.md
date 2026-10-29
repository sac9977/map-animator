# Design System

<!-- impeccable:design-schema 1 -->

As-built documentation of the MapAnimator UI redesign. The heart of the system is the token layer in `src/index.css`; everything else derives from it. Reference screenshots: `.design-shots/final-light.png`, `.design-shots/final-dark.png`.

## 1. Brand

- **Visual direction:** modern Apple/macOS-native. Translucent toolbar chrome, hairline separators, system font stack, sentence-case labels, segmented controls, sheet-style modals. The UI is quiet furniture around the map — mountain imagery is the hero, chrome never competes.
- **Accent:** Apple system blue — `#007AFF` light / `#0A84FF` dark. Used for the primary action (Export), selection, focus rings, and active segments — nowhere decoratively.
- **Type:** the SF/system font stack everywhere (see §4).
- **Chrome:** calm hairlines, not borders. `--hairline` (14–16% alpha) for defined edges, `--hairline2` (7–8% alpha) for subtle separators and translucent-bar bottom edges.

## 2. Token layer

Semantic colors are plain CSS variables in `:root` / `.dark` (`src/index.css`), registered into Tailwind v4 via `@theme inline`, so token utilities restyle automatically in both themes — components carry no `dark:` variants.

| Utility (Tailwind v4) | Variable | Light | Dark | Role |
|---|---|---|---|---|
| `bg-app` | `--app` | `#f5f5f7` | `#161617` | App background |
| `bg-surface` | `--surface` | `#ffffff` | `#232326` | Raised surfaces: navbar, sidebar, modals, cards |
| `bg-well` | `--well` | `#f2f2f7` | `#2c2c2e` | Inset/well surfaces: segmented tracks, header bands, sub-panels |
| `border-hairline` | `--hairline` | `rgba(0,0,0,.14)` | `rgba(255,255,255,.16)` | Primary hairline edge |
| `border-hairline2` | `--hairline-2` | `rgba(0,0,0,.07)` | `rgba(255,255,255,.08)` | Subtle separator, chrome bar borders |
| `text-ink` | `--ink` | `#1d1d1f` | `#f5f5f7` | Primary text |
| `text-ink2` | `--ink-2` | `#6e6e73` | `#a1a1a6` | Secondary text, quiet buttons |
| `text-ink3` | `--ink-3` | `#98989d` | `#6e6e73` | Tertiary/meta text, icons, placeholders |
| `bg-accent` | `--accent` | `#007aff` | `#0a84ff` | Accent; `bg-accent/10` = tinted fills |
| `bg-accent-strong` | `--accent-strong` | `#0066d6` | `#409cff` | Accent hover/pressed |
| `text-danger` | `--red` | `#ff3b30` | `#ff453a` | Destructive (Clear, delete leg) |
| `bg-mapbg` | `--mapbg` | `#e2e2e7` | `#101012` | Leaflet canvas background |

Also registered: `--font-sans` (system stack). Base layer adds `color-scheme` per theme, `.font-mono-numbers` (tabular numerals, also aliased as `.font-mono`), a 5px invisible scrollbar, accent-colored range inputs (`accent-color: var(--accent)`), a global `:focus-visible` ring (2px accent, offset 2), and `prefers-reduced-motion` freeze rules. Leaflet chrome (zoom control, attribution) is re-themed onto the same variables, and native `select`/date popups inherit `color-scheme`.

## 3. When to use which

| Situation | Token |
|---|---|
| Page/window background | `bg-app` |
| Toolbar, sidebar, modal sheet, card | `bg-surface` (+ `bg-surface/80 backdrop-blur-xl` for floating bars) |
| Inset group, segmented track, header band, nested sub-panel | `bg-well` |
| Card outline, modal border, defined edge | `border-hairline` |
| Separator under a floating bar, hairline dividers | `border-hairline2` |
| Body/title text · labels · meta | `text-ink` · `text-ink2` · `text-ink3` |
| Primary CTA, selected segment, active toggle | `bg-accent` / `text-accent`; tint via `bg-accent/10` |
| Accent hover | `bg-accent-strong` |
| Destructive affordance | `text-danger` + `hover:bg-danger/10` |

## 4. Type & iconography

- **Font:** `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, "Helvetica Neue", sans-serif`, antialiased. Body scale is compact: 13px UI text, 11–12px labels, 10px micro-labels, sentence case throughout.
- **Numbers:** `.font-mono-numbers` (tabular numerals) on all telemetry — timecode readouts, scrubber leg labels, distances, durations, coordinates, color hex.
- **Icons:** lucide monoline, `strokeWidth={1.9}` (2.5 only for checkmarks in primary buttons), sized `w-4 h-4` in bars, `w-3.5 h-3.5` inline, `w-3 h-3` meta.
- **Transport mode tiles:** two-row tile grids (5 + 4) inside a `bg-well p-1 rounded-lg` track; each tile is an 18px icon (`strokeWidth 1.9`) over a 10px label, `rounded-[7px]`; selected = solid `bg-accent text-white`, unselected = `text-ink2 hover:bg-hairline2/40`.

## 5. Component patterns

- **Translucent bars:** navbar and timeline footer are 52px / 64px `bg-surface/80 backdrop-blur-xl` with `border-hairline2` edges; quiet buttons are 13px `text-ink2 hover:text-ink hover:bg-hairline2` with icon+label; Export is the only solid-accent control (`bg-accent hover:bg-accent-strong`).
- **Compact leg card rows:** collapsed legs are one quiet row — a 24px numbered tile (`bg-well`, accent when selected), destination in 13px `text-ink`, origin + duration in 10px `text-ink3 font-mono-numbers`, trash icon that turns `text-danger` on hover. Selected expands inline into editing sections (no separate editor view).
- **Quiet rows with affordance:** nested selectors (vehicle icon, etc.) are full-width `bg-well` rows whose title gains `group-hover:text-accent` and a right-aligned `ChevronRight` that brightens on hover — the standard "tap to open" affordance.
- **Single-row elevation toolbar:** elevation profile keeps its controls in one strip — icon + "Elevation" title, Leg/Route segmented toggle, inline telemetry stats, GPX dropdown, unit toggle, expand/collapse — all quiet `hover:bg-hairline2` controls, with `bg-black/85` HUD tooltips above the chart.
- **Segmented speed control:** `bg-well p-0.5 rounded-md` track, 11px `font-mono-numbers` options; selected option lifts to `bg-surface` with a 1px shadow (macOS segmented style). Same pattern at 12px in WeatherOverlay with a `border-hairline` edge.
- **Modal header pattern:** every modal opens with a `bg-well` header band containing (a) an accent icon tile — solid `bg-accent text-white` or tinted `bg-accent/10 text-accent` — (b) bold title + 11–12px `text-ink2` subtitle, and (c) right-aligned header action(s) + quiet close `X`. Sheets are `bg-surface border-hairline rounded-lg shadow-2xl` over `bg-black/60 backdrop-blur-xs` scrims, animated with `animate-in fade/zoom-in-95`, focus-trapped via `useModalA11y`.
- **Well/raised rhythm:** wells inset content within a surface; a selected leg or preset card stays on the surface and earns attention with `ring-2 ring-accent/50` or `hover:border-accent`, not new fill colors.

## 6. Dark theme

- `index.html` runs a pre-paint inline script: reads `localStorage['mapanimator-theme']` (falling back to `prefers-color-scheme`), adds `.dark` to `<html>` before first paint — no flash. The Navbar ThemeToggle flips the class and re-persists that key; `color-scheme` follows so native controls and scrollbars match. `<meta name="theme-color">` is declared per `prefers-color-scheme` for the PWA.
- Components need no `dark:` variants — they only reference semantic tokens. The one dark-only visual rule is the map: `.dark .leaflet-tile-pane` dims tiles (`brightness(0.78) contrast(1.06) saturate(0.82)`) so the imagery shares one world with the dark chrome; the cinematic hillshade pane drops to `opacity 0.5`, and the overlay tint swaps to a cool dark radial.
- Map HUD tooltips (elevation hover, weather readouts) sit on `bg-black/85 text-white` with `border-white/15` — deliberately theme-independent, since they float above imagery in both themes.

## 7. Intentional exceptions (do NOT "fix")

These are exported-video content or data visualization, not UI chrome — they stay on their own palettes regardless of theme:

- **Map canvas content:** vehicle sprites, traveler icons, and palette arrays in `travelerIcons.tsx`, `vehicleDrawers.ts`, `trailStyles.ts`, `presetJourneys.ts`. They are painted into the exported video and must look identical in light and dark.
- **Rainbow custom-color swatches** in the trail/vehicle color pickers (Sidebar, IconPickerModal): user-facing color choices, not themed surfaces.
- **Weather chart series colors** in WeatherOverlay: data encoding, not decoration.
- **MapLayer copy describing the map palette** (e.g. "Cinematic Voyager", Cartography Themes subtitles): describes map cartography, which is intentionally outside the token system.
- In-theme status tints that read against wells (e.g. emerald "GPX" badge, amber trek accents) are also kept as-is — they mark data provenance, not chrome.

## 8. Checklist for new UI

1. Use only semantic tokens (`bg-surface`, `text-ink2`, `border-hairline2`, …) — no raw hex in chrome, no `dark:` variants.
2. 13px sentence-case labels, lucide `strokeWidth 1.9`, `font-mono-numbers` on any number that updates.
3. Wells for insets, surface for shells, accent only for selection/action, danger only for destructive.
4. New floating surfaces: `bg-surface/80 backdrop-blur-xl` + `border-hairline2`; new modals: the header pattern in §5.
5. Verify both themes — if it needs a screenshot check, compare against `.design-shots/final-*.png`.
