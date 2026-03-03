import { Test, TestingModule } from '@nestjs/testing';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

const mockWebhooksService: {
  handleWebhook: jest.Mock<Promise<{ received: true }>, [Buffer, string]>;
} = {
  handleWebhook: jest.fn<Promise<{ received: true }>, [Buffer, string]>(),
};

describe('WebhooksController', () => {
  let controller: WebhooksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: mockWebhooksService,
        },
      ],
    }).compile();

    controller = module.get<WebhooksController>(WebhooksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleStripeWebhook', () => {
    it('should process webhook successfully', async () => {
      const mockPayload = Buffer.from(JSON.stringify({ id: 'evt_123' }));
      const mockSignature = 'mock_signature';
      const mockRequest = { body: mockPayload } as unknown as Request;

      mockWebhooksService.handleWebhook.mockResolvedValue({
        received: true,
      });

      const result = await controller.handleStripeWebhook(
        mockSignature,
        mockRequest,
      );

      expect(result).toEqual({ received: true });
      expect(mockWebhooksService.handleWebhook).toHaveBeenCalledWith(
        mockPayload,
        mockSignature,
      );
    });

    it('should throw BadRequestException if signature is missing', async () => {
      const mockRequest = { body: Buffer.from('test') } as unknown as Request;

      const missingSignature = undefined as unknown as string;
      await expect(
        controller.handleStripeWebhook(missingSignature, mockRequest),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if payload is not a buffer', async () => {
      const mockRequest = {
        body: { id: 'evt_123' },
      } as unknown as Request;

      await expect(
        controller.handleStripeWebhook('mock_signature', mockRequest),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
