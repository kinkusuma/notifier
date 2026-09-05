# 🚀 Getting Started — End-to-End Tutorial Guide

A comprehensive, step-by-step walkthrough to configure, register subscribers, create dynamic templates, and dispatch notifications across **all supported delivery channels** (Email, WhatsApp, Telegram, Firebase Push, Webhook, and In-App Real-time SSE).

---

## 📑 Table of Contents

1. [Prerequisites & Installation](#1-prerequisites--installation)
2. [Environment Configuration (.env) for All Channels](#2-environment-configuration-env-for-all-channels)
3. [Database Migration & Starting the Engine](#3-database-migration--starting-the-engine)
4. [Step 1: Registering a Subscriber](#step-1-registering-a-subscriber)
5. [Step 2: Creating Notification Templates](#step-2-creating-notification-templates)
6. [Step 3: End-to-End Dispatch per Channel](#step-3-end-to-end-dispatch-per-channel)
   - [Channel 1: EMAIL (Resend & SMTP)](#channel-1-email-resend--smtp)
   - [Channel 2: WHATSAPP (Fonnte & Twilio)](#channel-2-whatsapp-fonnte--twilio)
   - [Channel 3: TELEGRAM (Bot API & 1-Click Magic Connect)](#channel-3-telegram-bot-api--1-click-magic-connect)
   - [Channel 4: PUSH NOTIFICATION (Firebase Cloud Messaging / FCM)](#channel-4-push-notification-firebase-cloud-messaging--fcm)
   - [Channel 5: WEBHOOK (Discord, Slack, & Custom Servers)](#channel-5-webhook-discord-slack--custom-servers)
   - [Channel 6: IN-APP REALTIME (Feed & SSE Live Stream)](#channel-6-in-app-realtime-feed--sse-live-stream)
7. [Step 4: Advanced Engine Capabilities](#step-4-advanced-engine-capabilities)
   - [A. Scheduled & Delayed Dispatch](#a-scheduled--delayed-dispatch)
   - [B. Batch & Broadcast Dispatch](#b-batch--broadcast-dispatch)
   - [C. Automated Cross-Channel Fallback](#c-automated-cross-channel-fallback)
   - [D. Granular User Preferences (Opt-in / Opt-out)](#d-granular-user-preferences-opt-in--opt-out)
   - [E. Notification Digest (Burst Aggregation)](#e-notification-digest-burst-aggregation)
8. [Step 5: Monitoring Audit Logs & Inbound Webhooks](#step-5-monitoring-audit-logs--inbound-webhooks)

---

## 1. Prerequisites & Installation

Ensure you have the following installed on your machine:

- **Node.js** `>= 20.x`
- **pnpm** `>= 9.x`
- **PostgreSQL Database** `>= 14.x` (Local or cloud instances like Supabase / Neon / Railway)

### Clone & Install Dependencies

```bash
git clone https://github.com/kinkusuma/notifier.git
cd notifier
pnpm install
```

---

## 2. Environment Configuration (.env) for All Channels

Copy the example environment file:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials for the delivery providers you intend to use:

```ini
# ==========================================
# APPLICATION & AUTH
# ==========================================
PORT=3000
NODE_ENV=development
MASTER_API_KEY=notif_sec_master_key_12345

# ==========================================
# DATABASE & PG-BOSS QUEUE
# ==========================================
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/notifier?schema=public"

# ==========================================
# EMAIL PROVIDERS (RESEND / SMTP)
# ==========================================
DEFAULT_EMAIL_PROVIDER=RESEND

# If using Resend:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
RESEND_FROM="Notifier <onboarding@resend.dev>"

# If using SMTP (Gmail / Mailtrap / Custom Relay):
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Notifier <noreply@yourdomain.com>"
SMTP_SECURE=false

# ==========================================
# WHATSAPP PROVIDERS (FONNTE / TWILIO)
# ==========================================
DEFAULT_WHATSAPP_PROVIDER=FONNTE

# If using Fonnte:
FONNTE_TOKEN=your_fonnte_device_token

# If using Twilio:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

# ==========================================
# TELEGRAM BOT API
# ==========================================
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_BOT_USERNAME=MyNotifierBot

# ==========================================
# PUSH NOTIFICATION (FIREBASE FCM)
# ==========================================
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# ==========================================
# WEBHOOK & DIGEST
# ==========================================
WEBHOOK_TIMEOUT_MS=10000
DIGEST_INTERVAL_SECONDS=60
```

---

## 3. Database Migration & Starting the Engine

### Run Migrations & Seed Default Data

```bash
# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

# Seed default API keys, demo subscribers, and standard templates
npx tsx prisma/seed.ts
```

### Start the Application Server

```bash
pnpm start:dev
```

Once started, explore the interactive documentation interfaces:

- **Scalar API Reference**: [http://localhost:3000/reference](http://localhost:3000/reference)
- **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

> [!NOTE]
> All API requests require authentication via the header:  
> `x-api-key: notif_sec_master_key_12345` (or `Authorization: Bearer <key>`).

---

## Step 1: Registering a Subscriber

A **Subscriber** represents a recipient entity with associated multi-channel contact endpoints (Email, WhatsApp number, Telegram chat ID, Webhook URL, and FCM device tokens).

### Request:

```bash
curl -X POST http://localhost:3000/api/v1/subscribers \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "externalId": "usr_alex_99",
    "email": "alex@example.com",
    "phoneNumber": "+6281234567890",
    "telegramChatId": "123456789",
    "webhookUrl": "https://discord.com/api/webhooks/your-webhook-url",
    "fcmTokens": ["eXample_FcmToken_DeviceA1B2C3"],
    "metadata": {
      "name": "Alex Pratama",
      "tier": "Premium"
    }
  }'
```

---

## Step 2: Creating Notification Templates

**Templates** define the reusable blueprint for notifications, with dynamic Handlebars placeholders (`{{variable}}`), custom formatters, and channel fallback logic.

### Request:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "order-success",
    "title": "Order Confirmation",
    "subject": "Order #{{orderId}} Confirmed!",
    "bodyText": "Hello {{upperCase name}}, your order #{{orderId}} totaling ${{total}} has been received and is being processed.",
    "bodyHtml": "<h2>Hello {{upperCase name}}!</h2><p>Your order <b>#{{orderId}}</b> totaling <b>${{total}}</b> has been confirmed.</p><p>Thank you for shopping with us!</p>",
    "defaultChannel": "EMAIL",
    "fallbackChannel": "WHATSAPP"
  }'
```

---

## Step 3: End-to-End Dispatch per Channel

### Channel 1: EMAIL (Resend & SMTP)

1. **Create an Email Template**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "billing-invoice",
    "title": "Billing Invoice",
    "subject": "Invoice #{{invoiceNumber}} is Ready",
    "bodyText": "Hi {{name}}, your invoice #{{invoiceNumber}} for ${{amount}} is due on {{dueDate}}.",
    "bodyHtml": "<div style=\"font-family: sans-serif; padding: 24px; background: #f9fafb; border-radius: 8px;\"><h2 style=\"color: #111827;\">Invoice Payment Due</h2><p>Hi <b>{{name}}</b>,</p><p>Invoice <b>#{{invoiceNumber}}</b> for <b>${{amount}}</b> is due on {{dueDate}}.</p><a href=\"{{payLink}}\" style=\"display: inline-block; background: #4f46e5; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;\">Pay Invoice Now</a></div>",
    "defaultChannel": "EMAIL"
  }'
```

2. **Dispatch Notification**:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "billing-invoice",
    "variables": {
      "name": "Alex Pratama",
      "invoiceNumber": "INV-2026-001",
      "amount": "250.00",
      "dueDate": "September 10, 2026",
      "payLink": "https://example.com/pay/INV-2026-001"
    }
  }'
```

---

### Channel 2: WHATSAPP (Fonnte & Twilio)

1. **Create a WhatsApp Template**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "otp-whatsapp",
    "title": "WhatsApp OTP Code",
    "bodyText": "*YOUR VERIFICATION CODE*\n\nHi {{name}},\nYour one-time security code is: *{{otpCode}}*\n\nDo not share this code with anyone. Valid for 5 minutes.",
    "defaultChannel": "WHATSAPP"
  }'
```

2. **Dispatch Notification**:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "otp-whatsapp",
    "variables": {
      "name": "Alex",
      "otpCode": "849201"
    }
  }'
```

---

### Channel 3: TELEGRAM (Bot API & 1-Click Magic Connect)

#### Special Feature: Telegram 1-Click "Magic Connect"

Eliminate manual Chat ID lookups with automatic deep-linking!

1. **Generate Magic Connect URL**:

```bash
curl -X GET "http://localhost:3000/api/v1/webhooks/telegram/connect-url/usr_alex_99"
```

_Response_: `{"subscriberExternalId":"usr_alex_99","connectUrl":"https://t.me/MyNotifierBot?start=usr_alex_99"}`

2. When the user opens this link and presses **START** in Telegram, your webhook receives the payload and automatically saves their `telegramChatId` to `usr_alex_99`.

3. **Create Telegram Template & Dispatch**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "server-alert-telegram",
    "title": "Infrastructure Alert",
    "bodyText": "<b>ALERT: {{serverName}}</b>\nStatus: <code>{{status}}</code>\nCPU Usage: <b>{{cpu}}%</b>\nTimestamp: <i>{{formatDate timestamp}}</i>",
    "defaultChannel": "TELEGRAM"
  }'

# Dispatch to Telegram
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "server-alert-telegram",
    "variables": {
      "serverName": "Production-API-Cluster",
      "status": "HIGH LOAD",
      "cpu": "94.8",
      "timestamp": "2026-09-05T10:00:00Z"
    }
  }'
```

---

### Channel 4: PUSH NOTIFICATION (Firebase Cloud Messaging / FCM)

1. **Create FCM Push Template**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "flash-sale-push",
    "title": "Flash Sale Push",
    "subject": "🔥 FLASH SALE IS LIVE!",
    "bodyText": "Enjoy up to {{discount}}% off on {{category}}. Claim your voucher now!",
    "defaultChannel": "PUSH"
  }'
```

2. **Dispatch Notification**:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "flash-sale-push",
    "variables": {
      "discount": "70",
      "category": "Electronics"
    }
  }'
```

---

### Channel 5: WEBHOOK (Discord, Slack, & Custom Servers)

Subscribers configured with a `webhookUrl` (Discord Webhook, Slack Incoming Webhook, or Internal Microservice) automatically receive structured JSON / rich embed payloads.

1. **Create Webhook Template**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "deploy-event",
    "title": "Deployment Event",
    "subject": "New Deployment: {{service}}",
    "bodyText": "Service {{service}} ({{version}}) deployed successfully to {{environment}} by {{author}}.",
    "defaultChannel": "WEBHOOK"
  }'
```

2. **Dispatch Notification**:

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "deploy-event",
    "variables": {
      "service": "billing-service",
      "version": "v2.4.1",
      "environment": "Production",
      "author": "devops@company.com"
    }
  }'
```

---

### Channel 6: IN-APP REALTIME (Feed & SSE Live Stream)

Designed for in-app notification bells, drawers, feeds, and real-time frontend streaming via Server-Sent Events (SSE).

1. **Connect to Live SSE Stream (Client-Side)**:

```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/v1/in-app/stream/usr_alex_99"
```

2. **Create Template & Dispatch In-App Notification**:

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "in-app-mention",
    "title": "Mention Notification",
    "subject": "You were mentioned by {{actor}}",
    "bodyText": "{{actor}} mentioned you in a comment on ticket #{{ticketId}}.",
    "defaultChannel": "IN_APP"
  }'

curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "templateSlug": "in-app-mention",
    "variables": { "actor": "Sarah Jenkins", "ticketId": "TK-882" }
  }'
```

_(The event instantly pushes through the active SSE connection)._

3. **Fetch Notifications for UI Drawer**:

```bash
curl -X GET "http://localhost:3000/api/v1/in-app/notifications/usr_alex_99?isRead=false" \
  -H "x-api-key: notif_sec_master_key_12345"
```

4. **Mark Notification as Read**:

```bash
curl -X PATCH "http://localhost:3000/api/v1/in-app/notifications/<NOTIFICATION_ID>/read" \
  -H "x-api-key: notif_sec_master_key_12345"
```

---

## Step 4: Advanced Engine Capabilities

### A. Scheduled & Delayed Dispatch

- **Relative Delay in Seconds (`delaySeconds`)**:

```json
{
  "subscriberExternalId": "usr_alex_99",
  "templateSlug": "order-success",
  "delaySeconds": 300,
  "variables": { "name": "Alex", "orderId": "ORD-123", "total": "50.00" }
}
```

- **Exact Future Timestamp (`sendAt` ISO 8601)**:

```json
{
  "subscriberExternalId": "usr_alex_99",
  "templateSlug": "order-success",
  "sendAt": "2026-09-10T08:00:00.000Z",
  "variables": { "name": "Alex", "orderId": "ORD-123", "total": "50.00" }
}
```

---

### B. Batch & Broadcast Dispatch

Dispatch messages simultaneously across hundreds or thousands of subscribers in chunked background queue workers:

```bash
curl -X POST http://localhost:3000/api/v1/notify/broadcast \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalIds": ["usr_alex_99", "usr_budi_10", "usr_citra_22"],
    "templateSlug": "flash-sale-push",
    "variables": {
      "discount": "50",
      "category": "Fashion"
    }
  }'
```

---

### C. Automated Cross-Channel Fallback

If primary channel delivery fails exhaustively (e.g. `EMAIL` bounces or exceeds max retries), the worker engine automatically triggers secondary delivery using the configured `fallbackChannel` (e.g. `WHATSAPP` or `TELEGRAM`).

All fallback operations are tracked with status `FALLBACK_TRIGGERED` and linked via `parentLogId` in the audit logs.

---

### D. Granular User Preferences (Opt-in / Opt-out)

Subscribers can disable specific channels for specific categories (e.g. opt-out of `MARKETING` on WhatsApp while keeping `TRANSACTIONAL` enabled):

```bash
curl -X POST http://localhost:3000/api/v1/preferences \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_alex_99",
    "channel": "WHATSAPP",
    "category": "MARKETING",
    "isEnabled": false
  }'
```

---

### E. Notification Digest (Burst Aggregation)

Prevent subscriber fatigue during rapid notification bursts (e.g. 15 alert pings within 60 seconds).  
When category is set to `DIGEST`, the engine buffers messages inside a configurable time window and dispatches a single consolidated summary.

---

## Step 5: Monitoring Audit Logs & Inbound Webhooks

### 1. Querying Delivery Audit Logs

```bash
# Fetch recent logs
curl -X GET "http://localhost:3000/api/v1/notify/logs?limit=10" \
  -H "x-api-key: notif_sec_master_key_12345"

# Filter by subscriber and delivery status
curl -X GET "http://localhost:3000/api/v1/notify/logs?subscriberId=usr_alex_99&status=DELIVERED" \
  -H "x-api-key: notif_sec_master_key_12345"
```

### 2. Inbound Delivery Status Webhooks

Public endpoints are available for receiving status callbacks from third-party delivery providers:

- `POST /api/v1/webhooks/resend` (`email.delivered`, `email.opened`, `email.bounced`)
- `POST /api/v1/webhooks/twilio` (`delivered`, `failed`, `read`)
- `POST /api/v1/webhooks/fonnte` (Fonnte delivery callbacks)

---
