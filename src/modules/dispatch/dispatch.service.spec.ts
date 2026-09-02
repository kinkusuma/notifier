import { ChannelType, NotificationStatus, Priority } from '@prisma/client';
import { DispatchService } from './dispatch.service';
import { PrismaService } from '../../database/prisma.service';
import { PgBossService } from '../queue/pg-boss.service';

describe('DispatchService', () => {
  let service: DispatchService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let pgBoss: jest.Mocked<Partial<PgBossService>>;

  beforeEach(() => {
    prisma = {
      subscriber: { findUnique: jest.fn() } as any,
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

  it('should enqueue notification and return queued status', async () => {
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
    expect(prisma.notificationLog!.create).toHaveBeenCalled();
    expect(pgBoss.send).toHaveBeenCalled();
  });
});
