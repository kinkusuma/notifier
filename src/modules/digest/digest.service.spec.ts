import { ChannelType } from '@prisma/client';
import { DigestService } from './digest.service';
import { PrismaService } from '../../database/prisma.service';

describe('DigestService', () => {
  let service: DigestService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      notificationDigest: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      } as any,
    };
    service = new DigestService(prisma as unknown as PrismaService);
  });

  it('should start a new digest buffer if no active buffer exists', async () => {
    (prisma.notificationDigest!.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.notificationDigest!.create as jest.Mock).mockResolvedValue({
      id: 'dig_1',
      status: 'BUFFERING',
    });

    const result = await service.bufferNotification(
      'sub_1',
      'DEFAULT',
      'alert',
      ChannelType.EMAIL,
      { item: 'Alert A' },
      15,
    );

    expect(result.isFirst).toBe(true);
    expect(prisma.notificationDigest!.create).toHaveBeenCalled();
  });

  it('should append to existing buffer if active buffer exists', async () => {
    (prisma.notificationDigest!.findFirst as jest.Mock).mockResolvedValue({
      id: 'dig_1',
      items: [{ item: 'Alert A' }],
      status: 'BUFFERING',
    });

    const result = await service.bufferNotification(
      'sub_1',
      'DEFAULT',
      'alert',
      ChannelType.EMAIL,
      { item: 'Alert B' },
      15,
    );

    expect(result.isFirst).toBe(false);
    expect(prisma.notificationDigest!.update).toHaveBeenCalled();
  });
});
