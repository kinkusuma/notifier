import { NotificationStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotProvider } from '../providers/telegram/telegram.provider';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let telegramProvider: jest.Mocked<Partial<TelegramBotProvider>>;
  let config: jest.Mocked<Partial<ConfigService>>;

  beforeEach(() => {
    prisma = {
      notificationLog: {
        findFirst: jest.fn(),
        update: jest.fn(),
      } as any,
      subscriber: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
    };

    telegramProvider = {
      send: jest.fn().mockResolvedValue({ success: true }),
    };

    config = {
      get: jest.fn().mockReturnValue('MyNotifierBot'),
    };

    service = new WebhooksService(
      prisma as unknown as PrismaService,
      telegramProvider as unknown as TelegramBotProvider,
      config as unknown as ConfigService,
    );
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

  it('should automatically link subscriber on Telegram /start <externalId>', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub_1',
      externalId: 'usr_123',
    });

    const payload = {
      message: {
        chat: { id: 987654321 },
        text: '/start usr_123',
      },
    };

    const result = await service.handleTelegramWebhook(payload);
    expect(result.linked).toBe(true);
    expect(prisma.subscriber!.update).toHaveBeenCalledWith({
      where: { externalId: 'usr_123' },
      data: { telegramChatId: '987654321' },
    });
    expect(telegramProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        recipient: '987654321',
      }),
    );
  });

  it('should generate telegram magic connect url', () => {
    const url = service.getTelegramConnectUrl('usr_123');
    expect(url).toBe('https://t.me/MyNotifierBot?start=usr_123');
  });
});
