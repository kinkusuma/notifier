import { NotificationStatus } from '@prisma/client';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../database/prisma.service';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      notificationLog: {
        findFirst: jest.fn(),
        update: jest.fn(),
      } as any,
    };
    service = new WebhooksService(prisma as unknown as PrismaService);
  });

  it('should update log status on Resend email.opened event', async () => {
    (prisma.notificationLog!.findFirst as jest.Mock).mockResolvedValue({
      id: 'log_1',
      messageId: 'msg_resend_123',
      status: NotificationStatus.DELIVERED,
    });

    const payload = {
      type: 'email.opened',
      data: { email_id: 'msg_resend_123' },
    };

    const result = await service.handleResendWebhook(payload);
    expect(result.updated).toBe(true);
    expect(prisma.notificationLog!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log_1' },
        data: expect.objectContaining({ status: NotificationStatus.OPENED }),
      }),
    );
  });

  it('should update log status on Twilio read status callback', async () => {
    (prisma.notificationLog!.findFirst as jest.Mock).mockResolvedValue({
      id: 'log_2',
      messageId: 'SM_twilio_456',
      status: NotificationStatus.DELIVERED,
    });

    const payload = {
      MessageSid: 'SM_twilio_456',
      MessageStatus: 'read',
    };

    const result = await service.handleTwilioWebhook(payload);
    expect(result.updated).toBe(true);
    expect(prisma.notificationLog!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log_2' },
        data: expect.objectContaining({ status: NotificationStatus.OPENED }),
      }),
    );
  });
});
