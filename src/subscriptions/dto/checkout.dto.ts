import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCheckoutDto {
  // The price ID of the subscription plan the user wants to subscribe to
  @IsString()
  @IsNotEmpty()
  priceId: string;
}
