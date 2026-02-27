import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { SubscriptionStatus, Prisma } from '@prisma/client';
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
    // Initialize Stripe with the secret key from environment variables
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
    );
  }

  // Handle incoming Stripe webhook events to update subscription status and user accounts based on payment events
  async handleWebhook(payload: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      // Verify the webhook signature to ensure the request is coming from Stripe and has not been tampered with. This is crucial for security to prevent unauthorized updates to subscription status.
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '',
      );
    } catch (err: unknown) {
      // Log the error and return a 400 Bad Request response if signature verification fails to prevent processing of potentially malicious requests
      this.logger.error(
        `Webhook signature verification failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      throw new BadRequestException(
        `Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }

    // Idempotency check — ignore duplicate webhook events
    const existingEvent = await this.prisma.webhookEvent.findUnique({
      where: { eventId: event.id },
    });

    // If we have already processed this event, we can safely ignore it to prevent duplicate updates to subscription status and user accounts. This is important because Stripe may retry sending the same event multiple times if it does not receive a successful response, and we want to ensure that our system remains consistent and does not apply the same update multiple times.
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

      // Handle different event types to update subscription status and user accounts accordingly based on the payment events received from Stripe. This allows us to keep our system in sync with Stripe's payment status and ensure that users have access to premium features based on their subscription status.
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object, tx);
          break;

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object, tx);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }
    });

    return { received: true };
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
    tx: Prisma.TransactionClient,
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

  private async handlePaymentFailed(
    invoice: Stripe.Invoice,
    tx: Prisma.TransactionClient,
  ) {
    this.logger.log(`Processing invoice.payment_failed: ${invoice.id}`);

    // Extract subscription id from invoice shapes: parent.subscription_details or line items
    let subscriptionId: string | undefined;

    if (
      invoice.parent &&
      invoice.parent.subscription_details &&
      typeof invoice.parent.subscription_details.subscription === 'string'
    ) {
      subscriptionId = invoice.parent.subscription_details.subscription;
    } else if (
      invoice.lines &&
      Array.isArray((invoice.lines as { data?: unknown[] }).data)
    ) {
      const found = (
        invoice.lines as { data?: Stripe.InvoiceLineItem[] }
      ).data?.find((l) => typeof l.subscription === 'string' && l.subscription);
      if (found && typeof found.subscription === 'string') {
        subscriptionId = found.subscription;
      }
    }

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
