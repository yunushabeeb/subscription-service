🔥 Let's build the Users module now.

Step 1 — Create the DTO

Create a new file src/users/dto/create-user.dto.ts:

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
@IsString()
@IsNotEmpty()
name: string;

@IsEmail()
@IsNotEmpty()
email: string;

@IsString()
@IsNotEmpty()
@MinLength(8)
password: string;
}
Step 2 — Create the Repository

Create src/users/users.repository.ts:

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UsersRepository {
constructor(private readonly prisma: PrismaService) {}

async create(data: CreateUserDto & { password: string }) {
return this.prisma.user.create({
data: {
name: data.name,
email: data.email,
password: data.password,
},
});
}

async findByEmail(email: string) {
return this.prisma.user.findUnique({
where: { email },
});
}

async findById(id: string) {
return this.prisma.user.findUnique({
where: { id },
});
}

async findByStatus(status: UserStatus) {
return this.prisma.user.findMany({
where: { status },
select: {
id: true,
name: true,
email: true,
status: true,
role: true,
createdAt: true,
subscriptions: {
select: {
id: true,
status: true,
createdAt: true,
},
},
},
});
}
}
Step 3 — Update the Service

Open src/users/users.service.ts and replace everything:

import {
Injectable,
ConflictException,
NotFoundException,
} from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UserStatus } from '@prisma/client';
import \* as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
constructor(private readonly usersRepository: UsersRepository) {}

async create(createUserDto: CreateUserDto) {
const existingUser = await this.usersRepository.findByEmail(
createUserDto.email,
);

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;

}

async findByEmail(email: string) {
return this.usersRepository.findByEmail(email);
}

async findById(id: string) {
const user = await this.usersRepository.findById(id);
if (!user) {
throw new NotFoundException('User not found');
}
const { password, ...result } = user;
return result;
}

async findByStatus(status: UserStatus) {
return this.usersRepository.findByStatus(status);
}
}
Step 4 — Update the Controller

Open src/users/users.controller.ts and replace everything:

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
constructor(private readonly usersService: UsersService) {}

@Post()
@HttpCode(HttpStatus.CREATED)
async create(@Body() createUserDto: CreateUserDto) {
return this.usersService.create(createUserDto);
}
}
Step 5 — Update the Module

Open src/users/users.module.ts and replace everything:

`typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';

@Module({
controllers: [UsersController],
providers: [UsersService, UsersRepository],
exports: [UsersService],
})
export class UsersModule {}
`

Done with all 5 files? 🔥

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
