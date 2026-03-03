import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksService } from './webhooks.service';
import type { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsRepository } from '../subscriptions/subscriptions.repository';
import { BadRequestException } from '@nestjs/common';

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      STRIPE_SECRET_KEY: 'sk_test_mock',
      STRIPE_WEBHOOK_SECRET: 'whsec_mock',
    };
    return config[key];
  }),
};

const mockPrismaService = {
  webhookEvent: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  subscription: {
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockSubscriptionsRepository = {
  updateByCheckoutId: jest.fn(),
};

function setStripeWebhooksMock(
  serviceInstance: WebhooksService,
  constructEventMock: jest.Mock,
) {
  // assign to private property via unknown cast to avoid TS/private errors
  (serviceInstance as unknown as { stripe?: unknown }).stripe = {
    webhooks: { constructEvent: constructEventMock },
  } as unknown;
}

describe('WebhooksService', () => {
  let service: WebhooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: SubscriptionsRepository,
          useValue: mockSubscriptionsRepository,
        },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleWebhook', () => {
    const mockPayload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
    const mockSignature = 'mock_signature';

    it('should throw BadRequestException if signature verification fails', async () => {
      setStripeWebhooksMock(
        service,
        jest.fn().mockImplementation(() => {
          throw new Error('Invalid signature');
        }),
      );

      await expect(
        service.handleWebhook(mockPayload, mockSignature),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return received:true and skip processing for duplicate events', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: { object: {} },
      };

      setStripeWebhooksMock(service, jest.fn().mockReturnValue(mockEvent));

      // Simulate duplicate — event already exists
      mockPrismaService.webhookEvent.findUnique.mockResolvedValue({
        id: 'webhook-uuid',
        eventId: 'evt_123',
        type: 'checkout.session.completed',
      });

      const result = await service.handleWebhook(mockPayload, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should process checkout.session.completed event successfully', async () => {
      const mockEvent = {
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            payment_intent: 'pi_test_123',
            metadata: { userId: 'user-uuid-123' },
          },
        },
      };

      setStripeWebhooksMock(service, jest.fn().mockReturnValue(mockEvent));

      // Not a duplicate
      mockPrismaService.webhookEvent.findUnique.mockResolvedValue(null);

      // Mock transaction execution
      mockPrismaService.$transaction.mockImplementation(
        async (cb: (tx: Prisma.TransactionClient) => Promise<void>) => {
          await cb({
            webhookEvent: { create: jest.fn() },
            subscription: { update: jest.fn() },
            user: { update: jest.fn() },
          } as unknown as Prisma.TransactionClient);
        },
      );

      const result = await service.handleWebhook(mockPayload, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should process invoice.payment_failed event successfully', async () => {
      const mockEvent = {
        id: 'evt_456',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            subscription: 'sub_test_123',
          },
        },
      };

      setStripeWebhooksMock(service, jest.fn().mockReturnValue(mockEvent));

      mockPrismaService.webhookEvent.findUnique.mockResolvedValue(null);

      mockPrismaService.$transaction.mockImplementation(
        async (cb: (tx: Prisma.TransactionClient) => Promise<void>) => {
          await cb({
            webhookEvent: { create: jest.fn() },
            subscription: { updateMany: jest.fn() },
          } as unknown as Prisma.TransactionClient);
        },
      );

      const result = await service.handleWebhook(mockPayload, mockSignature);

      expect(result).toEqual({ received: true });
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
