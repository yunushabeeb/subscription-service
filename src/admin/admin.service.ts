import { Injectable, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(private readonly usersService: UsersService) {}

  async getUsers(status: string) {
    // Validate status query parameter
    if (status && !Object.values(UserStatus).includes(status as UserStatus)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${Object.values(UserStatus).join(', ')}`,
      );
    }

    // Fetch users based on status
    return this.usersService.findByStatus(status as UserStatus);
  }
}
