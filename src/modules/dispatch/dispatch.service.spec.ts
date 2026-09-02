import { ChannelType, NotificationStatus } from '@prisma/client';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../database/prisma.service';
import { PgBossService } from '../queue/pg-boss.service';

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let pgBoss: jest.Mocked<Partial<PgBossService>>;

  beforeEach(() => {
    prisma = {
      subscriber: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      } as any,
      template: { findUnique: jest.fn() } as any,
      notificationLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      } as any,
    };

    pgBoss = {
      send: jest.fn().mockResolvedValue('job_123'),
    };

    service = new DispatchService(prisma as unknown as PrismaService, pgBoss as unknown as PgBossService);
  });

  it('should enqueue instant notification with QUEUED status', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub_1',
      externalId: 'user_1',
      email: 'user@example.com',
    });

    (prisma.template!.findUnique as jest.Mock).mockResolvedValue({
      id: 'tmpl_1',
      slug: 'welcome',
      defaultChannel: ChannelType.EMAIL,
    });

    (prisma.notificationLog!.create as jest.Mock).mockResolvedValue({
      id: 'log_999',
      status: NotificationStatus.QUEUED,
    });

    const dto = {
      subscriberExternalId: 'user_1',
      templateSlug: 'welcome',
      variables: { name: 'Alice' },
    };

    const result = await service.dispatch(dto);

    expect(result.status).toBe(NotificationStatus.QUEUED);
    expect(result.logId).toBe('log_999');
    expect(pgBoss.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ retryLimit: 3 }),
    );
  });

  it('should support scheduled dispatch with startAfter and SCHEDULED status', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({
      id: 'sub_1',
      externalId: 'user_1',
      email: 'user@example.com',
    });

    (prisma.template!.findUnique as jest.Mock).mockResolvedValue({
      id: 'tmpl_1',
      slug: 'welcome',
      defaultChannel: ChannelType.EMAIL,
    });

    (prisma.notificationLog!.create as jest.Mock).mockResolvedValue({
      id: 'log_sched',
      status: NotificationStatus.SCHEDULED,
    });

    const futureDate = new Date(Date.now() + 3600 * 1000).toISOString();
    const dto = {
      subscriberExternalId: 'user_1',
      templateSlug: 'welcome',
      sendAt: futureDate,
    };

    const result = await service.dispatch(dto);

    expect(result.status).toBe(NotificationStatus.SCHEDULED);
    expect(pgBoss.send).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ startAfter: expect.any(Date) }),
    );
  });

  it('should broadcast notifications to multiple subscribers', async () => {
    (prisma.template!.findUnique as jest.Mock).mockResolvedValue({
      id: 'tmpl_1',
      slug: 'broadcast_template',
      defaultChannel: ChannelType.EMAIL,
    });

    (prisma.subscriber!.findMany as jest.Mock).mockResolvedValue([
      { id: 'sub_1', externalId: 'user_1', email: 'user1@example.com' },
      { id: 'sub_2', externalId: 'user_2', email: 'user2@example.com' },
    ]);

    (prisma.notificationLog!.create as jest.Mock)
      .mockResolvedValueOnce({ id: 'log_b1', status: NotificationStatus.QUEUED })
      .mockResolvedValueOnce({ id: 'log_b2', status: NotificationStatus.QUEUED });

    const dto = {
      templateSlug: 'broadcast_template',
      subscriberExternalIds: ['user_1', 'user_2'],
      variables: { notice: 'System update' },
    };

    const result = await service.broadcast(dto);

    expect(result.totalTargeted).toBe(2);
    expect(result.totalQueued).toBe(2);
    expect(pgBoss.send).toHaveBeenCalledTimes(2);
  });
});
