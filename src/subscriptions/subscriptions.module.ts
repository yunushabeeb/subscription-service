import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepository } from './subscriptions.repository';

@Module({
  providers: [SubscriptionsService, SubscriptionsRepository],
  controllers: [SubscriptionsController],
  exports: [SubscriptionsService, SubscriptionsRepository],
})
export class SubscriptionsModule {}
