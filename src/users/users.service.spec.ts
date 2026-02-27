import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUsersRepository = {
  create: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  findByStatus: jest.fn(),
};

const mockUser = {
  id: 'uuid-123',
  name: 'Yunus Habeeb',
  email: 'yunus@test.com',
  password: 'hashedpassword',
  role: 'USER',
  status: 'INACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto = {
      name: 'Yunus Habeeb',
      email: 'yunus@test.com',
      password: 'password123',
    };

    it('should create a user successfully', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockResolvedValue(mockUser);

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const result = await service.create(createUserDto);

      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe(mockUser.email);
      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail(mockUser.email);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(
        mockUser.email,
      );
    });

    it('should return null if user not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@test.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user by id without password', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById(mockUser.id);

      expect(result).not.toHaveProperty('password');
      expect(result.id).toBe(mockUser.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByStatus', () => {
    it('should return users by status', async () => {
      const mockUsers = [mockUser];
      mockUsersRepository.findByStatus.mockResolvedValue(mockUsers);

      const result = await service.findByStatus('ACTIVE');

      expect(result).toEqual(mockUsers);
      expect(mockUsersRepository.findByStatus).toHaveBeenCalledWith('ACTIVE');
    });
  });
});
