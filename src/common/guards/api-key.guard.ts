import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required in headers (x-api-key or Authorization: Bearer <key>)');
    }

    const masterKey = this.configService.get<string>('MASTER_API_KEY');
    if (masterKey && apiKey === masterKey) {
      return true;
    }

    const keyRecord = await this.prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new UnauthorizedException('Invalid or inactive API key');
    }

    return true;
  }

  private extractApiKey(request: any): string | null {
    const headerKey = request.headers['x-api-key'];
    if (headerKey) {
      return headerKey as string;
    }

    const authHeader = request.headers['authorization'];
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7).trim();
    }

    return null;
  }
}
