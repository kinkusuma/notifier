import { Injectable, NotFoundException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';
import { InAppProvider } from '../providers/in-app/in-app.provider';

@Injectable()
export class InAppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inAppProvider: InAppProvider,
  ) {}

  async getNotifications(
    subscriberExternalId: string,
    query: { isRead?: boolean; limit?: number; offset?: number },
  ) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${subscriberExternalId}" not found`);
    }

    const where: any = { subscriberId: subscriber.id };
    if (query.isRead !== undefined) {
      where.isRead = String(query.isRead) === 'true';
    }

    const [notifications, total] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where,
        take: query.limit ? Number(query.limit) : 50,
        skip: query.offset ? Number(query.offset) : 0,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inAppNotification.count({ where }),
    ]);

    return { total, notifications };
  }

  async getUnreadCount(subscriberExternalId: string): Promise<{ unreadCount: number }> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${subscriberExternalId}" not found`);
    }

    const unreadCount = await this.prisma.inAppNotification.count({
      where: { subscriberId: subscriber.id, isRead: false },
    });

    return { unreadCount };
  }

  async markAsRead(id: string) {
    return this.prisma.inAppNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(subscriberExternalId: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber "${subscriberExternalId}" not found`);
    }

    const result = await this.prisma.inAppNotification.updateMany({
      where: { subscriberId: subscriber.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  subscribeToStream(subscriberExternalId: string): Observable<{ data: any }> {
    return this.inAppProvider.eventBus$.pipe(
      filter((event) => event.subscriberExternalId === subscriberExternalId),
      map((event) => ({ data: event })),
    );
  }
}
