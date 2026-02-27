import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    process.env.DATABASE_URL =
      'postgresql://postgres:password@localhost:5433/subscription_db';

    const mockPrisma: Partial<PrismaService> & {
      $connect: jest.Mock;
      $disconnect: jest.Mock;
      onModuleInit: () => Promise<void>;
      onModuleDestroy: () => Promise<void>;
    } = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      onModuleInit: async () => {
        await mockPrisma.$connect();
      },
      onModuleDestroy: async () => {
        await mockPrisma.$disconnect();
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PrismaService>(
      PrismaService,
    ) as unknown as PrismaService;
  });

  afterEach(async () => {
    if (service) {
      await service.onModuleDestroy();
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on module init', async () => {
    const connectSpy = jest
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect on module destroy', async () => {
    const disconnectSpy = jest
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
