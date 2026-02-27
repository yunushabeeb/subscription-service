Let's build the Webhooks module — this is the most important and impressive part of the entire project. 🔥

Step 1 — Update the Service

Open src/webhooks/webhooks.service.ts and replace everything:

import {
Injectable,
BadRequestException,
Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { SubscriptionStatus } from '@prisma/client';
import Stripe from 'stripe';

@Injectable()
export class WebhooksService {
private stripe: Stripe;
private readonly logger = new Logger(WebhooksService.name);

constructor(
private readonly configService: ConfigService,
private readonly prisma: PrismaService,
private readonly subscriptionsRepository: SubscriptionsRepository,
) {
this.stripe = new Stripe(
this.configService.get<string>('STRIPE_SECRET_KEY'),
);
}

async handleWebhook(payload: Buffer, signature: string) {
let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    // Idempotency check — ignore duplicate webhook events
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existingEvent) {
      this.logger.log(`Duplicate webhook event ignored: ${event.id}`);
      return { received: true };
    }

    // Process event in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Store the event first to prevent duplicate processing
      await tx.webhookEvent.create({
        data: {
          eventId: event.id,
          type: event.type,
        },
      });

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(
            event.data.object as Stripe.Checkout.Session,
            tx,
          );
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(
            event.data.object as Stripe.Invoice,
            tx,
          );
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    });

    return { received: true };

}

private async handleCheckoutCompleted(
session: Stripe.Checkout.Session,
tx: any,
) {
this.logger.log(`Processing checkout.session.completed: ${session.id}`);

    await tx.subscription.update({
      where: { checkoutId: session.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        paymentId: session.payment_intent as string,
        eventId: session.id,
        startedAt: new Date(),
      },
    });

    // Activate the user account
    if (session.metadata?.userId) {
      await tx.user.update({
        where: { id: session.metadata.userId },
        data: { status: 'ACTIVE' },
      });
    }

    this.logger.log(`Subscription activated for session: ${session.id}`);

}

private async handlePaymentFailed(invoice: Stripe.Invoice, tx: any) {
this.logger.log(`Processing invoice.payment_failed: ${invoice.id}`);

    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      await tx.subscription.updateMany({
        where: {
          paymentId: subscriptionId,
          status: SubscriptionStatus.ACTIVE,
        },
        data: {
          status: SubscriptionStatus.FAILED,
          eventId: invoice.id,
        },
      });
    }

    this.logger.log(`Subscription marked as failed for invoice: ${invoice.id}`);

}
}
Step 2 — Update the Controller

Open src/webhooks/webhooks.controller.ts and replace everything:
import {
Controller,
Post,
Headers,
Req,
HttpCode,
HttpStatus,
BadRequestException,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
constructor(private readonly webhooksService: WebhooksService) {}

@Post('stripe')
@HttpCode(HttpStatus.OK)
async handleStripeWebhook(
@Headers('stripe-signature') signature: string,
@Req() request: Request,
) {
if (!signature) {
throw new BadRequestException('Missing stripe-signature header');
}

    const payload = request.body;

    if (!Buffer.isBuffer(payload)) {
      throw new BadRequestException(
        'Webhook payload must be raw buffer',
      );
    }

    return this.webhooksService.handleWebhook(payload, signature);

}
}
Step 3 — Update the Module

Open src/webhooks/webhooks.module.ts and replace everything:

import { Module } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
imports: [SubscriptionsModule],
controllers: [WebhooksController],
providers: [WebhooksService],
})
export class WebhooksModule {}
Step 4 — Update SubscriptionsModule to export Repository

Open src/subscriptions/subscriptions.module.ts and update exports:

import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepository } from './subscriptions.repository';

@Module({
controllers: [SubscriptionsController],
providers: [SubscriptionsService, SubscriptionsRepository],
exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
Step 5 — CRITICAL: Configure raw body parsing

Stripe webhook signature verification requires the raw request body as a Buffer. NestJS parses JSON by default which breaks this. Update src/main.ts:

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import \* as express from 'express';

async function bootstrap() {
const app = await NestFactory.create(AppModule, {
rawBody: true,
});

app.useGlobalPipes(
new ValidationPipe({
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
}),
);

app.useGlobalFilters(new AllExceptionsFilter());

app.use(
'/webhooks/stripe',
express.raw({ type: 'application/json' }),
);

const port = process.env.PORT || 4000;
await app.listen(port);
console.log(`Application running on port ${port}`);
}

bootstrap();
Done with all 5 steps? 🔥

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
docker run --name subscription-db \
 -e POSTGRES_PASSWORD=password \
 -e POSTGRES_DB=subscription_db \
 -p 5433:5432 \
 -d postgres
