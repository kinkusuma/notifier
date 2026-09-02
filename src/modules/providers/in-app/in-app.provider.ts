import { Injectable, Logger } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { Subject } from 'rxjs';
import { PrismaService } from '../../../database/prisma.service';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

export interface InAppEvent {
  subscriberExternalId: string;
  notificationId: string;
  title: string;
  message: string;
  data?: any;
  createdAt: string;
}

@Injectable()
export class InAppProvider implements INotificationProvider {
  readonly name = 'IN_APP';
  readonly channel = ChannelType.IN_APP;
  private readonly logger = new Logger(InAppProvider.name);

  // Real-time Event Bus for SSE
  readonly eventBus$ = new Subject<InAppEvent>();

  constructor(private readonly prisma: PrismaService) {}

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const subscriberExternalId = payload.recipient;
      const subscriber = await this.prisma.subscriber.findUnique({
        where: { externalId: subscriberExternalId },
      });

      if (!subscriber) {
        throw new Error(`Subscriber with external ID "${subscriberExternalId}" not found for IN_APP notification`);
      }

      const inAppRecord = await this.prisma.inAppNotification.create({
        data: {
          subscriberId: subscriber.id,
          title: payload.subject || 'Notification',
          message: payload.content,
          data: payload.metadata,
        },
      });

      // Emit to realtime SSE stream
      this.eventBus$.next({
        subscriberExternalId,
        notificationId: inAppRecord.id,
        title: inAppRecord.title,
        message: inAppRecord.message,
        data: inAppRecord.data,
        createdAt: inAppRecord.createdAt.toISOString(),
      });

      return {
        success: true,
        messageId: inAppRecord.id,
        rawResponse: inAppRecord,
      };
    } catch (err: any) {
      this.logger.error(`InApp send failed: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
