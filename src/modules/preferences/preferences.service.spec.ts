import { ChannelType } from '@prisma/client';
import { PreferencesService } from './preferences.service';
import { PrismaService } from '../../database/prisma.service';

describe('PreferencesService', () => {
  let service: PreferencesService;
  let prisma: jest.Mocked<Partial<PrismaService>>;

  beforeEach(() => {
    prisma = {
      subscriber: {
        findUnique: jest.fn(),
      } as any,
      userPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
      } as any,
    };
    service = new PreferencesService(prisma as unknown as PrismaService);
  });

  it('should allow notification if preference is enabled or not set (opt-in by default)', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({ id: 'sub_1', externalId: 'user_1' });
    (prisma.userPreference!.findUnique as jest.Mock).mockResolvedValue(null);

    const allowed = await service.isChannelAllowed('user_1', ChannelType.EMAIL, 'DEFAULT');
    expect(allowed).toBe(true);
  });

  it('should block notification if preference is explicitly disabled (opt-out)', async () => {
    (prisma.subscriber!.findUnique as jest.Mock).mockResolvedValue({ id: 'sub_1', externalId: 'user_1' });
    (prisma.userPreference!.findUnique as jest.Mock).mockResolvedValue({
      id: 'pref_1',
      subscriberId: 'sub_1',
      channel: ChannelType.EMAIL,
      category: 'MARKETING',
      isEnabled: false,
    });

    const allowed = await service.isChannelAllowed('user_1', ChannelType.EMAIL, 'MARKETING');
    expect(allowed).toBe(false);
  });
});
