import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsRepository } from './subscriptions.repository';
import { CreateCheckoutDto } from './dto/checkout.dto';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;

  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
    private readonly configService: ConfigService,
  ) {
    // Initialize Stripe with the secret key from environment variables
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
    );
  }

  // Create a Stripe checkout session for the user to subscribe to a plan
  async createCheckout(userId: string, createCheckoutDto: CreateCheckoutDto) {
    // Create a Stripe checkout session with the specified price ID and user metadata
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: createCheckoutDto.priceId,
          quantity: 1,
        },
      ],
      success_url: this.configService.get<string>('STRIPE_SUCCESS_URL'),
      cancel_url: this.configService.get<string>('STRIPE_CANCEL_URL'),
      metadata: {
        userId,
      },
    });

    // Save the subscription in the database with status PENDING until we receive a webhook event confirming the payment
    await this.subscriptionsRepository.create(userId, session.id);

    // Return the checkout URL and session ID to the client so they can redirect the user to Stripe's checkout page
    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  // Get all subscriptions for a user
  async findByUserId(userId: string) {
    return this.subscriptionsRepository.findByUserId(userId);
  }
}
