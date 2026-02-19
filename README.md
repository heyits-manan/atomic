# Atomic — Payment Gateway API

A high-performance, production-grade Payment Gateway API built with Node.js, TypeScript, and PostgreSQL. Features asynchronous payment processing, double-entry bookkeeping, idempotency, and Redis-backed rate limiting.

## Architecture

```
Client → Express API → PostgreSQL (persist PENDING) → Redis/BullMQ Queue
                                                            ↓
                                                      Background Worker
                                                            ↓
                                              Ledger Transfer (double-entry)
                                                            ↓
                                                   Update status → SUCCESS / FAILED
```

### Key Design Decisions

- **Async Payment Processing** — API returns `202 Accepted` immediately; the actual ledger transfer happens in a background worker via BullMQ
- **Double-Entry Bookkeeping** — Every payment creates a matched DEBIT/CREDIT ledger pair, ensuring the books always balance
- **ACID Transactions** — All ledger operations are wrapped in PostgreSQL transactions with row-level locking (`SELECT ... FOR UPDATE`)
- **Idempotency** — Duplicate requests with the same `Idempotency-Key` header are safely rejected
- **Fixed Window Rate Limiting** — Custom Redis-backed rate limiter (not a library) with per-route configuration

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js + TypeScript |
| **Framework** | Express 5 |
| **Database** | PostgreSQL 18 |
| **Queue** | Redis + BullMQ |
| **Migrations** | node-pg-migrate |
| **Validation** | Zod |
| **Logging** | Winston |
| **Security** | Helmet, CORS, SHA-256 API key hashing |
| **Testing** | Jest + ts-jest |
| **Containers** | Docker Compose |

## Getting Started

### Prerequisites

- Node.js ≥ 18
- Docker & Docker Compose

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/heyits-manan/atomic.git
cd atomic

# 2. Install dependencies
npm install

# 3. Start PostgreSQL & Redis
docker compose up -d

# 4. Create a .env file (see Environment Variables below)
cp .env.example .env  # or create manually

# 5. Run database migrations
npm run migrate:up

# 6. Seed the database (creates World Bank + Test Merchant accounts)
npx ts-node -r tsconfig-paths/register src/scripts/seed.ts

# 7. Start the development server
npm run dev
```

### Environment Variables

```env
NODE_ENV=development
PORT=3000

# PostgreSQL
DATABASE_URL=postgres://postgres:postgres@localhost:5432/atomic_payments
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=atomic_payments

# Redis
REDIS_URL=redis://localhost:6379

# Security
MERCHANT_API_KEY_HASH=<sha256-hash-of-your-api-key>

# CORS
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=debug
```

## API Reference

All protected endpoints require: `Authorization: Bearer <api-key>`

### Health Check

```
GET /api/v1/health
```

Returns `200` with `{ status: "healthy" }`. No authentication required.

### Create Payment

```
POST /api/v1/payments
```

Creates a payment and queues it for async processing.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer <api-key>` |
| `Idempotency-Key` | Recommended | Unique key to prevent duplicate charges |
| `Content-Type` | Yes | `application/json` |

**Body:**
```json
{
  "merchantId": "uuid",
  "amount": 5000,
  "currency": "USD",
  "source": "tok_visa",
  "description": "Order #1234"
}
```

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "id": "payment-uuid",
    "status": "PENDING",
    ...
  }
}
```

### Get Payment

```
GET /api/v1/payments/:id
```

Poll this endpoint to check payment status after creation.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment-uuid",
      "status": "SUCCESS",
      "merchantId": "...",
      "amount": 5000,
      "currency": "USD",
      ...
    }
  }
}
```

### Create Account

```
POST /api/v1/accounts
```

### Get Account

```
GET /api/v1/accounts/:id
```

## Payment Lifecycle

```
PENDING → PROCESSING → SUCCESS
                    ↘ FAILED
```

1. `POST /payments` → saves payment as `PENDING`, adds job to BullMQ queue
2. Worker picks up the job → updates status to `PROCESSING`
3. Worker performs ledger transfer (double-entry bookkeeping)
4. Status updated to `SUCCESS` or `FAILED` (with `failureReason`)

## Rate Limiting

| Limiter | Scope | Window | Limit |
|---------|-------|--------|-------|
| **Global** | All routes | 15 minutes | 100 requests |
| **Payment** | `POST /payments` | 1 minute | 10 requests |

Implemented as a custom fixed window counter using Redis `INCR` + `EXPIRE`. Returns `429 Too Many Requests` when exceeded.

## Project Structure

```
src/
├── api/
│   ├── controllers/       # Request handlers
│   ├── middlewares/        # Auth, validation, idempotency, rate limiter
│   ├── routes/             # Route definitions
│   └── schemas/            # Zod validation schemas
├── config/                 # Database, Redis, environment config
├── db/
│   ├── migrations/         # SQL migration scripts
│   └── repositories/       # Data access layer
├── lib/                    # Shared utilities (logger, errors)
├── queues/                 # BullMQ queue definitions
├── services/               # Business logic (Payment, Ledger)
├── workers/                # BullMQ background workers
├── __tests__/              # Jest integration tests
├── app.ts                  # Express app setup
└── server.ts               # Server entry point + graceful shutdown
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled production build |
| `npm test` | Run Jest tests |
| `npm run migrate:up` | Run pending migrations |
| `npm run migrate:down` | Rollback last migration |
| `npm run migrate:create -- <name>` | Create a new migration |

## License

ISC
