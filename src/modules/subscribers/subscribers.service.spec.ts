import { NotFoundException } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { PrismaService } from '../../database/prisma.service';

describe('SubscribersService', () => {
  let service: SubscribersService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      subscriber: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        upsert: jest.fn(),
      } as any,
    };
    service = new SubscribersService(prisma as unknown as PrismaService);
  });

  it('should create subscriber successfully', async () => {
    const dto = { externalId: 'user_1', email: 'test@example.com' };
    (prisma.subscriber!.create as jest.Mock).mockResolvedValue({ id: 'sub_1', ...dto });

    const result = await service.create(dto);
    expect(result.id).toBe('sub_1');
    expect(prisma.subscriber!.create).toHaveBeenCalled();
  });

  it('should find subscriber by externalId or throw NotFoundException', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.findByExternalId('non_existent')).rejects.toThrow(NotFoundException);
  });
});
