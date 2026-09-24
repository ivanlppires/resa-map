# CLAUDE.md

## What this is

RESA Map: map-based platform (landing page + WebGIS) for the RESA research project (UNEMAT/LAEGC). It reads, **read-only**,
the PostgreSQL of the sibling project `../resa-survey` (questions, settlements, synced surveys + responses) and renders it on a
MapLibre map with layers, filters, dashboard and exports. Copy and docs are in Brazilian Portuguese.

## Commands (run from repo root)

```bash
npm install
npm run dev          # server (tsx watch, :3100) + web (vite, :5180, proxies /api)
npm run build        # server tsc → server/dist; web → web/dist
npm start            # node server/dist/index.js (needs STATIC_DIR to serve the frontend)
```

Local data: open an SSH tunnel to the production DB (`ssh -N -L 15432:10.0.2.3:5432 root@179.197.236.155`) and use the
read-only role in `server/.env` (see `.env.example`). There is no local seed; the app has no writes.

## Architecture

- `server/` — Fastify 5. `auth.ts` = login with the resa-survey `users` table (bcrypt compare on `password_hash`, HMAC-signed
  httpOnly cookie `resa_map_session`, 30 days; `buildAuth({findUserByEmail, secret, secure})` returns `routes` + `requireAuth`
  so tests inject a fake finder — see `auth.test.ts`, run with `npm test`). `data.ts` = SQL
  loaders (postgres-js, raw SQL, no ORM). `routes.ts` = `/api/data`, `/api/stats` (public), exports (`csv|xlsx|geojson`) and
  `report.pdf`. `lib/pdf.ts`, `lib/xlsx.ts`, `lib/csv.ts` are dependency-free generators copied from resa-survey;
  `lib/report.ts` builds the aggregated territorial report (bar charts drawn with rects).
- `web/` — React 19 + Vite + Tailwind 4. `pages/LandingPage.tsx` (public), `pages/MapPage.tsx` (gate + app shell/state).
  `components/MapView.tsx` owns the MapLibre map: raster basemaps, IBGE GeoJSON layers from `public/geo/`, two survey sources
  (`surveys` plain, `surveys-cl` clustered), heatmap, selection ring, popups. All filtering/statistics happen client-side in
  `lib/filters.ts`, `lib/stats.ts`; colors in `lib/colors.ts`; placement of settlements/no-GPS interviews in `lib/geo.ts`.
- Surveys without GPS are placed in a ring around the settlement centroid and flagged `approx` (gray stroke, legend note).
  Settlement "areas" are reference circles (INCRA polygons not yet integrated).
- There is no user registration here; passwords are managed in resa-survey. All roles can use the whole platform.
- Exports take the filtered `ids` list (`?ids=1,2,3`), so server and client never need to share filter semantics.

## Conventions / gotchas

- ESM everywhere; server uses `.js` extensions on relative imports.
- Tailwind v4 preflight makes form controls inherit `color` — set text color on inputs inside dark containers.
- Municipality GeoJSON uses `promoteId: 'code'` for hover feature-state; symbol layers need the `glyphs` endpoint
  (`fonts.openmaptiles.org`), fonts used: `Open Sans Regular` / `Open Sans Bold`.
- Production runs on Coolify (LAEGC server `179.197.236.155`) from `docker-compose.yml`; the `app` service joins the
  external network `bs8x9x7vbjwvqpwnxwhvyiu1` to reach the survey DB as host `db`. See `docs/deploy.md`.
