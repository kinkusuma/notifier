import { NotFoundException } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { TemplatesService } from './templates.service';
import { PrismaService } from '../../database/prisma.service';

describe('TemplatesService', () => {
  let service: TemplatesService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      template: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
    };
    service = new TemplatesService(prisma as unknown as PrismaService);
  });

  it('should create template successfully', async () => {
    const dto = {
      slug: 'otp',
      title: 'OTP code',
      bodyText: 'Your code is {{code}}',
      defaultChannel: ChannelType.WHATSAPP,
    };
    (prisma.template!.create as jest.Mock).mockResolvedValue({ id: 'tmpl_1', ...dto });

    const result = await service.create(dto);
    expect(result.id).toBe('tmpl_1');
    expect(prisma.template!.create).toHaveBeenCalled();
  });

  it('should throw NotFoundException if template slug not found', async () => {
    (prisma.template!.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.findBySlug('missing-slug')).rejects.toThrow(NotFoundException);
  });
});
