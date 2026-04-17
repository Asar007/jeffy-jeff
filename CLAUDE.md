# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NRI Bridge India** is a property/life management SaaS for Non-Resident Indians (NRIs). It's a static HTML site (no build step, no bundler) with Supabase as the backend and Google Apps Script as a secondary data sink.

## Architecture

- **Frontend**: Vanilla HTML5/CSS3/JS — no framework, no npm. Each page is a standalone `.html` file.
- **Backend (primary)**: Supabase (auth, Postgres, storage). Client initialized in `supabase-client.js` via the CDN `supabase.createClient()`.
- **Backend (secondary)**: Google Apps Script (`google_apps_script.js`) — receives form POSTs and writes to Google Sheets (`Signups`, `Logins`, `Contacts`, `Onboarding`, etc.).
- **Hosting**: Dockerized with `nginx:alpine` — just serves static files on port 80.

## Key Files

| File | Purpose |
|------|---------|
| `propnri-saas-site.html` | Main landing page |
| `index.html` | Redirect router (auth callbacks → `auth-callback.html`, else → landing) |
| `supabase-client.js` | Supabase init, auth state listener, dual-write to `clients` table |
| `nav.js` | Shared nav injected into all pages; handles logged-in/out state, admin detection |
| `footer.js` | Shared footer injected into all pages |
| `shared.css` | Full design system — CSS variables, typography, components, page-specific styles |
| `google_apps_script.js` | GAS backend — deploy separately in Google Apps Script editor |
| `invoice-generator.js` | Client-side PDF invoice generation via html2pdf.js |
| `admin.html` | Founder/admin portal with sidebar nav, reads from Supabase tables |
| `dashboard.html` | User dashboard — services, payments, documents |

## Shared Components Pattern

Nav and footer are **not** HTML includes — they're JS-injected. Every page has:
```html
<nav></nav>
<script src="nav.js"></script>
<!-- ... page content ... -->
<footer></footer>
<script src="footer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-client.js"></script>
```

Changing nav/footer only requires editing `nav.js` / `footer.js` — no need to touch individual HTML files.

## Authentication

- **Supabase Auth** with email/password and Google OAuth.
- `supabase-client.js` listens to `onAuthStateChange` and syncs to `localStorage` key `nri_session`.
- After OAuth, users missing `phone`/`country` metadata are redirected to `complete-profile.html`.
- Admin emails are hardcoded in `nav.js` (`ADMIN_EMAILS` array) — admin link shows for those users.

## Supabase Schema

Migrations live in `supabase/migrations/`. Key tables: `clients`, `disputes`, plus dashboard-related tables. Config in `supabase/config.toml`.

## Design System (shared.css)

- **Palette**: Earthy greens — `--green-pop: #4a6a2e`, `--bg-deep: #3d3f2e`, `--bg-cream: #f2efe5`
- **Typography**: `Playfair Display` (headings), `DM Sans` (body) — loaded from Google Fonts
- **Animations**: `fadeUp`, `fadeIn`, `float` keyframes
- **Naming**: Page-specific styles use body class prefixes (e.g., `.dash-page`, `.adm-page`)

## Service Pages

All `service-*.html` files follow the same template structure. Service categories:
- **Home Management**: tenant, rent, maintenance, inspection, lease, utility, legal compliance
- **Vehicle Management**: servicing, selling, registration, parking, insurance, fitness
- **Parental Care**: doctor, medicine, emergency, companion, wellbeing, health checkup
- **Legal**: power of attorney, property registration, will/succession, tax, court monitoring, government docs

## Development

No build step. To run locally:
```bash
# Option 1: Any static file server
npx serve .
# or
python -m http.server 8000

# Option 2: Docker
docker build -t nri-bridge .
docker run -p 80:80 nri-bridge
```

## Google Apps Script Deployment

1. Create a Google Sheet
2. Extensions → Apps Script → paste `google_apps_script.js`
3. Deploy as Web App (Execute as "Me", Access "Anyone")
4. Update `GOOGLE_SCRIPT_URL` in the HTML files that POST to it
