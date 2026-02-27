import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateCheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('subscriptions')
@ApiBearerAuth('JWT-auth') // This adds a lock icon to the Swagger UI for this controller, indicating that the endpoints require authentication. It also tells Swagger to include an Authorization header with a Bearer token (the JWT) when making requests to these endpoints from the Swagger UI, so you can test the authenticated endpoints directly from the documentation after logging in and obtaining a JWT token.
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse({
    status: 21,
    description: 'Checkout session created successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createCheckout(
    // The @CurrentUser decorator extracts the user's ID from the JWT token and makes it available in the controller method so we can link the subscription to the user when we create a Stripe checkout session and save the subscription in the database.
    @CurrentUser() user: { id: string },
    // The CreateCheckoutDto contains the priceId of the subscription plan the user wants to subscribe to, which we will use to create a Stripe checkout session for that plan. We also pass the user's ID from the JWT token as metadata to Stripe so we can link the subscription back to the user when we receive webhook events confirming the payment.
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    // Call the service method to create a Stripe checkout session for the user and return the checkout URL and session ID to the client so they can redirect the user to Stripe's checkout page.
    return this.subscriptionsService.createCheckout(user.id, createCheckoutDto);
  }
}
