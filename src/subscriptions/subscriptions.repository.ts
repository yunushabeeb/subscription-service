import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new subscription record in the database with status PENDING when a checkout session is created
  async create(userId: string, checkoutId: string) {
    return this.prisma.subscription.create({
      data: {
        userId,
        checkoutId,
        status: SubscriptionStatus.PENDING,
      },
    });
  }

  // Find a subscription by its Stripe checkout session ID
  async findByCheckoutId(checkoutId: string) {
    return this.prisma.subscription.findUnique({
      where: { checkoutId },
    });
  }

  // Find all subscriptions for a given user ID
  async findByUserId(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
    });
  }

  // Update a subscription's status and other details based on the Stripe checkout session ID when we receive a webhook event confirming the payment
  async updateByCheckoutId(
    checkoutId: string,
    data: {
      status: SubscriptionStatus;
      paymentId?: string;
      eventId?: string;
      startedAt?: Date;
    },
  ) {
    return this.prisma.subscription.update({
      where: { checkoutId },
      data,
    });
  }

  // Update a subscription's status and other details based on the Stripe event ID when we receive a webhook event confirming the payment
  async updateByEventId(
    subscriptionId: string,
    data: {
      status: SubscriptionStatus;
      eventId?: string;
    },
  ) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data,
    });
  }

  // Find the active subscription for a user (if any) to determine if they have access to premium features
  async findActiveByUserId(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
  }
}
