import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { ConfigService } from '@nestjs/config';

const mockSubscriptionsRepository = {
  create: jest.fn(),
  findByCheckoutId: jest.fn(),
  findByUserId: jest.fn(),
  updateByCheckoutId: jest.fn(),
  updateByEventId: jest.fn(),
  findActiveByUserId: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_SUCCESS_URL: 'http://localhost:4000/success',
      STRIPE_CANCEL_URL: 'http://localhost:4000/cancel',
    };
    return config[key];
  }),
};

const mockSubscription = {
  id: 'sub-uuid-123',
  userId: 'user-uuid-123',
  checkoutId: 'cs_test_123',
  status: 'PENDING',
  paymentId: null,
  eventId: null,
  startedAt: null,
  endsAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCheckoutSession = {
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/pay/cs_test_123',
};

// Minimal typed shape for Stripe's sessions resource used in tests
type SessionsMock = {
  create?: jest.Mock;
  retrieve?: jest.Mock;
  update?: jest.Mock;
  list?: jest.Mock;
  expire?: jest.Mock;
  listLineItems?: jest.Mock;
};

function setStripeMock(
  serviceInstance: SubscriptionsService,
  sessions: SessionsMock,
) {
  // assign to private property via unknown cast to avoid TS private/property errors
  (serviceInstance as unknown as { stripe?: unknown }).stripe = {
    checkout: { sessions },
  } as unknown;
}

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        {
          provide: SubscriptionsRepository,
          useValue: mockSubscriptionsRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);

    // Mock Stripe instance on the service (typed)
    setStripeMock(service, {
      create: jest.fn().mockResolvedValue(mockCheckoutSession),
    });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckout', () => {
    const userId = 'user-uuid-123';
    const createCheckoutDto = { priceId: 'price_test_123' };

    it('should create a checkout session successfully', async () => {
      // Re-apply stripe mock after clearAllMocks
      setStripeMock(service, {
        create: jest.fn().mockResolvedValue(mockCheckoutSession),
      });

      mockSubscriptionsRepository.create.mockResolvedValue(mockSubscription);

      const result = await service.createCheckout(userId, createCheckoutDto);

      expect(result.checkoutUrl).toBe(mockCheckoutSession.url);
      expect(result.sessionId).toBe(mockCheckoutSession.id);
      expect(mockSubscriptionsRepository.create).toHaveBeenCalledWith(
        userId,
        mockCheckoutSession.id,
      );
    });

    it('should throw if Stripe session creation fails', async () => {
      setStripeMock(service, {
        create: jest.fn().mockRejectedValue(new Error('Stripe error')),
      });

      await expect(
        service.createCheckout(userId, createCheckoutDto),
      ).rejects.toThrow('Stripe error');
    });
  });

  describe('findByUserId', () => {
    it('should return subscriptions for a user', async () => {
      mockSubscriptionsRepository.findByUserId.mockResolvedValue([
        mockSubscription,
      ]);

      const result = await service.findByUserId('user-uuid-123');

      expect(result).toEqual([mockSubscription]);
      expect(mockSubscriptionsRepository.findByUserId).toHaveBeenCalledWith(
        'user-uuid-123',
      );
    });

    it('should return empty array if no subscriptions found', async () => {
      mockSubscriptionsRepository.findByUserId.mockResolvedValue([]);

      const result = await service.findByUserId('user-uuid-123');

      expect(result).toEqual([]);
    });
  });
});
