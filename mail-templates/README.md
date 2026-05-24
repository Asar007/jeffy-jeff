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
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{LOGIN_URL}}}`

### 2. Payment Confirmation (`payment_confirmation.html`)
Sent after a successful transaction (e.g., plan subscription).
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{TXN_ID}}}`, `{{{AMOUNT}}}`, `{{{PLAN_NAME}}}`, `{{{DATE}}}`, `{{{INVOICE_URL}}}`

### 3. Document Request (`document_request.html`)
Sent when the operations team needs a document from the client.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{DOC_TITLE}}}`, `{{{SERVICE_TYPE}}}`, `{{{DUE_DATE}}}`, `{{{INSTRUCTIONS}}}`, `{{{UPLOAD_URL}}}`

### 4. Task Update (`task_update.html`)
Sent when a service task status changes.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{NEW_STATUS}}}`, `{{{PROPERTY_NAME}}}`, `{{{TASK_TITLE}}}`, `{{{TASK_DESC}}}`, `{{{COMMENT}}}`, `{{{DASHBOARD_URL}}}`

### 5. Document Accepted (`document_accepted.html`)
Sent when a submitted document is verified and accepted.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{DOC_TITLE}}}`, `{{{SERVICE_TYPE}}}`, `{{{DASHBOARD_URL}}}`

### 6. Dispute Raised (`dispute_raised.html`)
Sent when a new dispute case is opened.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{CASE_ID}}}`, `{{{PROPERTY_NAME}}}`, `{{{DISPUTE_REASON}}}`, `{{{DISPUTE_URL}}}`

### 7. Request Submitted (`request_submitted.html`)
Sent when a user submits a new service request.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{SERVICE_TYPE}}}`, `{{{REQUEST_TITLE}}}`, `{{{DETAILS}}}`, `{{{DASHBOARD_URL}}}`

### 8. Document Status Update (`document_status_update.html`)
Sent for document verification progress or issues.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{DOC_TITLE}}}`, `{{{NEW_STATUS}}}`, `{{{UPDATE_MESSAGE}}}`, `{{{DASHBOARD_URL}}}`

### 9. Dispute Status Update (`dispute_status_update.html`)
Sent for updates on open dispute cases.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{CASE_ID}}}`, `{{{NEW_STATUS}}}`, `{{{UPDATE_MESSAGE}}}`, `{{{DISPUTE_URL}}}`

### 10. Request Status Update (`request_status_update.html`)
Sent for progress updates on service requests.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{REQUEST_TITLE}}}`, `{{{NEW_STATUS}}}`, `{{{UPDATE_MESSAGE}}}`, `{{{DASHBOARD_URL}}}`

### 11. Billing Reminder (`billing_reminder.html`)
Sent at intervals before the payment due date.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{PLAN_NAME}}}`, `{{{AMOUNT}}}`, `{{{DUE_DATE}}}`, `{{{DAYS_LEFT}}}`, `{{{BILLING_URL}}}`

### 12. Payment Failed (`payment_failed.html`)
Sent when an automatic charge attempt fails.
- **Placeholders:** `{{{FIRST_NAME}}}`, `{{{PLAN_NAME}}}`, `{{{AMOUNT}}}`, `{{{DATE}}}`, `{{{BILLING_URL}}}`

## Usage Note
These templates use triple-brace placeholders (e.g., `{{{FIRST_NAME}}}`) which are compatible with Resend. Ensure you provide the corresponding variables in your payload when sending.
