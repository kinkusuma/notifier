<div align="center">

# ⚡ Notifier — Multi-Channel Notification Dispatcher Engine

**A high-performance, modular notification dispatching engine built with NestJS 11, Prisma ORM, PostgreSQL (Neon), and pg-boss queue.**

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Prisma](https://img.shields.io/badge/Prisma-v7-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)](https://neon.tech)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 Key Features

- 📬 **Multi-Channel Dispatching**: Unified interface for Email, WhatsApp, Telegram, Webhook, Push (FCM), and **In-App Realtime Feed**.
- ⏱️ **Scheduled & Delayed Dispatch**: Schedule delivery for exact future ISO timestamps or relative second delays (`sendAt`, `delaySeconds`).
- 📢 **Batch & Broadcast Engine**: High-throughput chunked broadcast dispatches to entire subscriber bases or targeted segment filters (`POST /api/v1/notify/broadcast`).
- 🔔 **In-App Realtime Feed & SSE**: Persistent in-app notifications with read status (`isRead`, `readAt`) and live streaming via Server-Sent Events (SSE).
- 📬 **Inbound Delivery Webhooks**: Real-time status sync (`DELIVERED`, `OPENED`, `CLICKED`, `BOUNCED`) from Resend, Twilio, and Fonnte webhooks.
- 🚦 **Smart Throttling & Frequency Capping**: Sliding window rate limits preventing subscriber spam and protecting provider quota.
- 📦 **Notification Digest / Aggregation**: Automatically aggregates rapid alert bursts within a time window into a single consolidated summary.
- 🔄 **Automatic Cross-Channel Fallback**: Automatically tries an alternate channel (e.g., Email ➡️ Telegram) when primary delivery fails.
- 🐘 **Zero-Extra-Container Queue (`pg-boss`)**: High-throughput background jobs directly in PostgreSQL. No Redis required!
- 🎨 **Handlebars Template Engine**: Dynamic templates with variable substitution, loops, conditions, and custom helpers (`upperCase`, `lowerCase`, `defaultVal`, `formatDate`).
- 🎛️ **Granular User Preferences**: Category-based opt-in/opt-out preferences (e.g., `TRANSACTIONAL`, `MARKETING`, `SECURITY`).
- 🛡️ **API Key Authentication**: Dual-layer authentication via `x-api-key` or `Authorization: Bearer <key>` with database verification and master fallback.
- 📖 **Interactive API Documentation**: Built-in Swagger UI (`/docs`) and Scalar API Reference (`/reference`).
- 🩺 **Health & Readiness Checks**: Terminus health checks for PostgreSQL and pg-boss queue status (`/health`).

---

## 🧩 Supported Channels & Providers

| Channel | Supported Providers | Key Capabilities |
| :--- | :--- | :--- |
| **Email** | **Resend**, **SMTP** (Nodemailer / Mailtrap) | HTML & plaintext, dynamic Handlebars variables, bounce/open webhooks |
| **WhatsApp** | **Fonnte**, **Twilio** | Direct messaging, read receipts, delivery webhooks |
| **Telegram** | **Telegram Bot API** | HTML/Markdown formatting, direct bot notifications |
| **In-App Feed** | **Native In-App Store + SSE Stream** | Live SSE push (`/stream`), notification drawer, unread counter, read status |
| **Webhook** | **Discord**, **Slack**, **Custom HTTP** | Discord embeds, Slack blocks, raw JSON events |
| **Push** | **Firebase Cloud Messaging (FCM)** | Device token push dispatch |

---

## 🏗️ Architecture Flow

```text
                                [ Client Applications / Cron ]
                                               │
       ┌───────────────────────────────────────┼───────────────────────────────────────┐
       ▼                                       ▼                                       ▼
[ POST /notify ]                      [ POST /notify/broadcast ]              [ Inbound Webhooks ]
(Single / Scheduled)                  (Targeted / Segmented)                  (/webhooks/resend...)
       │                                       │                                       │
       └──────────────────────────────────┬────┘                                       │
                                          │ (Validation & Enqueue)                     │
                                          ▼                                            │
                         [ pg-boss Queue: notifications-dispatch ]                     │
                                          │                                            │
                                          ▼                                            │
                            [ NotificationWorkerService ]                              │
                                          │                                            │
                ┌─────────────────────────┼─────────────────────────┐                  │
                ▼                         ▼                         ▼                  │
      [ Throttle Guard ]         [ Digest Buffer ]         [ Template Engine ]         │
    (Check Frequency Caps)     (Window Consolidation)    (Handlebars + Helpers)        │
                │                         │                         │                  │
                └─────────────────────────┼─────────────────────────┘                  │
                                          ▼                                            │
                               [ Provider Factory ]                                    │
                ┌──────────────┬──────────┴───┬──────────────┬──────────────┐          │
                ▼              ▼              ▼              ▼              ▼          │
             [ EMAIL ]    [ WHATSAPP ]   [ TELEGRAM ]    [ IN_APP ]     [ WEBHOOK ]    │
             (Resend/SMTP) (Fonnte/Twilio) (Bot API)     (Feed / SSE)   (Slack/Discord)│
                │              │              │              │              │          │
                └──────────────┴──────────────┴──────────────┴──────────────┘          │
                                              │                                        │
                                              ▼                                        ▼
                                  [ Neon PostgreSQL Database ] ◄──────────────────────┘
                                  - NotificationLog (Lifecycle & Status)
                                  - InAppNotification (Feed & isRead)
                                  - NotificationDigest (Buffer)
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** `>= 20.x`
- **pnpm** `>= 9.x`
- **PostgreSQL Database** (e.g. [Neon](https://neon.tech) or local PostgreSQL)

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/notifier.git
cd notifier

# Install dependencies
pnpm install
```

### 3. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Key environment variables:

```ini
# Application
PORT=3000
NODE_ENV=development

# Master Auth Fallback
MASTER_API_KEY=notif_sec_master_key_12345

# Neon / PostgreSQL Database URL
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Email Provider
DEFAULT_EMAIL_PROVIDER=RESEND
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM="Notifier <onboarding@resend.dev>"

# WhatsApp Provider
DEFAULT_WHATSAPP_PROVIDER=FONNTE
FONNTE_TOKEN=your_fonnte_token
```

### 4. Database Setup & Seeding

```bash
# Generate Prisma Client
npx prisma generate

# Apply Migrations
npx prisma migrate dev --name init

# Seed Default API Key, Subscriber & Sample Templates
npx tsx prisma/seed.ts
```

### 5. Start the Server

```bash
# Development mode (watch)
pnpm dev
# or
pnpm start:dev

# Production build & run
pnpm build
pnpm start:prod
```

---

## 📖 API Documentation & Endpoints

Once the application is running, access the interactive documentation:

- 🦁 **Scalar API Reference**: [http://localhost:3000/reference](http://localhost:3000/reference)
- 📘 **Swagger UI**: [http://localhost:3000/docs](http://localhost:3000/docs)
- 💓 **Health Check**: [http://localhost:3000/health](http://localhost:3000/health)

---

## 📡 API Usage Examples

### 1. Dispatch Instant / Scheduled Notification

```bash
# Instant Dispatch
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_demo_100",
    "templateSlug": "welcome-user",
    "variables": { "name": "Jane Doe", "appName": "Acme Cloud" }
  }'

# Scheduled Dispatch (e.g. 1 hour delay)
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_demo_100",
    "templateSlug": "welcome-user",
    "delaySeconds": 3600,
    "variables": { "name": "Jane Doe", "appName": "Acme Cloud" }
  }'
```

---

### 2. Broadcast Notification to Multiple Subscribers

```bash
curl -X POST http://localhost:3000/api/v1/notify/broadcast \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalIds": ["usr_demo_100", "usr_cust_200"],
    "templateSlug": "welcome-user",
    "variables": { "notice": "System scheduled maintenance tonight" }
  }'
```

---

### 3. In-App Notification Feed & SSE Stream

```bash
# Get in-app notification feed
curl -X GET "http://localhost:3000/api/v1/in-app/notifications/usr_demo_100?isRead=false" \
  -H "x-api-key: notif_sec_master_key_12345"

# Get unread count
curl -X GET "http://localhost:3000/api/v1/in-app/unread-count/usr_demo_100" \
  -H "x-api-key: notif_sec_master_key_12345"

# Mark notification as read
curl -X PATCH "http://localhost:3000/api/v1/in-app/notifications/<NOTIF_ID>/read" \
  -H "x-api-key: notif_sec_master_key_12345"

# Subscribe to real-time Server-Sent Events (SSE) stream
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3000/api/v1/in-app/stream/usr_demo_100"
```

---

### 4. Inbound Delivery Status Webhooks

```bash
# Simulate Resend email opened event
curl -X POST http://localhost:3000/api/v1/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.opened",
    "data": { "email_id": "msg_resend_123" }
  }'
```

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run test coverage
pnpm test:cov
```

---

## 📂 Project Structure

```text
src/
├── common/                  # Guards, decorators, filters & interceptors
│   ├── decorators/          # @Public()
│   ├── filters/             # Global exception filter
│   ├── guards/              # ApiKeyGuard
│   └── interceptors/        # Transform response interceptor
├── config/                  # Environment & App configuration
├── database/                # PrismaService with @prisma/adapter-pg
└── modules/
    ├── api-keys/            # API Key management
    ├── dispatch/            # POST /notify & Audit log query API
    ├── health/              # Terminus DB & Queue health checks
    ├── preferences/         # User Opt-In/Opt-Out preferences
    ├── providers/           # Strategy pattern provider adapters
    │   ├── email/           # SMTP & Resend adapters
    │   ├── push/            # Firebase Cloud Messaging adapter
    │   ├── telegram/        # Telegram Bot API adapter
    │   ├── webhook/         # Discord, Slack & JSON Webhooks
    │   └── whatsapp/        # Fonnte & Twilio adapters
    ├── queue/               # pg-boss queue & worker services
    ├── subscribers/         # Subscriber CRUD & upsert
    ├── template-engine/     # Handlebars compilation & caching
    └── templates/           # Notification template management
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
