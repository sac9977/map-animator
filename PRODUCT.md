# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + TypeScript + Vite + Tailwind CSS v4 + Leaflet 1.9 (existing codebase; established stack, not a decision to make).

## Users

Travel content creators, overland/expedition vloggers, and educators who want to turn a multi-leg journey (drive, flight, trek, sail) into a cinematic animated map video for YouTube or social, without learning After Effects.

## Product Purpose

MapAnimator is a browser studio: pick curate-able waypoints on a real map, define legs (transport mode, duration, trail/vehicle styling), play the journey animation, inspect elevation and historical weather along the route, and export a rendered video (multiple aspect ratios / resolutions / FPS). Success = a viewer produces a satisfying, exportable journey animation quickly.

## Positioning

Client-side animated journey-map studio with per-leg transport choreography (vehicle drawing, road-snapped routing, GPX trek drawing), historical-en-route climate data, and direct canvas video export — no server, no timeline editor learning curve.

## Constraints

- All processing stays client-side (map tiles fetched from public tile servers; routing via public OSRM endpoints).
- Working behavior is not up for renegotiation: presets, leg editing, trek drawing, location picking, elevation profile, weather overlay, export/resolution choices, PWA install.
- Mountain/map imagery is the visual hero; UI chrome must never compete with it.

## Brand commitments (user-pinned, binding)

- Visual direction: **modern Apple/macOS-native look** — system UI feel (translucent toolbar/sidebar chrome, hairline separators, system font stack, sentence-case labels, segmented controls, sheet-style modals). The incumbent warm "Explorer Studio" cream/teal world is replaced.
- Accent: **Apple system blue** (`#007AFF` light / `#0A84FF` dark).
- Themes: **both light and dark**, shipped in this pass.
