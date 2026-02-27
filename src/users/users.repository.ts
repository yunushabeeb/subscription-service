import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserStatus } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Create a new user with the provided data
  async create(data: CreateUserDto & { password: string }) {
    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
      },
    });
  }

  // Find a user by their email address
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Find a user by their unique ID
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Find users by their status (e.g., ACTIVE, INACTIVE)
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
