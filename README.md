subscription-service/
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app.module.ts
│ ├── main.ts
│ ├── common/
│ │ ├── guards/
│ │ │ └── jwt-auth.guard.ts
│ │ ├── decorators/
│ │ │ └── current-user.decorator.ts
│ │ └── filters/
│ │ └── http-exception.filter.ts
│ ├── auth/
│ │ ├── auth.module.ts
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── strategies/
│ │ │ └── jwt.strategy.ts
│ │ └── dto/
│ │ └── login.dto.ts
│ ├── users/
│ │ ├── users.module.ts
│ │ ├── users.controller.ts
│ │ ├── users.service.ts
│ │ ├── users.repository.ts
│ │ └── dto/
│ │ └── create-user.dto.ts
│ ├── subscriptions/
│ │ ├── subscriptions.module.ts
│ │ ├── subscriptions.controller.ts
│ │ ├── subscriptions.service.ts
│ │ ├── subscriptions.repository.ts
│ │ └── dto/
│ │ └── checkout.dto.ts
│ ├── webhooks/
│ │ ├── webhooks.module.ts
│ │ ├── webhooks.controller.ts
│ │ └── webhooks.service.ts
│ └── admin/
│ ├── admin.module.ts
│ ├── admin.controller.ts
│ └── admin.service.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md

Database Schemas
model User {
id String @id @default(uuid())
email String @unique
password String
name String
role Role @default(USER)
status UserStatus @default(INACTIVE)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
subscriptions Subscription[]

@@index([email])
@@index([status])
}

model Subscription {
id String @id @default(uuid())
userId String
user User @relation(fields: [userId], references: [id])
status SubscriptionStatus @default(PENDING)
paymentId String?
eventId String? @unique
checkoutId String? @unique
startedAt DateTime?
endsAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([userId])
@@index([status])
}

model WebhookEvent {
id String @id @default(uuid())
eventId String @unique
type String
processedAt DateTime @default(now())

@@index([eventId])
}

enum Role {
USER
ADMIN
}

enum UserStatus {
ACTIVE
INACTIVE
}

enum SubscriptionStatus {
PENDING
ACTIVE
FAILED
CANCELLED
}

Local DB Docker
docker run --name postgres-dev \
 -e POSTGRES_PASSWORD=password \
 -e POSTGRES_DB=subscription_db \
 -p 5432:5432 \
 -d postgres
