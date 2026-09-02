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

- 📬 **Multi-Channel Dispatching**: Unified interface for Email, WhatsApp, Telegram, Webhook, and Push (FCM).
- 🔄 **Automatic Cross-Channel Fallback**: Automatically tries an alternate channel (e.g. Email ➡️ Telegram) when primary delivery fails.
- 🐘 **Zero-Extra-Container Queue (`pg-boss`)**: High-throughput background jobs directly in PostgreSQL. No Redis required!
- 🎨 **Handlebars Template Engine**: Dynamic templates with variable substitution, loops, conditions, and custom helpers (`upperCase`, `lowerCase`, `defaultVal`, `formatDate`).
- 🎛️ **Granular User Preferences**: Category-based opt-in/opt-out preferences (e.g., `TRANSACTIONAL`, `MARKETING`, `SECURITY`).
- 🛡️ **API Key Authentication**: Dual-layer authentication via `x-api-key` or `Authorization: Bearer <key>` with database verification and master fallback.
- 📖 **Interactive API Documentation**: Built-in Swagger UI (`/docs`) and Scalar API Reference (`/reference`).
- 🩺 **Health & Readiness Checks**: Terminus health checks for PostgreSQL and pg-boss queue status (`/health`).

---

## 🧩 Supported Channels & Providers

| Channel | Supported Providers | Environment Variables |
| :--- | :--- | :--- |
| **Email** | **Resend** (API), **SMTP** (Nodemailer / Mailtrap / Gmail) | `RESEND_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` |
| **WhatsApp** | **Fonnte** (API), **Twilio** (REST API) | `FONNTE_TOKEN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` |
| **Telegram** | **Telegram Bot API** (Markdown / HTML) | `TELEGRAM_BOT_TOKEN` |
| **Webhook** | **Discord**, **Slack**, or **Custom HTTP Endpoint** | Destination URL provided in subscriber/template |
| **Push** | **Firebase Cloud Messaging (FCM)** | `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` |

---

## 🏗️ Architecture Flow

```text
[ Client Application ]
        │  (x-api-key / Bearer)
        ▼
[ POST /api/v1/notify ] ──► [ Prisma DB: Save QUEUED Log ]
        │
        ▼
[ pg-boss Background Queue ] (Neon PostgreSQL)
        │
        ▼
[ NotificationWorkerService ]
        ├── 1. Verify User Preferences (Check Opt-In / Opt-Out)
        ├── 2. Render Template via Handlebars Engine
        ├── 3. Send via Channel Provider Adapter (Strategy Pattern)
        ├── 4. Update Audit Log (DELIVERED + messageId)
        └── 5. On Failure: Trigger Retry & Cross-Channel Fallback
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

All API requests require authentication using either header:
- `x-api-key: <YOUR_API_KEY>`
- `Authorization: Bearer <YOUR_API_KEY>`

### 1. Dispatch a Notification

```bash
curl -X POST http://localhost:3000/api/v1/notify \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_demo_100",
    "templateSlug": "welcome-user",
    "variables": {
      "name": "Jane Doe",
      "appName": "Acme Cloud"
    }
  }'
```

**Response (`202 Accepted`):**
```json
{
  "statusCode": 202,
  "data": {
    "status": "QUEUED",
    "logId": "5c98e1f0-0a2b-4d43-85b1-d9a1841e0123",
    "subscriberExternalId": "usr_demo_100",
    "templateSlug": "welcome-user",
    "channel": "EMAIL"
  },
  "timestamp": "2026-09-02T15:30:00.000Z"
}
```

---

### 2. Register / Upsert a Subscriber

```bash
curl -X POST http://localhost:3000/api/v1/subscribers/upsert \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "externalId": "usr_cust_8829",
    "email": "customer@example.com",
    "phoneNumber": "+6281234567890",
    "telegramChatId": "987654321",
    "webhookUrl": "https://discord.com/api/webhooks/xxx/yyy",
    "metadata": {
      "tier": "enterprise",
      "country": "ID"
    }
  }'
```

---

### 3. Create a Notification Template

```bash
curl -X POST http://localhost:3000/api/v1/templates \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "slug": "payment-success",
    "title": "Payment Success Notification",
    "subject": "Payment Received for Invoice #{{invoiceId}}",
    "bodyText": "Hi {{name}}, your payment of {{amount}} has been confirmed.",
    "bodyHtml": "<h2>Payment Received</h2><p>Hi <b>{{name}}</b>, your payment of <b>{{amount}}</b> is confirmed.</p>",
    "defaultChannel": "EMAIL",
    "fallbackChannel": "WHATSAPP"
  }'
```

---

### 4. Set Subscriber Channel Preference (Opt-In / Opt-Out)

```bash
curl -X POST http://localhost:3000/api/v1/preferences \
  -H "Content-Type: application/json" \
  -H "x-api-key: notif_sec_master_key_12345" \
  -d '{
    "subscriberExternalId": "usr_cust_8829",
    "channel": "EMAIL",
    "category": "MARKETING",
    "isEnabled": false
  }'
```

---

### 5. Inspect Audit Logs

```bash
# Query recent logs
curl -X GET "http://localhost:3000/api/v1/notify/logs?limit=10" \
  -H "x-api-key: notif_sec_master_key_12345"

# Query log by ID
curl -X GET "http://localhost:3000/api/v1/notify/logs/<LOG_ID>" \
  -H "x-api-key: notif_sec_master_key_12345"
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
