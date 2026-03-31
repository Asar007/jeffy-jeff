# NRI Bridge India — Project Context & Guidelines

## Project Overview
**NRI Bridge India** is a specialized property management SaaS platform designed for Non-Resident Indians (NRIs) to manage their Indian properties remotely. The platform offers end-to-end services including tenant sourcing, rent collection, maintenance, and legal compliance.

## Tech Stack
- **Frontend:** HTML5, CSS3 (Vanilla CSS), Vanilla JavaScript.
- **Backend:** Google Apps Script (GAS) deployed as a Web App.
- **Database:** Google Sheets (acting as a lightweight relational database).
- **Authentication:** Simulated via `localStorage` with backend logging in Google Sheets.
- **Payments:** Integrated/Simulated payment flow (Stripe mentioned in SRS, current implementation uses a 4-step onboarding wizard).

## Directory Structure
- `/`: Root directory containing all HTML pages, CSS, and backend scripts.
- `propnri-saas-site.html`: The main landing page.
- `shared.css`: Centralized design system and styling for all pages.
- `google_apps_script.js`: Backend logic for form submissions and data handling.
- `NRI_Bridge_India_SRS.pdf`: Software Requirements Specification.
- `onboarding.html`: Multi-step property and plan setup wizard.
- `service-*.html`: Detailed pages for individual service offerings.
- `.agent/`: Internal agent configurations and rules (Antigravity Kit).

## Design System (shared.css)
The project uses an earthy, professional palette:
- **Primary Green:** `#4a6a2e` (`--green-pop`)
- **Background Deep:** `#3d3f2e` (`--bg-deep`)
- **Background Cream:** `#f2efe5` (`--bg-cream`)
- **Typography:** 
  - Headings: `Playfair Display` (Serif)
  - Body: `DM Sans` (Sans-serif)
- **Animations:** Standardized `fadeUp`, `fadeIn`, and `float` animations for high-end feel.

## Development Conventions
### 1. Shared Components
Navigation and Footers are shared across all pages. They are enclosed in comments:
- `<!-- SHARED NAV START -->` ... `<!-- SHARED NAV END -->`
- `<!-- SHARED FOOTER START -->` ... `<!-- SHARED FOOTER END -->`
*Note: When updating the Nav or Footer, ensure changes are propagated to all HTML files.*

### 2. Session Management
- User sessions are stored in `localStorage` under the key `nri_session`.
- User database (simulated) is stored in `localStorage` under `nri_users`.

### 3. Backend Integration
- The `google_apps_script.js` file handles `doPost` requests.
- Ensure the `GOOGLE_SCRIPT_URL` in HTML files matches the deployed GAS Web App URL.
- Expected Google Sheet names: `Signups`, `Logins`, `Contacts`.

## Key Workflows
- **Signup/Login:** Captures user data and redirects to onboarding or home.
- **Onboarding:** 
  1. Add Properties (City, Type, Rent, BHK).
  2. Select Plans (Bronze, Silver, Platinum) with Monthly/Annual toggles.
  3. Payment (Card, UPI, Net Banking).
  4. Review & Confirm.

## Deployment Instructions
1. **Frontend:** Host HTML, CSS, and JS files on any static hosting provider (e.g., Vercel, Netlify, GitHub Pages).
2. **Backend:**
   - Create a Google Sheet.
   - Open Extensions > Apps Script.
   - Paste `google_apps_script.js` content.
   - Deploy as Web App (Execute as "Me", Access: "Anyone").
   - Copy the Web App URL and update the `fetch()` calls in the frontend.

## Future Roadmap (from SRS)
- Implementation of a real React-based frontend (current version is a high-fidelity HTML prototype).
- Live Stripe API integration for recurring billing.
- Real-time owner dashboard with property stats.
