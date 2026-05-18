# NRI Bridge India Email Templates

This directory contains brand-aligned HTML email templates for various customer touchpoints.

## Brand Guidelines
- **Primary Green:** `#4a6a2e`
- **Background Cream:** `#f2efe5`
- **Typography:** Headings use `Playfair Display`, body uses `DM Sans`.
- **Tone:** Professional, earthy, premium.
- **Representative:** All emails are signed by **Jeff**.

## Templates

### 1. Welcome Email (`welcome.html`)
Sent to new users upon signup.
- **Placeholders:** `{{name}}`, `{{login_url}}`

### 2. Payment Confirmation (`payment_confirmation.html`)
Sent after a successful transaction (e.g., plan subscription).
- **Placeholders:** `{{name}}`, `{{transaction_id}}`, `{{amount}}`, `{{plan_name}}`, `{{date}}`, `{{invoice_url}}`

### 3. Document Request (`document_request.html`)
Sent when the operations team needs a document from the client.
- **Placeholders:** `{{name}}`, `{{document_title}}`, `{{service_type}}`, `{{due_date}}`, `{{instructions}}`, `{{upload_url}}`

### 4. Task Update (`task_update.html`)
Sent when a service task status changes.
- **Placeholders:** `{{name}}`, `{{new_status}}`, `{{property_name}}`, `{{task_title}}`, `{{task_description}}`, `{{comment}}`, `{{dashboard_url}}`

## Usage Note
These templates use double-curly-brace placeholders (e.g., `{{name}}`) which are compatible with most email delivery services like Resend, SendGrid, or custom Handlebars implementations. Ensure you replace these with actual data before sending.
