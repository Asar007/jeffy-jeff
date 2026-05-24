# Email Template Integration Status

The following templates have been created, published to Resend, and integrated into the NRI Bridge India website.

## Templates & IDs

| Template Name | Resend Template ID | Trigger Point |
| :--- | :--- | :--- |
| **Welcome Email** | `01682539-4627-45d5-a98d-2433adb773ee` | `signup.html` (after Supabase signup) |
| **Payment Confirmation** | `ec1e5784-c7f7-49b2-97c9-4e45ad990723` | `verify-razorpay-payment` Edge Function |
| **Document Request** | `d4ab1f99-1330-479b-9367-253ce85ad048` | `send-document-request-email` Edge Function |
| **Task Update Email** | `20737c37-dd98-4dbb-845d-e72a7d3b92e9` | *Pending (Manual/Webhook)* |
| **Document Accepted** | `1f0c0aca-df73-4727-870a-9f1c29571083` | Operations Review |
| **Dispute Raised** | `38f7cd22-756c-469c-8bbe-440f2b32388b` | Dispute Submission |
| **Request Submitted** | `980b3756-b29e-4339-96f3-5fc2c7c9f710` | New Service Request |
| **Document Status Update** | `21ea274b-69b2-4301-9db9-4259e43808a7` | Document State Change |
| **Dispute Status Update** | `1b516385-6f55-4037-af41-fb99374195a9` | Dispute Investigation |
| **Request Status Update** | `e0f23ac8-04a2-4408-8dc6-6ff5fa6de6e5` | Request Phase Change |
| **Billing Reminder** | `6891bf36-9a8f-4695-8f45-28b19e09aade` | `billing.upcoming` Automation |
| **Payment Failed** | `b1566e34-8ef6-4dc4-bd27-564e549ea2e0` | `billing.payment_failed` Automation |

## Automations

| Automation Name | Trigger Event | Sequence |
| :--- | :--- | :--- |
| **Billing Reminders** | `billing.upcoming` | 7 days -> 3 days -> 1 day |
| **Payment Success** | `billing.payment_succeeded` | Immediate confirmation |
| **Payment Failure** | `billing.payment_failed` | Immediate alert |

## Triggering Events (Testing)

You can trigger the billing automations manually via the `resend-events` Edge Function or directly through the Resend API:

**Example: Trigger Payment Success**
```bash
curl -X POST https://PROJECT_REF.supabase.co/functions/v1/resend-events \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -d '{
    "event": "billing.payment_succeeded",
    "email": "customer@example.com",
    "payload": {
      "FIRST_NAME": "John",
      "AMOUNT": 4999,
      "PLAN_NAME": "Platinum Plan",
      "TXN_ID": "TXN_123456",
      "DATE": "24 May 2026",
      "INVOICE_URL": "https://nribridgeindia.com/dashboard.html?tab=payments"
    }
  }'
```

## New Edge Function: `send-email`
A unified helper function has been created to send any template-based email via Resend.

**Endpoint:** `/functions/v1/send-email`
**Method:** `POST`
**Body:**
```json
{
  "to": "customer@example.com",
  "templateId": "TEMPLATE_ID",
  "subject": "Email Subject",
  "payload": {
    "FIRST_NAME": "John",
    "CUSTOM_VAR": "Value"
  }
}
```

## Maintenance
- Templates are signed by **Jeff**.
- All templates use the **NRI Bridge India** brand theme (Earthy Green & Cream).
- To edit templates visually, use the [Resend Dashboard](https://resend.com/templates).
