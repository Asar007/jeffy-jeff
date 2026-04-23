# NRI Bridge India

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
| `supabase-client.js` | Supabase init, auth state listener, role detection (`getUserRole()`), dual-write to `clients` table |
| `nav.js` | Shared nav injected into all pages; handles logged-in/out state, role-aware menu items |
| `footer.js` | Shared footer injected into all pages |
| `shared.css` | Full design system — CSS variables, typography, components, page-specific styles |
| `google_apps_script.js` | GAS backend — deploy separately in Google Apps Script editor |
| `invoice-generator.js` | Client-side PDF invoice generation via html2pdf.js |
| `admin.html` | Founder/admin portal — clients, tasks, disputes, payments, employees (Team section) |
| `dashboard.html` | Client dashboard — services, payments, documents, task updates timeline |
| `employee.html` | Employee portal — assigned tasks, post updates, upload proof photos |
| `employee-signup.html` | Public employee onboarding — KYC form (ID doc, address proof, skills, city) |
| `login.html` | Auth page with role-based redirect (admin → admin.html, employee → employee.html, client → landing) |

## Shared Components Pattern

Nav and footer are JS-injected, not HTML includes. Every page has:
```html
<nav></nav>
<script src="nav.js"></script>
<!-- ... page content ... -->
<footer></footer>
<script src="footer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase-client.js"></script>
```

Changing nav/footer only requires editing `nav.js` / `footer.js`.

## Authentication & Roles

- **Supabase Auth** with email/password and Google OAuth.
- `supabase-client.js` listens to `onAuthStateChange` and syncs to `localStorage` key `nri_session`.
- After OAuth, users missing `phone`/`country` metadata are redirected to `complete-profile.html`.

### Role System

Three user types with role detection in `supabase-client.js`:

| Role | Detection | Portal |
|------|-----------|--------|
| **Admin** | Email in `ADMIN_EMAILS` array (hardcoded in `nav.js` and `supabase-client.js`) | `admin.html` |
| **Employee** | Row in `employees` table matching auth email; status prefix: `employee-approved`, `employee-pending`, `employee-rejected`, `employee-suspended` | `employee.html` (status-gated) |
| **Client** | Default — any authenticated user not admin or employee | `dashboard.html` |

- `getUserRole()` — async, returns cached role from `sessionStorage.nri_role`
- `homePathForRole(role)` — maps role to landing page
- `nav.js` adapts menu items per role (employees see "My Work" instead of "Dashboard"/"Services")

## Supabase Schema

Migrations live in `supabase/migrations/`. Key tables:

| Table | Purpose |
|-------|---------|
| `clients` | Client profiles (name, email, country, city, services[], status) |
| `tasks` | Service tasks with status, progress %, deadline, `assigned_employee_email`, `current_step` (pipeline stepper state) |
| `task_updates` | Proof-of-work timeline — note, status, progress, photos[], author info |
| `task_update_acks` | Client acknowledgments/concerns on task updates |
| `employees` | Employee profiles — KYC fields (id_doc_path, address_doc_path), skills[], city, pin_code, status |
| `disputes` | Client-raised disputes with attachments |
| `payments` | Payment records with Razorpay integration |

### Storage

Uses Supabase Storage `documents` bucket (private, 5 MB cap per file):
- Client documents: `<email>/...`
- Employee KYC: `employees/<email>/id-<ts>-<name>`, `employees/<email>/address-<ts>-<name>`
- Task update photos: `task-updates/<taskId>/<ts>-<name>`

## Design System (shared.css)

- **Palette**: Earthy greens — `--green-pop: #4a6a2e`, `--bg-deep: #3d3f2e`, `--bg-cream: #f2efe5`
- **Typography**: `Playfair Display` (headings), `DM Sans` (body) — loaded from Google Fonts
- **Animations**: `fadeUp`, `fadeIn`, `float` keyframes
- **Naming**: Page-specific styles use body class prefixes:
  - `.dash-*` — client dashboard
  - `.adm-*` — admin portal
  - `.emp-*` — employee portal
  - `.auth-*` — login/signup pages

## Admin Portal Sections (admin.html)

Sidebar navigation with section switching via `data-section` attributes:
- **Overview** — KPI cards, recent activity
- **Clients** — table with status filters, detail modal, add client
- **Tasks** — table with Client, Service, Assigned To, Status, Progress, Deadline columns; assignee dropdown (approved employees sorted by skill match) in task detail modal; search includes employee name/email
- **Disputes** — dispute management with resolution workflow
- **Payments** — payment records and invoice generation
- **Team** — employee management:
  - Status filter tabs (All / Pending / Approved / Rejected / Suspended)
  - Employee table with KYC doc viewer (signed URLs)
  - Approve / Reject (with reason) / Suspend actions
  - Add Employee modal (admin-initiated, auto-approved)
- **Analytics** — KPI charts and data visualization

## Employee Portal (employee.html)

- Status gate: only `employee-approved` sees the task list; other statuses show a status screen
- Task cards with: client name, service label, ETA, status badge, progress bar
- Task update timeline (reuses `task_updates` table pattern from admin)
- Post Update form: note, status dropdown, progress slider, multi-file photo picker
- Mark Done shortcut: sets task complete + posts final update

## Client Dashboard (dashboard.html)

- Service cards with task status, progress, ETA (from task deadline)
- "Handled by" pill on each card — resolves `assigned_employee_email` → employee name + phone via async lookup against `employees` table
- Task updates timeline with employee name + phone display
- Acknowledge / Raise Concern flow on each update
- Dispute center, payment history, document management

## Employee–Task Assignment Flow

End-to-end data flow across the three portals:

1. **Employee signs up** (`employee-signup.html`) → creates auth user + inserts `employees` row with `status='pending'`
2. **Admin approves** (`admin.html` Team section) → sets `status='approved'`, records `approved_at`/`approved_by`
3. **Admin assigns** (`admin.html` Task edit modal) → picks employee from dropdown (approved, skill-sorted) → saves `tasks.assigned_employee_email`
4. **Employee sees tasks** (`employee.html`) → queries `tasks` where `assigned_employee_email = me.email`; posts updates to `task_updates`
5. **Client sees assignment** (`dashboard.html`) → "Handled by [Name · Phone]" pill on service card; ETA from `tasks.deadline`; update timeline shows employee author info

Assignment is linked by email string (`tasks.assigned_employee_email` → `employees.email`), not by UUID foreign key.

## Service Pages

All `service-*.html` files follow the same template structure. Categories:
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

## Supabase Migrations

Apply migrations with:
```bash
supabase db push
```

Migration files are in `supabase/migrations/` and are idempotent (use `IF NOT EXISTS` / `DROP POLICY IF EXISTS`).

## Google Apps Script Deployment

1. Create a Google Sheet
2. Extensions → Apps Script → paste `google_apps_script.js`
3. Deploy as Web App (Execute as "Me", Access "Anyone")
4. Update `GOOGLE_SCRIPT_URL` in the HTML files that POST to it
