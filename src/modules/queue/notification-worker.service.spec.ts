import { ChannelType, NotificationStatus } from '@prisma/client';
import { NotificationWorkerService } from './notification-worker.service';
import { PrismaService } from '../../database/prisma.service';
import { ProviderFactoryService } from '../providers/provider-factory.service';
import { TemplateEngineService } from '../template-engine/template-engine.service';
import { PreferencesService } from '../preferences/preferences.service';
import { PgBossService } from './pg-boss.service';

describe('NotificationWorkerService', () => {
  let worker: NotificationWorkerService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let providerFactory: jest.Mocked<Partial<ProviderFactoryService>>;
  let templateEngine: TemplateEngineService;
  let preferencesService: jest.Mocked<Partial<PreferencesService>>;
  let pgBossService: jest.Mocked<Partial<PgBossService>>;

  const mockProvider = {
    name: 'MOCK_PROVIDER',
    channel: ChannelType.EMAIL,
    send: jest.fn(),
  };

  beforeEach(() => {
    prisma = {
      subscriber: { findUnique: jest.fn() } as any,
      template: { findUnique: jest.fn() } as any,
      notificationLog: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      } as any,
    };

    providerFactory = {
      getProvider: jest.fn().mockReturnValue(mockProvider),
    };

    templateEngine = new TemplateEngineService();

    preferencesService = {
      isChannelAllowed: jest.fn().mockResolvedValue(true),
    };

    pgBossService = {
      send: jest.fn().mockResolvedValue('job_id'),
      work: jest.fn().mockResolvedValue('worker_id'),
    };

    worker = new NotificationWorkerService(
      prisma as unknown as PrismaService,
      providerFactory as unknown as ProviderFactoryService,
      templateEngine,
      preferencesService as unknown as PreferencesService,
      pgBossService as unknown as PgBossService,
    );
  });

  it('should process job and mark log DELIVERED on success', async () => {
    const jobData = {
      logId: 'log_1',
      subscriberExternalId: 'user_1',
      templateSlug: 'welcome',
      channel: ChannelType.EMAIL,
      variables: { name: 'Alice' },
    };

    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub_1',
      externalId: 'user_1',
      email: 'alice@example.com',
    });

    (prisma.template!.findUnique as jest.Mock).mockResolvedValue({
      id: 'tmpl_1',
      slug: 'welcome',
      title: 'Welcome',
      subject: 'Hello {{name}}',
      bodyText: 'Welcome {{name}}',
      bodyHtml: '<p>Welcome {{name}}</p>',
      defaultChannel: ChannelType.EMAIL,
    });

    mockProvider.send.mockResolvedValue({
      success: true,
      messageId: 'msg_123',
    });

    await worker.processJob(jobData);

    expect(prisma.notificationLog!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log_1' },
        data: expect.objectContaining({
          status: NotificationStatus.DELIVERED,
          messageId: 'msg_123',
        }),
      }),
    );
  });

  it('should trigger fallback if delivery fails and fallback channel is present', async () => {
    const jobData = {
      logId: 'log_1',
      subscriberExternalId: 'user_1',
      templateSlug: 'alert',
      channel: ChannelType.EMAIL,
      variables: { name: 'Bob' },
    };

    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub_1',
      externalId: 'user_1',
      email: 'bob@example.com',
      telegramChatId: '123456',
    });

    (prisma.template!.findUnique as jest.Mock).mockResolvedValue({
      id: 'tmpl_2',
      slug: 'alert',
      title: 'Alert',
      bodyText: 'Alert {{name}}',
      defaultChannel: ChannelType.EMAIL,
      fallbackChannel: ChannelType.TELEGRAM,
    });

    mockProvider.send.mockResolvedValue({
      success: false,
      error: 'SMTP Connection timeout',
    });

    (prisma.notificationLog!.create as jest.Mock).mockResolvedValue({
      id: 'log_fallback_1',
    });

    await worker.processJob(jobData);

    expect(prisma.notificationLog!.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'log_1' },
        data: expect.objectContaining({
          status: NotificationStatus.FAILED,
        }),
      }),
    );

    expect(prisma.notificationLog!.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: ChannelType.TELEGRAM,
          parentLogId: 'log_1',
        }),
      }),
    );

    expect(pgBossService.send).toHaveBeenCalled();
  });
});
