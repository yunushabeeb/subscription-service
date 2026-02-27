import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that do not have any decorators
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter()); // Use the global exception filter

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application running on port ${port}`);
}
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();
