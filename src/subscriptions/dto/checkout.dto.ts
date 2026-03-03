import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  @ApiProperty({
    example: 'price_1RAbCdEfGhIjKlMn',
    description: 'Stripe Price ID from your Stripe dashboard',
  })
  // The price ID of the subscription plan the user wants to subscribe to
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
