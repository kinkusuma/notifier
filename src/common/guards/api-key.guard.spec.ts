import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let reflector: Reflector;
  let prismaService: jest.Mocked<Partial<PrismaService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = new Reflector();
    prismaService = {
      apiKey: {
        findUnique: jest.fn(),
      } as any,
    };
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'MASTER_API_KEY') return 'master-secret-key';
        return null;
      }),
    };
    guard = new ApiKeyGuard(reflector, prismaService as unknown as PrismaService, configService as unknown as ConfigService);
  });

  it('should allow access if endpoint is marked @Public()', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const context = createMockContext({});
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if no API key header provided', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow access if x-api-key matches MASTER_API_KEY', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({ 'x-api-key': 'master-secret-key' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access if Authorization: Bearer matches MASTER_API_KEY', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    const context = createMockContext({ authorization: 'Bearer master-secret-key' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should allow access if key is active in database', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (prismaService.apiKey!.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      key: 'db-active-key',
      isActive: true,
      name: 'Client App',
    });

    const context = createMockContext({ 'x-api-key': 'db-active-key' });
    expect(await guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if key in database is inactive', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    (prismaService.apiKey!.findUnique as jest.Mock).mockResolvedValue({
      id: '1',
      key: 'db-inactive-key',
      isActive: false,
      name: 'Client App',
    });

    const context = createMockContext({ 'x-api-key': 'db-inactive-key' });
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
