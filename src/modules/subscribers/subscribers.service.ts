import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class SubscribersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubscriberDto) {
    return this.prisma.subscriber.create({
      data: {
        externalId: dto.externalId,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        telegramChatId: dto.telegramChatId,
        webhookUrl: dto.webhookUrl,
        fcmTokens: dto.fcmTokens || [],
        metadata: dto.metadata,
      },
    });
  }

  async findAll() {
    return this.prisma.subscriber.findMany({
      include: { preferences: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByExternalId(externalId: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId },
      include: { preferences: true },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with external ID "${externalId}" not found`);
    }
    return subscriber;
  }

  async findById(id: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { id },
      include: { preferences: true },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with ID "${id}" not found`);
    }
    return subscriber;
  }

  async update(id: string, dto: UpdateSubscriberDto) {
    await this.findById(id);
    return this.prisma.subscriber.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.subscriber.delete({
      where: { id },
    });
  }

  async upsert(dto: CreateSubscriberDto) {
    return this.prisma.subscriber.upsert({
      where: { externalId: dto.externalId },
      create: {
        externalId: dto.externalId,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        telegramChatId: dto.telegramChatId,
        webhookUrl: dto.webhookUrl,
        fcmTokens: dto.fcmTokens || [],
        metadata: dto.metadata,
      },
      update: {
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        telegramChatId: dto.telegramChatId,
        webhookUrl: dto.webhookUrl,
        fcmTokens: dto.fcmTokens,
        metadata: dto.metadata,
      },
    });
  }
}
