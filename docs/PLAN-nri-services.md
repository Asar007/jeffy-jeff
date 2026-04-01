# Project Plan: NRI Services Workflows
**Mode:** PLANNING ONLY

## Phase -1: Context Check
- **Objective:** Implement a comprehensive suite of 8 platform-specific services and workflows for NRI users (Identity, Visa, Tax, Banking, Property, Legal, Business, Consular).
- **Scope:** Defines the end-to-end user flows for selecting services, entering details, uploading documents, validations, submissions, and issue of final certificates/documents.

## Phase 0: Socratic Gate & Open Questions
Before proceeding with implementation, the following questions need to be clarified:
1. **Frontend Architecture:** Will these workflows be built into the existing `propnri-saas-site.html` architecture, or separated into a dedicated portal (e.g., `services.html`)?
2. **Backend Integration:** How will document uploads (Identity proof, passports, etc.) and validation be handled? (e.g., Supabase Storage, AWS S3).
3. **External API Integrations:** Are there existing government or third-party APIs you plan to use for steps like "Validate eligibility" and "Submit to consulate", or will this remain a manual/internal admin process initially?

## Phase 1: Task Breakdown

### 1. Identity & Citizenship
- [ ] UI for selecting service (OCI Card, Passport, etc.)
- [ ] Form for personal and citizenship details
- [ ] Secure document upload component for identity proof
- [ ] Backend logic for eligibility validation
- [ ] Status tracking dashboard component

### 2. Visa & Immigration
- [ ] UI for selecting visa/immigration workflows
- [ ] Form for travel and visa details
- [ ] Document upload for passports and visas
- [ ] Mock API or integration for submitting to FRRO/Consulates

### 3. Tax & Compliance
- [ ] UI for tax service selection (PAN, TRC, DTAA, etc.)
- [ ] Financial and residency detail forms
- [ ] Compliance checking logic (TDS, DTAA rules)
- [ ] Automated form generation (10F, 15CA/CB)

### 4. Banking & Finance
- [ ] UI for opening NRE/NRO/FCNR accounts
- [ ] KYC details and FATCA/CRS declaration forms
- [ ] Identity and address proof uploads
- [ ] Mock banking verification workflow

### 5. Property & Real Estate
- [ ] UI for buying, selling, or repatriating property proceeds
- [ ] Legal document upload and property detail forms
- [ ] Legal and FEMA validation flow
- [ ] Generation of POA and agreements

### 6. Inheritance & Legal
- [ ] UI for legal services (Will, Probate, Succession)
- [ ] Family and asset forms with supporting doc uploads
- [ ] Automated legal draft generation (Wills, Affidavits)
- [ ] Workflow for lawyer/court validation status

### 7. Business & Investment
- [ ] UI for Company Incorporation, FDI, PIS, etc.
- [ ] Investment details and compliance document uploads
- [ ] RBI/FEMA rules checklist and form filing
- [ ] Investment execution status tracking

### 8. Consular Services
- [ ] UI for Attestation, PCC, Birth/Marriage registration
- [ ] Personal data and original document upload flows
- [ ] Authenticity verification step
- [ ] Backend workflow for tracking delivery from MEA/VFS

## Phase 2: Agent Assignments
- **Frontend / UI-UX Agent:** To build the wizard interfaces, form layouts, and multi-step progression.
- **Backend Developer Agent:** To handle file uploads, form validations, database schematics, and generation of PDF drafts (like the POA or Tax forms).
- **QA/Testing Agent:** To test the complex multi-step forms and document integrity.

## Phase 3: Verification Checklist
- [ ] Verify that all 8 categories are accessible from the user's dashboard.
- [ ] Verify form states maintain data if a user goes back/forward between steps.
- [ ] Verify that uploaded documents are strictly validated for size and type.
- [ ] Ensure user dashboard correctly reflects the real-time "Status" (e.g., Submitted, Validating, Approved, Delivered).
