# Destruction timer lockout — design

**Date:** 2026-11-18  
**Status:** Approved in conversation; awaiting final spec review  
**Repo:** jeffy-jeff (NRI Bridge India static site)

## Intent

Show a huge atomic-style “destruction” countdown to month-end. While it runs, pages that load shared nav are unusable. At zero, show “goodbye” and stay there. Change must be easy to reverse.

## Goals

- Full-viewport countdown to **30 Nov 2026, 23:59:59 IST**
- Site unusable under the overlay (no clicks, scroll, or keyboard use of the page)
- At zero: display **goodbye** (no unlock, no detonation animation)
- Reversible without a painful revert: one flag or one load line

## Non-goals

- Server-side / nginx lockout
- Covering pages that do not load `nav.js` (`admin.html`, `payment.html`, `auth-callback.html`)
- Product marketing copy or bypass UI for end users
- Build-step or framework changes

## Anti-goals

- Leaving the site partially interactive under the overlay
- Scattering timer logic across many HTML files
- Hard-coding something that needs a full git revert to turn off

## Approaches considered

| Approach | Summary | Trade-off |
|----------|---------|-----------|
| **A (chosen)** | Shared `destruction-timer.js` loaded from `nav.js` | Covers nearly all public pages; admin/payment/auth-callback stay open |
| B | Dedicated lockout page + redirects | Many file edits; flash of content possible |
| C | nginx/server-only lockout | Hosting-specific; slower to reverse on static hosting |

**Chosen:** A — fits vanilla multi-page setup, minimal touch surface, easy undo.

## Design

### Files

- **Create** `destruction-timer.js` — self-contained: styles, overlay DOM, countdown tick, goodbye state, `ENABLED` flag
- **Modify** `nav.js` — one line to load the script (e.g. dynamic script inject or documented sibling include pattern already used by the site)

### Behavior

1. If `ENABLED` is false, do nothing.
2. On load, inject a fixed full-viewport overlay (`z-index` above everything), lock `body` overflow, capture pointer events, and block key input as needed so the underlying page cannot be used.
3. Tick every second toward `2026-11-30T23:59:59+05:30`.
4. Display a large atomic/destruction-style readout: remaining days plus `HH:MM:SS` (or equivalent clear remaining-time breakdown).
5. When remaining ≤ 0, replace the timer with **goodbye** and keep the overlay up.

### Reversibility

- Set `ENABLED = false` at the top of `destruction-timer.js`, **or**
- Remove the single load line from `nav.js`, **or**
- Delete `destruction-timer.js` and the load line

### Coverage

- All pages that already include `nav.js` (home, login, signup, dashboard, services, etc.)
- Explicitly out of scope: `admin.html`, `payment.html`, `auth-callback.html`

### Builder calls

- Aesthetic: dark, utilitarian “destruction timer” look (phosphor/CRT energy), not brand marketing chrome
- No secret bypass query param unless added later
- No tests beyond manual: open a few `nav.js` pages and confirm lock + countdown; confirm `ENABLED = false` restores usability
