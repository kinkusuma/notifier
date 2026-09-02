import { InAppService } from './in-app.service';
import { PrismaService } from '../../database/prisma.service';
import { InAppProvider } from '../providers/in-app/in-app.provider';

describe('InAppService', () => {
  let service: InAppService;
  let prisma: jest.Mocked<Partial<PrismaService>>;
  let inAppProvider: InAppProvider;

  beforeEach(() => {
    prisma = {
      subscriber: { findUnique: jest.fn() } as any,
      inAppNotification: {
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      } as any,
    };

    inAppProvider = new InAppProvider(prisma as unknown as PrismaService);
    service = new InAppService(prisma as unknown as PrismaService, inAppProvider);
  });

  it('should list in-app notifications for a subscriber', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({ id: 'sub_1', externalId: 'user_1' });
    (prisma.inAppNotification!.findMany as jest.Mock).mockResolvedValue([
      { id: 'notif_1', title: 'Hello', message: 'World', isRead: false },
    ]);
    (prisma.inAppNotification!.count as jest.Mock).mockResolvedValue(1);

    const result = await service.getNotifications('user_1', {});
    expect(result.total).toBe(1);
    expect(result.notifications[0].title).toBe('Hello');
  });

  it('should mark a notification as read', async () => {
    (prisma.inAppNotification!.update as jest.Mock).mockResolvedValue({
      id: 'notif_1',
      isRead: true,
      readAt: new Date(),
    });

    const result = await service.markAsRead('notif_1');
    expect(result.isRead).toBe(true);
  });
});
