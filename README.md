# NRI Bridge India

NRI Bridge India is a comprehensive property and life management SaaS platform designed specifically for Non-Resident Indians (NRIs) to manage their Indian properties, vehicles, parental care, and legal documentation remotely — all from a single, intuitive dashboard.

![NRI Bridge India](NRI-BRIDGE-INDIA_LOGO-WHITE-PNG.png)

## Features

NRI Bridge India offers a comprehensive suite of services across four main categories:

### 🏠 Home Management
- Tenant Sourcing & Acquisition
- Rent Collection & Management
- Property Maintenance
- Property Inspection
- Lease Renewal
- Utility Management
- Legal Compliance

### 🚗 Vehicle Management
- Vehicle Servicing
- Vehicle Selling
- Registration Services
- Parking Management
- Insurance Management
- Fitness Certification

### 👨‍👩‍👧 Parental Care
- Doctor Appointments
- Medicine Delivery
- Emergency Response
- Companion & Caretaker Services
- Wellbeing Check-ins
- Health Checkups

### ⚖️ Legal Services
- Power of Attorney
- Property Registration
- Will & Succession Planning
- Tax Filing Assistance
- Court Monitoring
- Government Document Processing

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (no framework, no build step)
- **Backend**: Google Apps Script (deployed as Web App)
- **Database**: Google Sheets (lightweight relational database)
- **Authentication**: Supabase Auth (email/password + Google OAuth)
- **Hosting**: Dockerized with nginx:alpine

## Quick Start

### Option 1: Any Static File Server
```bash
# Using npx
npx serve .

# Or using Python
python -m http.server 8000
```

### Option 2: Docker
```bash
docker build -t nri-bridge .
docker run -p 80:80 nri-bridge
```

## Project Structure

```
/workspace/project/jeffy-jeff
├── propnri-saas-site.html    # Main landing page
├── index.html                # Redirect router
├── login.html                # User login
├── signup.html               # User registration
├── dashboard.html            # User dashboard
├── admin.html                # Admin portal
├── onboarding.html           # Multi-step onboarding wizard
├── payment.html              # Payment processing
├── quote-builder.html        # Custom quote generator
├── services.html             # Services listing
├── account.html              # Account settings
├── contact.html              # Contact form
├── shared.css                # Centralized design system
├── nav.js                    # Shared navigation
├── footer.js                 # Shared footer
├── supabase-client.js        # Supabase client initialization
├── google_apps_script.js     # Backend Google Apps Script
├── invoice-generator.js      # PDF invoice generation
├── service-*.html            # Individual service pages (30+ files)
├── supabase/                 # Supabase configuration & migrations
└── docs/                     # Documentation & planning files
```

## Design System

The project uses a cohesive earthy color palette:

- **Primary Green**: `#4a6a2e` (--green-pop)
- **Background Deep**: `#3d3f2e` (--bg-deep)
- **Background Cream**: `#f2efe5` (--bg-cream)

**Typography**:
- Headings: Playfair Display (Serif)
- Body: DM Sans (Sans-serif)

## Configuration

### Supabase Setup
1. Create a Supabase project
2. Configure authentication (email/password + Google OAuth)
3. Set up database tables: `clients`, `disputes`, and dashboard-related tables
4. Update `supabase-client.js` with your project credentials

### Google Apps Script Setup
1. Create a Google Sheet
2. Extensions → Apps Script
3. Paste the contents of `google_apps_script.js`
4. Deploy as Web App (Execute as "Me", Access: "Anyone")
5. Update `GOOGLE_SCRIPT_URL` in HTML files

## Documentation

- [Software Requirements Specification (SRS)](NRI_Bridge_India_SRS.pdf)
- [Agent Context (CLAUDE.md)](CLAUDE.md) — Developer documentation
- [Project Guidelines (GEMINI.md)](GEMINI.md) — Additional context

## License

Proprietary — All rights reserved.