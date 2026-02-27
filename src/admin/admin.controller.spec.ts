import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

const mockAdminService = {
  getUsers: jest.fn(),
};

const mockUsers = [
  {
    id: 'uuid-123',
    name: 'Yunus Habeeb',
    email: 'yunus@test.com',
    role: 'USER',
    status: 'ACTIVE',
    createdAt: new Date(),
    subscriptions: [],
  },
  {
    id: 'uuid-456',
    name: 'Albertina Bazonga',
    email: 'albertina@test.com',
    role: 'ADMIN',
    status: 'INACTIVE',
    createdAt: new Date(),
    subscriptions: [],
  },
];

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return active users', async () => {
      const activeUsers = mockUsers.filter((u) => u.status === 'ACTIVE');
      mockAdminService.getUsers.mockResolvedValue(activeUsers);

      const result = await controller.getUsers('ACTIVE');

      expect(result).toEqual(activeUsers);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith('ACTIVE');
    });

    it('should return inactive users', async () => {
      const inactiveUsers = mockUsers.filter((u) => u.status === 'INACTIVE');
      mockAdminService.getUsers.mockResolvedValue(inactiveUsers);

      const result = await controller.getUsers('INACTIVE');

      expect(result).toEqual(inactiveUsers);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith('INACTIVE');
    });

    it('should return all users when no status provided', async () => {
      mockAdminService.getUsers.mockResolvedValue(mockUsers);

      const result = await controller.getUsers(undefined!);

      expect(result).toEqual(mockUsers);
      expect(mockAdminService.getUsers).toHaveBeenCalledWith(undefined);
    });

    it('should propagate BadRequestException for invalid status', async () => {
      mockAdminService.getUsers.mockRejectedValue(new Error('Invalid status'));

      await expect(controller.getUsers('INVALID')).rejects.toThrow(
        'Invalid status',
      );
    });
  });
});
