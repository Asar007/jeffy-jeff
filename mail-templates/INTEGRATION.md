# Email Template Integration Status

The following templates have been created, published to Resend, and integrated into the NRI Bridge India website.

## Templates & IDs

| Template Name | Resend Template ID | Trigger Point |
| :--- | :--- | :--- |
| **Welcome Email** | `01682539-4627-45d5-a98d-2433adb773ee` | `signup.html` (after Supabase signup) |
| **Payment Confirmation** | `ec1e5784-c7f7-49b2-97c9-4e45ad990723` | `verify-razorpay-payment` Edge Function |
| **Document Request** | `d4ab1f99-1330-479b-9367-253ce85ad048` | `send-document-request-email` Edge Function |
| **Task Update Email** | `20737c37-dd98-4dbb-845d-e72a7d3b92e9` | *Pending (Manual/Webhook)* |

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
