import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin')
// Only authenticated users with the ADMIN role can access these endpoints
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/users?status=ACTIVE|INACTIVE|BANNED
  @Get('users')
  async getUsers(@Query('status') status: string) {
    return this.adminService.getUsers(status);
  }
}
