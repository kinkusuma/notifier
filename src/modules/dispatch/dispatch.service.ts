import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType, NotificationStatus, Priority } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PgBossService } from '../queue/pg-boss.service';
import { NOTIFICATION_QUEUE_NAME } from '../queue/notification-worker.service';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';
import { BroadcastNotificationDto } from './dto/broadcast-notification.dto';

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

    // 3. Determine target channel & status
    const channel = dto.channel || template.defaultChannel;
    const isScheduled = !!(dto.sendAt || (dto.delaySeconds && dto.delaySeconds > 0));
    const initialStatus = isScheduled ? NotificationStatus.SCHEDULED : NotificationStatus.QUEUED;

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
        status: initialStatus,
      },
    });

    // 5. Calculate priority & schedule delay
    const priority = dto.priority === Priority.HIGH ? 10 : dto.priority === Priority.LOW ? 1 : 5;
    let startAfter: Date | number | undefined = undefined;

    if (dto.sendAt) {
      startAfter = new Date(dto.sendAt);
    } else if (dto.delaySeconds && dto.delaySeconds > 0) {
      startAfter = dto.delaySeconds;
    }

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
        startAfter,
        retryLimit: 3,
        retryBackoff: true,
      },
    );

    return {
      status: initialStatus,
      logId: log.id,
      subscriberExternalId: subscriber.externalId,
      templateSlug: template.slug,
      channel,
      scheduledAt: dto.sendAt || (dto.delaySeconds ? `+${dto.delaySeconds}s` : undefined),
    };
  }

  async broadcast(dto: BroadcastNotificationDto) {
    // 1. Verify Template
    const template = await this.prisma.template.findUnique({
      where: { slug: dto.templateSlug },
    });
    if (!template) {
      throw new NotFoundException(`Template with slug "${dto.templateSlug}" not found`);
    }

    // 2. Fetch targeted subscribers
    let subscribers: Array<{ id: string; externalId: string; email: string | null; phoneNumber: string | null; telegramChatId: string | null; webhookUrl: string | null; fcmTokens: string[] }> = [];

    if (dto.subscriberExternalIds && dto.subscriberExternalIds.length > 0) {
      subscribers = await this.prisma.subscriber.findMany({
        where: { externalId: { in: dto.subscriberExternalIds } },
      });
    } else {
      subscribers = await this.prisma.subscriber.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' },
      });
    }

    const channel = dto.channel || template.defaultChannel;
    const queuedLogs: string[] = [];

    // 3. Batch enqueue
    for (const subscriber of subscribers) {
      const recipient = this.getInitialRecipientPreview(subscriber, channel);
      const log = await this.prisma.notificationLog.create({
        data: {
          subscriberId: subscriber.id,
          templateSlug: template.slug,
          channel,
          provider: 'AUTO',
          recipient: recipient || 'PENDING',
          content: '',
          status: NotificationStatus.QUEUED,
        },
      });

      await this.pgBossService.send(
        NOTIFICATION_QUEUE_NAME,
        {
          logId: log.id,
          subscriberExternalId: subscriber.externalId,
          templateSlug: template.slug,
          channel,
          variables: dto.variables || {},
          category: dto.category || 'DEFAULT',
        },
        { retryLimit: 3, retryBackoff: true },
      );

      queuedLogs.push(log.id);
    }

    return {
      status: 'BROADCAST_QUEUED',
      templateSlug: template.slug,
      channel,
      totalTargeted: subscribers.length,
      totalQueued: queuedLogs.length,
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
      case ChannelType.IN_APP:
        return subscriber.externalId || null;
      default:
        return null;
    }
  }
}
