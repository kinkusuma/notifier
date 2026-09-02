import { ThrottleService } from './throttle.service';
import { PrismaService } from '../../database/prisma.service';

describe('ThrottleService', () => {
  let service: ThrottleService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      notificationLog: {
        count: jest.fn(),
      } as any,
    };
    service = new ThrottleService(prisma as unknown as PrismaService);
  });

  it('should allow notification when under threshold', async () => {
    (prisma.notificationLog!.count as jest.Mock).mockResolvedValue(2);

    const isThrottled = await service.isThrottled('sub_1', 'MARKETING', 5);
    expect(isThrottled).toBe(false);
  });

  it('should block notification when limit exceeded', async () => {
    (prisma.notificationLog!.count as jest.Mock).mockResolvedValue(5);

    const isThrottled = await service.isThrottled('sub_1', 'MARKETING', 5);
    expect(isThrottled).toBe(true);
  });
});
