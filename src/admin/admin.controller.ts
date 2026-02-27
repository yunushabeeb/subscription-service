import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth('JWT-auth') // This adds a lock icon to the Swagger UI for this controller, indicating that the endpoints require authentication. It also tells Swagger to include an Authorization header with a Bearer token (the JWT) when making requests to these endpoints from the Swagger UI, so you can test the authenticated endpoints directly from the documentation after logging in and obtaining a JWT token.
@Controller('admin')
// Only authenticated users with the ADMIN role can access these endpoints
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // GET /admin/users?status=ACTIVE|INACTIVE|BANNED
  @Get('users')
  @ApiOperation({ summary: 'Get all users filtered by status — Admin only' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['ACTIVE', 'INACTIVE'],
    description: 'Filter users by status',
  })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — Admin only' })
  async getUsers(@Query('status') status: string) {
    return this.adminService.getUsers(status);
  }
}
