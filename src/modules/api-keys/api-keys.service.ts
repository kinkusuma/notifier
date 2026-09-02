import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApiKeyDto) {
    const key = dto.key || `notif_${crypto.randomBytes(24).toString('hex')}`;
    return this.prisma.apiKey.create({
      data: {
        name: dto.name,
        key,
      },
    });
  }

  async findAll() {
    return this.prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    const record = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`API key with ID "${id}" not found`);
    }
    return this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
