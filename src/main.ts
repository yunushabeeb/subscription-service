import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body parsing for Stripe webhooks
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter()); // Use the global exception filter

  app.use('/webhooks/stripe', express.raw({ type: 'application/json' })); // Stripe requires raw body for webhook verification

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Resilient Subscription Microservice')
    .setDescription(
      'A production-grade subscription service integrating Stripe for payment processing, built with NestJS, Prisma, and PostgreSQL.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter your JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('users', 'User registration and management')
    .addTag('auth', 'Authentication endpoints')
    .addTag('subscriptions', 'Stripe subscription management')
    .addTag('webhooks', 'Stripe webhook handlers')
    .addTag('admin', 'Admin only endpoints')
    .addTag('health', 'Service health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
