import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

const mockSubscriptionsService = {
  createCheckout: jest.fn(),
  findByUserId: jest.fn(),
};

const mockUser = {
  id: 'user-uuid-123',
  name: 'Yunus Habeeb',
  email: 'yunus@test.com',
  role: 'USER',
  status: 'INACTIVE',
};

const mockCheckoutResponse = {
  checkoutUrl: 'https://checkout.stripe.com/pay/cs_test_123',
  sessionId: 'cs_test_123',
};

describe('SubscriptionsController', () => {
  let controller: SubscriptionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckout', () => {
    it('should create checkout session successfully', async () => {
      const createCheckoutDto = { priceId: 'price_test_123' };

      mockSubscriptionsService.createCheckout.mockResolvedValue(
        mockCheckoutResponse,
      );

      const result = await controller.createCheckout(
        mockUser,
        createCheckoutDto,
      );

      expect(result).toEqual(mockCheckoutResponse);
      expect(mockSubscriptionsService.createCheckout).toHaveBeenCalledWith(
        mockUser.id,
        createCheckoutDto,
      );
    });

    it('should throw if checkout creation fails', async () => {
      const createCheckoutDto = { priceId: 'price_test_123' };

      mockSubscriptionsService.createCheckout.mockRejectedValue(
        new Error('Stripe error'),
      );

      await expect(
        controller.createCheckout(mockUser, createCheckoutDto),
      ).rejects.toThrow('Stripe error');
    });
  });
});
