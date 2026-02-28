# Resilient Subscription Microservice

A production-grade subscription service built with **NestJS**, **Prisma**, **PostgreSQL**, and **Stripe**. Designed for real-world concerns including idempotent webhook processing, role-based access control, transactional consistency, and horizontal scalability.

---

## Table of Contents

- [Resilient Subscription Microservice](#resilient-subscription-microservice)
  - [Table of Contents](#table-of-contents)
  - [Tech Stack](#tech-stack)
  - [Architecture Overview](#architecture-overview)
    - [Key Architectural Principles](#key-architectural-principles)
  - [Project Structure](#project-structure)
  - [Domain Models](#domain-models)
    - [User](#user)
    - [Subscription](#subscription)
    - [WebhookEvent](#webhookevent)
  - [API Endpoints](#api-endpoints)
    - [Public Endpoints](#public-endpoints)
    - [Protected Endpoints (JWT Required)](#protected-endpoints-jwt-required)
    - [Admin Endpoints (JWT + ADMIN Role Required)](#admin-endpoints-jwt--admin-role-required)
    - [Documentation](#documentation)
  - [Getting Started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Local Development](#local-development)
    - [Running with Docker](#running-with-docker)
  - [Environment Variables](#environment-variables)
  - [Running Tests](#running-tests)
    - [Test Coverage](#test-coverage)
  - [Stripe Webhook Testing](#stripe-webhook-testing)
  - [Architecture Decisions](#architecture-decisions)
    - [NestJS over Express](#nestjs-over-express)
    - [Prisma 7 over TypeORM](#prisma-7-over-typeorm)
    - [PostgreSQL over MongoDB](#postgresql-over-mongodb)
    - [JWT over Sessions](#jwt-over-sessions)
    - [WebhookEvent Table for Idempotency](#webhookevent-table-for-idempotency)
    - [Transactions for Webhook Processing](#transactions-for-webhook-processing)
    - [Raw Body Parsing for Webhooks](#raw-body-parsing-for-webhooks)
    - [Role-Based Access Control](#role-based-access-control)
    - [Multi-Stage Docker Build](#multi-stage-docker-build)
  - [Tradeoffs](#tradeoffs)
    - [Node Modules Copy vs npm ci in Docker](#node-modules-copy-vs-npm-ci-in-docker)
    - [No Refresh Tokens](#no-refresh-tokens)
    - [No Rate Limiting](#no-rate-limiting)
    - [No Email Verification](#no-email-verification)
    - [In-Process Webhook Processing](#in-process-webhook-processing)
  - [What I'd Improve with 2 More Days](#what-id-improve-with-2-more-days)
  - [How I Would Scale This](#how-i-would-scale-this)
    - [Horizontal Scaling](#horizontal-scaling)
    - [Database Scaling](#database-scaling)
    - [Webhook Processing at Scale](#webhook-processing-at-scale)
    - [Caching](#caching)
    - [Infrastructure](#infrastructure)
  - [Security Considerations](#security-considerations)
  - [Package Decisions](#package-decisions)

---

## Tech Stack

| Tool                   | Purpose                                                        |
| ---------------------- | -------------------------------------------------------------- |
| **NestJS**             | Backend framework — structured, opinionated, built-in DI       |
| **Prisma 7**           | ORM — type-safe database access, migrations, schema management |
| **PostgreSQL 16**      | Relational database — ACID compliance, constraints, indexing   |
| **Stripe SDK**         | Payment processing — checkout sessions, webhook verification   |
| **JWT + Passport**     | Authentication — stateless, scalable token-based auth          |
| **bcrypt**             | Password hashing — industry standard, configurable salt rounds |
| **@prisma/adapter-pg** | Prisma 7 PostgreSQL driver adapter                             |
| **@nestjs/terminus**   | Health checks — database connectivity monitoring               |
| **@nestjs/swagger**    | API documentation — auto-generated from decorators             |
| **Docker + Compose**   | Containerisation — consistent environments, easy deployment    |
| **class-validator**    | Request validation — DTO-level input sanitisation              |

---

## Architecture Overview

The service follows a **layered architecture** with strict separation of concerns:

```
HTTP Request
     │
     ▼
┌─────────────┐
│  Controller │  ← Handles HTTP only. No business logic.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Service   │  ← Business logic, orchestration, validation
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Repository  │  ← Database queries only. Wraps Prisma.
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Prisma +   │  ← PostgreSQL via @prisma/adapter-pg
│  PostgreSQL │
└─────────────┘
```

### Key Architectural Principles

- **No business logic in controllers** — Controllers receive requests, delegate to services, return responses.
- **Repository pattern** — All database access is encapsulated in repository classes, making services testable without a real database.
- **Dependency Injection** — NestJS DI container wires all dependencies. Every class receives its dependencies via constructor injection.
- **Global modules** — `PrismaModule` and `ConfigModule` are declared global so they don't need re-importing across feature modules.
- **Domain-driven structure** — Code is organised by domain (users, auth, subscriptions, webhooks, admin) not by technical layer.

---

## Project Structure

```
src/
├── admin/                        # Admin-only endpoints
│   ├── admin.controller.ts
│   ├── admin.module.ts
│   └── admin.service.ts
├── auth/                         # Authentication
│   ├── dto/login.dto.ts
│   ├── strategies/jwt.strategy.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── common/                       # Shared utilities
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── guards/
│       ├── jwt-auth.guard.ts
│       └── roles.guard.ts
├── health/                       # Health check
│   ├── health.controller.ts
│   └── health.module.ts
├── prisma/                       # Database service
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── subscriptions/                # Subscription management
│   ├── dto/checkout.dto.ts
│   ├── subscriptions.controller.ts
│   ├── subscriptions.module.ts
│   ├── subscriptions.repository.ts
│   └── subscriptions.service.ts
├── users/                        # User management
│   ├── dto/create-user.dto.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   ├── users.repository.ts
│   └── users.service.ts
├── webhooks/                     # Stripe webhook processing
│   ├── webhooks.controller.ts
│   ├── webhooks.module.ts
│   └── webhooks.service.ts
├── app.module.ts
└── main.ts
prisma/
├── migrations/
│   └── 20260227133026_init/
│       └── migration.sql
└── schema.prisma
prisma.config.ts                  # Prisma 7 config
docker-compose.yml
Dockerfile
```

---

## Domain Models

### User

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String         # bcrypt hashed
  name          String
  role          Role           @default(USER)      # USER | ADMIN
  status        UserStatus     @default(INACTIVE)  # INACTIVE | ACTIVE
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  subscriptions Subscription[]

  @@index([email])   # Fast login lookups
  @@index([status])  # Fast admin filtering
}
```

### Subscription

```prisma
model Subscription {
  id         String             @id @default(uuid())
  userId     String
  user       User               @relation(fields: [userId], references: [id])
  status     SubscriptionStatus @default(PENDING)  # PENDING | ACTIVE | FAILED | CANCELLED
  paymentId  String?            # Stripe payment_intent ID
  eventId    String?            @unique             # Stripe event ID
  checkoutId String?            @unique             # Stripe checkout session ID
  startedAt  DateTime?
  endsAt     DateTime?
  createdAt  DateTime           @default(now())
  updatedAt  DateTime           @updatedAt

  @@index([userId])  # Fast user subscription lookups
  @@index([status])  # Fast status filtering
}
```

### WebhookEvent

```prisma
model WebhookEvent {
  id          String   @id @default(uuid())
  eventId     String   @unique   # Stripe event ID — guarantees idempotency
  type        String
  processedAt DateTime @default(now())

  @@index([eventId])  # Fast duplicate detection
}
```

---

## API Endpoints

### Public Endpoints

| Method | Endpoint           | Description                   |
| ------ | ------------------ | ----------------------------- |
| `POST` | `/users`           | Register a new user           |
| `POST` | `/auth/login`      | Login and receive JWT token   |
| `POST` | `/webhooks/stripe` | Receive Stripe webhook events |
| `GET`  | `/health`          | Service health check          |

### Protected Endpoints (JWT Required)

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| `POST` | `/subscriptions/checkout` | Create Stripe checkout session |

### Admin Endpoints (JWT + ADMIN Role Required)

| Method | Endpoint                               | Description                   |
| ------ | -------------------------------------- | ----------------------------- |
| `GET`  | `/admin/users?status=ACTIVE\|INACTIVE` | List users filtered by status |

### Documentation

Swagger UI is available at:

```
http://localhost:4000/api/docs
```

---

## Getting Started

### Prerequisites

- Node.js v20+
- Docker and Docker Compose
- A Stripe account (free test account works)
- Stripe CLI (for local webhook testing)

### Local Development

**1. Clone the repository:**

```bash
git clone <repository-url>
cd subscription-service
```

**2. Install dependencies:**

```bash
npm install
```

**3. Set up environment variables:**

```bash
cp .env.example .env
# Fill in your values in .env
```

**4. Start PostgreSQL via Docker:**

```bash
docker run --name subscription-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=subscription_db \
  -p 5433:5432 \
  -d postgres
```

**5. Run database migrations:**

```bash
npx prisma migrate dev
```

**6. Start the application:**

```bash
npm run start:dev
```

Application will be available at `http://localhost:4000`

### Running with Docker

**Build and run everything with one command:**

```bash
docker-compose up --build
```

This will:

- Start PostgreSQL container with health checks
- Wait for database to be ready
- Run all pending migrations automatically
- Start the application on port 4000

**Stop everything:**

```bash
docker-compose down
```

**Stop and remove all data volumes:**

```bash
docker-compose down -v
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5433/subscription_db"

# JWT — Use a randomly generated 256-bit secret in production
JWT_SECRET="your-256-bit-secret-here"
JWT_EXPIRES_IN="24h"

# Stripe
STRIPE_SECRET_KEY="sk_test_your_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_secret_here"
STRIPE_SUCCESS_URL="http://localhost:4000/success"
STRIPE_CANCEL_URL="http://localhost:4000/cancel"

# App
PORT=4000
NODE_ENV="development"
```

> **Security note:** JWT secret is a randomly generated 256-bit key. In production this should be stored in a secrets manager such as AWS Secrets Manager or HashiCorp Vault — never in plain environment files.

---

## Running Tests

**Run all tests:**

```bash
npm run test
```

**Run tests with coverage:**

```bash
npm run test:cov
```

**Run tests in watch mode:**

```bash
npm run test:watch
```

### Test Coverage

Every module has dedicated unit tests:

| Module                  | Test File                          |
| ----------------------- | ---------------------------------- |
| PrismaService           | `prisma.service.spec.ts`           |
| UsersService            | `users.service.spec.ts`            |
| UsersController         | `users.controller.spec.ts`         |
| AuthService             | `auth.service.spec.ts`             |
| AuthController          | `auth.controller.spec.ts`          |
| SubscriptionsService    | `subscriptions.service.spec.ts`    |
| SubscriptionsController | `subscriptions.controller.spec.ts` |
| WebhooksService         | `webhooks.service.spec.ts`         |
| WebhooksController      | `webhooks.controller.spec.ts`      |
| AdminService            | `admin.service.spec.ts`            |
| AdminController         | `admin.controller.spec.ts`         |

All tests use mocks — no real database or Stripe API calls are made during testing.

---

## Stripe Webhook Testing

**1. Install Stripe CLI:**

```bash
# Mac
brew install stripe/stripe-cli/stripe

# Linux/Windows — download from https://github.com/stripe/stripe-cli/releases
```

**2. Login:**

```bash
stripe login
```

**3. Forward webhooks to local server:**

```bash
stripe listen --forward-to localhost:4000/webhooks/stripe
```

**4. Trigger test events:**

```bash
# Simulate successful payment
stripe trigger checkout.session.completed

# Simulate failed payment
stripe trigger invoice.payment_failed
```

> **Important:** The `/webhooks/stripe` endpoint uses raw body parsing. Standard JSON middleware is bypassed for this route to preserve the raw payload required for Stripe signature verification.

---

## Architecture Decisions

### NestJS over Express

NestJS was chosen over plain Express because the case study requirements — Controller/Service/Repository separation, dependency injection, and domain modeling — map directly to NestJS's module architecture. NestJS enforces these patterns structurally rather than relying on developer discipline.

### Prisma 7 over TypeORM

Prisma was chosen for its superior developer experience, cleaner TypeScript type generation, and more intuitive migration system. TypeORM, while more native to NestJS, has known bugs and a more complex API. Prisma's schema-first approach also makes the data model immediately readable to non-backend team members.

### PostgreSQL over MongoDB

The subscription domain is inherently relational — users have subscriptions, subscriptions have payment events. PostgreSQL's ACID compliance, foreign key constraints, and transactional guarantees make it the correct choice. A document database would require application-level consistency logic that PostgreSQL handles natively.

### JWT over Sessions

JWT authentication is stateless — no session store needed. This makes the service horizontally scalable from day one. Any instance can validate any token without shared state. For a service designed to be consumed by multiple other services, this is essential.

### WebhookEvent Table for Idempotency

Stripe can deliver the same webhook event multiple times. Rather than relying on Stripe's at-least-once delivery guarantee and hoping for the best, every processed event ID is stored in the `WebhookEvent` table. Before processing any event, the service checks for an existing record with that event ID. Duplicate events return `{ received: true }` immediately without reprocessing. This is the production standard approach.

### Transactions for Webhook Processing

Webhook processing involves multiple database operations — storing the event, updating subscription status, updating user status. These operations are wrapped in a `prisma.$transaction()` to ensure atomicity. If any operation fails, all changes are rolled back, preventing partial state corruption.

### Raw Body Parsing for Webhooks

Stripe signature verification requires the raw request body as a Buffer. NestJS's default JSON middleware parses the body before it reaches the controller, destroying the raw payload. The `/webhooks/stripe` route is configured with `express.raw()` middleware to bypass JSON parsing specifically for that route while keeping JSON parsing active everywhere else.

### Role-Based Access Control

The admin endpoint is protected by two guards — `JwtAuthGuard` (authentication) and `RolesGuard` (authorisation). These are separate concerns deliberately. Authentication verifies identity. Authorisation verifies permission. The `@Roles()` decorator with `Reflector` allows role requirements to be declared at the controller level cleanly.

### Multi-Stage Docker Build

The Dockerfile uses a builder stage and a production stage. The builder stage compiles TypeScript. The production stage copies only the compiled output — keeping the production image lean and free of development dependencies and source code.

---

## Tradeoffs

### Node Modules Copy vs npm ci in Docker

The current Docker build copies `node_modules` from the host rather than running `npm ci` inside the container. This was necessary due to npm registry timeout issues in the build environment. In a production CI/CD pipeline (GitHub Actions, AWS CodeBuild), `npm ci` would be used instead — the network is reliable and this approach produces a clean, reproducible build. This is documented as a known improvement.

### No Refresh Tokens

The current JWT implementation uses a single access token with a 24-hour expiry. Production systems should implement refresh tokens — short-lived access tokens (15 minutes) paired with long-lived refresh tokens stored securely. This was a conscious scope decision for the MVP.

### No Rate Limiting

API endpoints currently have no rate limiting. Production deployments should implement `@nestjs/throttler` to prevent brute force attacks on the login endpoint and abuse of the checkout endpoint.

### No Email Verification

Users are created immediately without email verification. A production system would send a verification email and keep the user in INACTIVE status until verified.

### In-Process Webhook Processing

Webhooks are currently processed synchronously within the HTTP request lifecycle. For high-throughput scenarios, this should be moved to a background queue (Redis + BullMQ) so the HTTP response returns immediately to Stripe and processing happens asynchronously.

---

## What I'd Improve with 2 More Days

1. **Refresh token implementation** — Short-lived access tokens paired with secure refresh tokens stored in the database with rotation on use.

2. **Background queue for webhooks** — Move webhook processing to BullMQ + Redis queue. HTTP handler stores the raw event and returns 200 immediately. Worker processes events asynchronously — more resilient, handles traffic spikes.

3. **Rate limiting** — `@nestjs/throttler` on login (5 attempts per minute), checkout (10 per hour), and webhook endpoints.

4. **Email verification** — Nodemailer integration with verification token sent on registration. User remains INACTIVE until verified.

5. **Complete CRUD for users** — Update profile, change password with current password verification, delete account with subscription cancellation.

6. **Proper CI/CD pipeline** — GitHub Actions workflow for automated testing, Docker build with `npm ci` (not node_modules copy), and deployment to cloud provider.

7. **Integration tests** — End-to-end tests using a real test database and Stripe test mode to verify the complete flow from registration to active subscription.

8. **Subscription management endpoints** — Cancel subscription, view subscription history, upgrade/downgrade plan.

9. **Structured logging** — Replace NestJS default logger with Winston or Pino for JSON-structured logs compatible with log aggregation tools like Datadog or CloudWatch.

10. **Environment-specific configuration** — Separate config validation schemas for development, staging, and production environments using `@nestjs/config` Joi validation.

---

## How I Would Scale This

### Horizontal Scaling

The service is stateless by design — JWT authentication requires no shared session store. Multiple instances can run behind a load balancer (AWS ALB, Nginx) with zero configuration changes. Each instance independently validates JWT tokens and queries the database.

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
       ┌──────────┐   ┌──────────┐   ┌──────────┐
       │  App     │   │  App     │   │  App     │
       │ Instance │   │ Instance │   │ Instance │
       └────┬─────┘   └────┬─────┘   └────┬─────┘
            └──────────────┴──────────────┘
                           │
                    ┌──────┴──────┐
                    │  PostgreSQL │
                    │  (Primary)  │
                    └─────────────┘
```

### Database Scaling

- **Read replicas** — Route read-heavy queries (admin user lists, subscription lookups) to read replicas. Write operations (webhook processing, user creation) go to the primary.
- **Connection pooling** — PgBouncer between the application and PostgreSQL to manage connection limits at scale.
- **Database indexing** — Already implemented on high-traffic query fields (email, status, userId, eventId).

### Webhook Processing at Scale

- **Decouple with a queue** — Move webhook processing to Redis + BullMQ. The HTTP handler stores the raw Stripe payload in a queue and returns 200 to Stripe immediately. Worker processes consume events asynchronously with retry logic and dead letter queues for failed events.

```
Stripe → POST /webhooks/stripe → Queue (Redis/BullMQ) → Worker Processes
                ↓
           Return 200 immediately
```

### Caching

- **Redis caching** — Cache frequently accessed data like user subscription status checks. Reduces database load for high-frequency reads.
- **Cache invalidation** — Invalidate user cache on webhook events that change subscription or user status.

### Infrastructure

- **Containerised deployment** — Docker Compose for local development. Kubernetes (EKS/GKE) for production with auto-scaling based on CPU and request metrics.
- **Secrets management** — AWS Secrets Manager or HashiCorp Vault for JWT secrets, Stripe keys, and database credentials. No secrets in environment files in production.
- **Monitoring** — Prometheus metrics + Grafana dashboards. Datadog APM for distributed tracing. PagerDuty for alerts on error rate thresholds.

---

## Security Considerations

- **Password hashing** — bcrypt with 12 salt rounds. Never stored or returned in plain text.
- **JWT security** — 256-bit randomly generated secret. 24-hour expiry. Bearer token in Authorization header only.
- **Stripe webhook verification** — Every webhook verified against Stripe signature using `stripe.webhooks.constructEvent()`. Requests with invalid signatures are rejected with 400.
- **Input validation** — Every endpoint validates request body against DTOs using `class-validator`. Unknown properties are stripped (`whitelist: true`) and requests with extra properties are rejected (`forbidNonWhitelisted: true`).
- **Role-based access** — Admin endpoints protected by both JWT authentication and ADMIN role check.
- **Global exception filter** — All unhandled exceptions caught and returned as structured JSON responses. Stack traces logged server-side only — never exposed to clients.
- **Raw body protection** — Webhook endpoint uses `express.raw()` middleware — only that specific route receives raw buffer payloads.

---

## Package Decisions

| Package                                 | Why Used                                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `@nestjs/config`                        | Loads `.env` variables into NestJS config service — clean access without `process.env` scattered everywhere |
| `@nestjs/jwt`                           | Official NestJS JWT library — generates and verifies tokens                                                 |
| `@nestjs/passport` + `passport-jwt`     | Connects Passport.js JWT strategy to NestJS guards cleanly                                                  |
| `bcrypt`                                | Industry standard password hashing — configurable work factor, resistant to GPU attacks                     |
| `class-validator` + `class-transformer` | DTO-level validation — declarative rules via decorators, transforms raw JSON to typed class instances       |
| `@prisma/client`                        | Type-safe database client generated from Prisma schema                                                      |
| `@prisma/adapter-pg`                    | Prisma 7 required PostgreSQL driver adapter                                                                 |
| `stripe`                                | Official Stripe SDK — checkout session creation and webhook signature verification                          |
| `@nestjs/terminus`                      | Health check framework — database ping check on `/health` endpoint                                          |
| `@nestjs/swagger`                       | Auto-generates Swagger UI from controller decorators                                                        |
| `dotenv`                                | Loads `.env` file for Prisma config in Prisma 7                                                             |

---

_Built with ownership, care, and production-grade thinking._
