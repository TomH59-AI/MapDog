# CLAUDE.md — MapDog Codebase Guide

## Project Overview

MapDog is a **Site Acquisition Parcel Intelligence** tool for wireless telecommunications. It helps site acquisition specialists search, evaluate, and track parcels for cell tower placement. Built as a full-stack TypeScript app on Cloudflare's edge network using the Hono framework.

**Domain**: Wireless telecom site acquisition — searching county parcel data, RF coordinate-based search rings, bulk PIN lookups, saving prospects, and exporting results.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers (Pages) |
| Framework | Hono v4 (TypeScript) |
| Database | Cloudflare D1 (SQLite) |
| Build | Vite v6 + @hono/vite-build |
| Frontend | Vanilla JS + Tailwind CSS (CDN) + Font Awesome (CDN) |
| External API | MapWise API (parcel data) |
| Deploy | Wrangler CLI → Cloudflare Pages |

## Directory Structure

```
MapDog/
├── src/
│   ├── index.tsx          # All backend routes + SSR UI (Hono app)
│   └── renderer.tsx       # HTML shell template (jsxRenderer)
├── public/static/
│   ├── app.js             # All frontend logic (vanilla JS)
│   └── style.css          # Custom styles (minimal, Tailwind handles most)
├── migrations/
│   └── 0001_initial_schema.sql  # D1 database schema
├── seed.sql               # Sample data for local dev
├── vite.config.ts         # Vite + Cloudflare Pages build config
├── wrangler.jsonc         # Cloudflare Workers/Pages config
├── tsconfig.json          # TypeScript config (ESNext, strict, Hono JSX)
├── ecosystem.config.cjs   # PM2 config (optional local dev)
├── package.json           # Dependencies and scripts
└── *.md                   # Documentation files
```

## Architecture

**Monolithic full-stack app** with clear separation:

- `src/index.tsx` — Single file containing all Hono routes: the SSR root page (JSX) and all `/api/*` REST endpoints. This is the entire backend.
- `public/static/app.js` — Single file containing all client-side logic: DOM manipulation, API calls, mode switching, CSV export, etc.
- `src/renderer.tsx` — Minimal HTML wrapper with CDN imports for Tailwind and Font Awesome.

**Key pattern**: The backend proxies all MapWise API calls server-side, keeping the API key hidden from the client. The frontend communicates exclusively via REST endpoints under `/api/`.

### API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/` | Main UI (SSR) |
| GET | `/api/parcels/search` | County-based parcel search |
| POST | `/api/parcels/coordinate-search` | RF coordinate search ring |
| POST | `/api/parcels/bulk-search` | Bulk PIN lookup (up to 50) |
| POST | `/api/parcels/save` | Save parcel to favorites |
| GET | `/api/parcels/saved` | Retrieve saved parcels |
| DELETE | `/api/parcels/saved/:id` | Delete a saved parcel |
| GET | `/api/searches/history` | Get search history (last 20) |
| GET | `/api/stats` | Dashboard statistics |

### Database Schema (D1/SQLite)

Two tables in `migrations/0001_initial_schema.sql`:

- **`searches`** — Search history log (county, params as JSON, results_count, timestamp)
- **`saved_parcels`** — Favorited parcels (parcel_id unique, county, parcel_data as JSON, notes, status, timestamps)

Indexed on: county, created_at, status, parcel_id.

### Environment Bindings

The Hono app expects these Cloudflare bindings (defined as `Bindings` type in `src/index.tsx`):

- `DB` — D1Database instance
- `MAPWISE_API_KEY` — API key for MapWise (set via `wrangler secret`)

## Development Commands

```bash
# Install dependencies
npm install

# Local dev server (Vite with hot reload)
npm run dev

# Local dev with D1 database (sandbox mode)
npm run dev:sandbox

# Build for production
npm run build

# Preview production build locally
npm run preview

# Database operations
npm run db:migrate:local   # Apply migrations to local D1
npm run db:migrate:prod    # Apply migrations to production D1
npm run db:seed            # Seed local DB with sample data
npm run db:reset           # Wipe local DB + re-migrate + re-seed

# Deploy
npm run deploy:prod        # Build + deploy to Cloudflare Pages

# Generate Cloudflare types
npm run cf-typegen
```

## Testing

There is no formal test framework. The only test script is a health check:

```bash
npm run test   # Runs: curl http://localhost:3000
```

When verifying changes manually, use these known Florida counties: `ALACHUA`, `ORANGE`, `MIAMI-DADE`.

## Code Conventions

### TypeScript / Backend
- **Strict mode** enabled in tsconfig
- JSX configured with `hono/jsx` import source (`react-jsx` mode)
- All API routes in a single `src/index.tsx` file — no separate route modules
- Input validation at every endpoint: county format (`/^[A-Z\s\-]+$/`), limit range (1-100), coordinate ranges
- D1 queries use prepared statements with `.bind()` for SQL injection prevention
- Database errors are caught but don't fail the API response (graceful degradation)
- HTTP error responses include `error`, `hint`, and `details` fields

### Frontend (Vanilla JS)
- No framework — direct DOM manipulation with `document.getElementById()` and `innerHTML`
- Global state variables: `currentResults`, `currentMode`
- Function-based architecture (not class-based)
- Three search modes: `county`, `coordinate`, `bulk` — toggled via `switchMode()`
- Key functions: `searchParcels()`, `coordinateSearch()`, `bulkSearchParcels()`, `viewSavedParcels()`, `exportResults()`

### Naming
- Files: kebab-case (`app.js`, `style.css`)
- Variables/functions: camelCase
- API routes: `/api/resource/action`
- Database: snake_case (`saved_parcels`, `search_params`)
- Counties: always uppercase, validated server-side

### Styling
- Tailwind CSS via CDN — utility classes inline in JSX
- Custom CSS in `public/static/style.css` is minimal (scrollbar, animations, print)
- No CSS build pipeline

## Important Notes for AI Assistants

1. **Single-file backend**: All routes live in `src/index.tsx`. Don't create separate route files unless explicitly asked.
2. **No test suite**: There are no unit/integration tests. If adding features, consider suggesting tests but don't add a test framework unprompted.
3. **No linter/formatter**: No ESLint or Prettier configured. Follow existing code style.
4. **CDN dependencies**: Tailwind and Font Awesome are loaded from CDNs in `renderer.tsx`, not installed via npm.
5. **D1 binding required**: The app needs a Cloudflare D1 database binding. Local dev uses `--local` flag via Wrangler. The `database_id` is not committed to `wrangler.jsonc` — it must be configured per-environment.
6. **API key is a secret**: `MAPWISE_API_KEY` is stored as a Cloudflare secret, never in source code. Local dev uses `.dev.vars` (gitignored).
7. **No Docker**: Deployment is serverless via Cloudflare Pages — no containers.
8. **Frontend is not bundled**: `public/static/app.js` is served as-is. There's no frontend build step or module system.
9. **Module type**: The project uses ES modules (`"type": "module"` in package.json).
