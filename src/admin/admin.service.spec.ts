import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { UsersService } from '../users/users.service';
import { BadRequestException } from '@nestjs/common';

const mockUsersService = {
  findByStatus: jest.fn(),
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
    status: 'ACTIVE',
    createdAt: new Date(),
    subscriptions: [],
  },
];

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return active users when status is ACTIVE', async () => {
      mockUsersService.findByStatus.mockResolvedValue(mockUsers);

      const result = await service.getUsers('ACTIVE');

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findByStatus).toHaveBeenCalledWith('ACTIVE');
    });

    it('should return inactive users when status is INACTIVE', async () => {
      const inactiveUsers = mockUsers.map((u) => ({
        ...u,
        status: 'INACTIVE',
      }));
      mockUsersService.findByStatus.mockResolvedValue(inactiveUsers);

      const result = await service.getUsers('INACTIVE');

      expect(result).toEqual(inactiveUsers);
      expect(mockUsersService.findByStatus).toHaveBeenCalledWith('INACTIVE');
    });

    it('should throw BadRequestException for invalid status', async () => {
      await expect(service.getUsers('INVALID_STATUS')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockUsersService.findByStatus).not.toHaveBeenCalled();
    });

    it('should return all users when no status is provided', async () => {
      mockUsersService.findByStatus.mockResolvedValue(mockUsers);

      const result = await service.getUsers(undefined!);

      expect(result).toEqual(mockUsers);
      expect(mockUsersService.findByStatus).toHaveBeenCalledWith(undefined);
    });
  });
});
