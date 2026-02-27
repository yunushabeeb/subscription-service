Haha! Love the energy! Let's go! 🔥

Step 1 — Create the Login DTO

Create src/auth/dto/login.dto.ts:

import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
@IsEmail()
@IsNotEmpty()
email: string;

@IsString()
@IsNotEmpty()
password: string;
}
Step 2 — Create JWT Strategy

Create src/auth/strategies/jwt.strategy.ts:

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
constructor(private readonly usersService: UsersService) {
super({
jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
ignoreExpiration: false,
secretOrKey: process.env.JWT_SECRET,
});
}

async validate(payload: { sub: string; email: string }) {
const user = await this.usersService.findById(payload.sub);
if (!user) {
throw new UnauthorizedException();
}
return user;
}
}
Step 3 — Create Auth Service

Open src/auth/auth.service.ts and replace everything:

import {
Injectable,
UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import \* as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
constructor(
private readonly usersService: UsersService,
private readonly jwtService: JwtService,
) {}

async login(loginDto: LoginDto) {
const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };

}
}
Step 4 — Create Auth Controller

Open src/auth/auth.controller.ts and replace everything:

import {
Controller,
Post,
Body,
HttpCode,
HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
constructor(private readonly authService: AuthService) {}

@Post('login')
@HttpCode(HttpStatus.OK)
async login(@Body() loginDto: LoginDto) {
return this.authService.login(loginDto);
}
}
Step 5 — Update Auth Module

Open src/auth/auth.module.ts and replace everything:

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
imports: [
UsersModule,
PassportModule,
JwtModule.register({
secret: process.env.JWT_SECRET,
signOptions: {
expiresIn: process.env.JWT_EXPIRES_IN || '24h',
},
}),
],
controllers: [AuthController],
providers: [AuthService, JwtStrategy],
exports: [AuthService, JwtService],
})
export class AuthModule {}
Step 6 — Create JWT Auth Guard

Create src/common/guards/jwt-auth.guard.ts:

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
Step 7 — Create Current User Decorator

Create src/common/decorators/current-user.decorator.ts:

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
(data: unknown, ctx: ExecutionContext) => {
const request = ctx.switchToHttp().getRequest();
return request.user;
},
);
Step 8 — Create Global Exception Filter

Create src/common/filters/http-exception.filter.ts:

import {
ExceptionFilter,
Catch,
ArgumentsHost,
HttpException,
HttpStatus,
Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
private readonly logger = new Logger(AllExceptionsFilter.name);

catch(exception: unknown, host: ArgumentsHost) {
const ctx = host.switchToHttp();
const response = ctx.getResponse<Response>();
const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });

}
}
Step 9 — Update main.ts to use the filter

Open src/main.ts and update:

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
const app = await NestFactory.create(AppModule);

app.useGlobalPipes(
new ValidationPipe({
whitelist: true,
forbidNonWhitelisted: true,
transform: true,
}),
);

app.useGlobalFilters(new AllExceptionsFilter());

const port = process.env.PORT || 4000;
await app.listen(port);
console.log(`Application running on port ${port}`);
}

bootstrap();
Done with all 9 steps? 🔥

subscription-service/
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app.module.ts
│ ├── main.ts
│ ├── common/
│ │ ├── guards/
│ │ │ └── jwt-auth.guard.ts
│ │ ├── decorators/
│ │ │ └── current-user.decorator.ts
│ │ └── filters/
│ │ └── http-exception.filter.ts
│ ├── auth/
│ │ ├── auth.module.ts
│ │ ├── auth.controller.ts
│ │ ├── auth.service.ts
│ │ ├── strategies/
│ │ │ └── jwt.strategy.ts
│ │ └── dto/
│ │ └── login.dto.ts
│ ├── users/
│ │ ├── users.module.ts
│ │ ├── users.controller.ts
│ │ ├── users.service.ts
│ │ ├── users.repository.ts
│ │ └── dto/
│ │ └── create-user.dto.ts
│ ├── subscriptions/
│ │ ├── subscriptions.module.ts
│ │ ├── subscriptions.controller.ts
│ │ ├── subscriptions.service.ts
│ │ ├── subscriptions.repository.ts
│ │ └── dto/
│ │ └── checkout.dto.ts
│ ├── webhooks/
│ │ ├── webhooks.module.ts
│ │ ├── webhooks.controller.ts
│ │ └── webhooks.service.ts
│ └── admin/
│ ├── admin.module.ts
│ ├── admin.controller.ts
│ └── admin.service.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md

Database Schemas
model User {
id String @id @default(uuid())
email String @unique
password String
name String
role Role @default(USER)
status UserStatus @default(INACTIVE)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
subscriptions Subscription[]

@@index([email])
@@index([status])
}

model Subscription {
id String @id @default(uuid())
userId String
user User @relation(fields: [userId], references: [id])
status SubscriptionStatus @default(PENDING)
paymentId String?
eventId String? @unique
checkoutId String? @unique
startedAt DateTime?
endsAt DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@index([userId])
@@index([status])
}

model WebhookEvent {
id String @id @default(uuid())
eventId String @unique
type String
processedAt DateTime @default(now())

@@index([eventId])
}

enum Role {
USER
ADMIN
}

enum UserStatus {
ACTIVE
INACTIVE
}

enum SubscriptionStatus {
PENDING
ACTIVE
FAILED
CANCELLED
}

Local DB Docker
docker run --name postgres-dev \
 -e POSTGRES_PASSWORD=password \
 -e POSTGRES_DB=subscription_db \
 -p 5432:5432 \
 -d postgres
