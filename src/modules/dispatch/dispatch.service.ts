import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, NotificationStatus, Priority } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PgBossService } from '../queue/pg-boss.service';
import { NOTIFICATION_QUEUE_NAME } from '../queue/notification-worker.service';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pgBossService: PgBossService,
  ) {}

  async dispatch(dto: DispatchNotificationDto) {
    // 1. Verify Subscriber exists
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: dto.subscriberExternalId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with external ID "${dto.subscriberExternalId}" not found`);
    }

    // 2. Verify Template exists
    const template = await this.prisma.template.findUnique({
      where: { slug: dto.templateSlug },
    });
    if (!template) {
      throw new NotFoundException(`Template with slug "${dto.templateSlug}" not found`);
    }

    // 3. Determine target channel
    const channel = dto.channel || template.defaultChannel;

    // 4. Create initial NotificationLog
    const initialRecipient = dto.recipientOverride || this.getInitialRecipientPreview(subscriber, channel);
    const log = await this.prisma.notificationLog.create({
      data: {
        subscriberId: subscriber.id,
        templateSlug: template.slug,
        channel,
        provider: dto.providerOverride || 'AUTO',
        recipient: initialRecipient || 'PENDING',
        content: '',
        status: NotificationStatus.QUEUED,
      },
    });

    // 5. Calculate priority
    const priority = dto.priority === Priority.HIGH ? 10 : dto.priority === Priority.LOW ? 1 : 5;

    // 6. Enqueue to PgBoss
    await this.pgBossService.send(
      NOTIFICATION_QUEUE_NAME,
      {
        logId: log.id,
        subscriberExternalId: subscriber.externalId,
        templateSlug: template.slug,
        channel,
        providerOverride: dto.providerOverride,
        recipientOverride: dto.recipientOverride,
        variables: dto.variables || {},
        category: dto.category || (template.metadata as any)?.category || 'DEFAULT',
      },
      {
        priority,
        retryLimit: 3,
        retryBackoff: true,
      },
    );

    return {
      status: NotificationStatus.QUEUED,
      logId: log.id,
      subscriberExternalId: subscriber.externalId,
      templateSlug: template.slug,
      channel,
    };
  }

  async getLogs(query?: {
    subscriberId?: string;
    templateSlug?: string;
    channel?: ChannelType;
    status?: NotificationStatus;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (query?.subscriberId) where.subscriberId = query.subscriberId;
    if (query?.templateSlug) where.templateSlug = query.templateSlug;
    if (query?.channel) where.channel = query.channel;
    if (query?.status) where.status = query.status;

    const [logs, total] = await Promise.all([
      this.prisma.notificationLog.findMany({
        where,
        take: query?.limit ? Number(query.limit) : 50,
        skip: query?.offset ? Number(query.offset) : 0,
        orderBy: { createdAt: 'desc' },
        include: { subscriber: true },
      }),
      this.prisma.notificationLog.count({ where }),
    ]);

    return { total, logs };
  }

  async getLogById(id: string) {
    const log = await this.prisma.notificationLog.findUnique({
      where: { id },
      include: { subscriber: true },
    });
    if (!log) {
      throw new NotFoundException(`Notification log with ID "${id}" not found`);
    }
    return log;
  }

  private getInitialRecipientPreview(subscriber: any, channel: ChannelType): string | null {
    switch (channel) {
      case ChannelType.EMAIL:
        return subscriber.email || null;
      case ChannelType.TELEGRAM:
        return subscriber.telegramChatId || null;
      case ChannelType.WHATSAPP:
        return subscriber.phoneNumber || null;
      case ChannelType.WEBHOOK:
        return subscriber.webhookUrl || null;
      case ChannelType.PUSH:
        return subscriber.fcmTokens?.[0] || null;
      default:
        return null;
    }
  }
}
