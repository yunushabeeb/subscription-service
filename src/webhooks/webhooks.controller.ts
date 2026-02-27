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
import type { Request } from 'express';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request,
  ) {
    // Stripe sends webhook events with a signature in the 'stripe-signature' header. We need to verify this signature to ensure that the request is coming from Stripe and has not been tampered with. If the signature is missing or invalid, we should reject the request with a 400 Bad Request response to prevent processing of potentially malicious requests.
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Stripe requires the raw request body to verify the webhook signature.
    const payload = request.body as Buffer;

    // If the payload is not a raw buffer, we cannot verify the signature, so we should reject the request with a 400 Bad Request response to ensure that we only process valid webhook events.
    if (!Buffer.isBuffer(payload)) {
      throw new BadRequestException('Webhook payload must be raw buffer');
    }

    // Handle the webhook event in the service, which will verify the signature, process the event, and update subscription status and user accounts accordingly.
    return this.webhooksService.handleWebhook(payload, signature);
  }
}
