import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChannelType, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProviderFactoryService } from '../providers/provider-factory.service';
import { TemplateEngineService } from '../template-engine/template-engine.service';
import { PreferencesService } from '../preferences/preferences.service';
import { ThrottleService } from '../throttle/throttle.service';
import { DigestService } from '../digest/digest.service';
import { PgBossService } from './pg-boss.service';
import { NotificationJobPayload } from './interfaces/job-payload.interface';

export const NOTIFICATION_QUEUE_NAME = 'notifications-dispatch';
export const DIGEST_QUEUE_NAME = 'notifications-digest-flush';

@Injectable()
export class NotificationWorkerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ProviderFactoryService,
    private readonly templateEngine: TemplateEngineService,
    private readonly preferencesService: PreferencesService,
    private readonly throttleService: ThrottleService,
    private readonly digestService: DigestService,
    private readonly pgBossService: PgBossService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // 1. Worker for individual dispatches
    await this.pgBossService.work<NotificationJobPayload>(
      NOTIFICATION_QUEUE_NAME,
      async (jobs) => {
        for (const job of jobs) {
          try {
            await this.processJob(job.data);
          } catch (err: any) {
            this.logger.error(`Error processing job ${job.id}: ${err.message}`, err.stack);
          }
        }
      },
      { batchSize: 5 },
    );

    // 2. Worker for digest flushes
    await this.pgBossService.work<{ digestId: string }>(
      DIGEST_QUEUE_NAME,
      async (jobs) => {
        for (const job of jobs) {
          try {
            await this.processDigestFlush(job.data.digestId);
          } catch (err: any) {
            this.logger.error(`Error flushing digest ${job.id}: ${err.message}`, err.stack);
          }
        }
      },
      { batchSize: 5 },
    );

    this.logger.log(`Workers registered on queues "${NOTIFICATION_QUEUE_NAME}" & "${DIGEST_QUEUE_NAME}".`);
  }

  async processJob(data: NotificationJobPayload): Promise<void> {
    const { logId, subscriberExternalId, templateSlug, channel, variables, providerOverride, recipientOverride, category } = data;

    this.logger.log(`Processing notification logId: ${logId} for subscriber: ${subscriberExternalId} via ${channel}`);

    // 1. Fetch Subscriber & Template
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });

    if (!subscriber) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `Subscriber with external ID "${subscriberExternalId}" not found`,
        },
      });
      return;
    }

    const template = await this.prisma.template.findUnique({
      where: { slug: templateSlug },
    });

    if (!template) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `Template with slug "${templateSlug}" not found`,
        },
      });
      return;
    }

    // 2. Check User Preference (Opt-in / Opt-out)
    const isAllowed = await this.preferencesService.isChannelAllowed(subscriberExternalId, channel, category || 'DEFAULT');
    if (!isAllowed) {
      this.logger.warn(`Subscriber ${subscriberExternalId} has opted-out of ${channel} notifications for category ${category || 'DEFAULT'}.`);
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `User opted-out from channel ${channel}`,
        },
      });
      return;
    }

    // 3. Check Throttle / Frequency Cap
    const isThrottled = await this.throttleService.isThrottled(subscriber.id, category || 'DEFAULT', 30);
    if (isThrottled) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `Frequency cap exceeded for subscriber ${subscriberExternalId}`,
        },
      });
      return;
    }

    // 4. Check Digest / Aggregation Window
    const digestConfig = (template.metadata as any)?.digest;
    if (digestConfig?.enabled) {
      const windowMinutes = Number(digestConfig.windowMinutes) || 15;
      const bufferRes = await this.digestService.bufferNotification(
        subscriber.id,
        category || 'DEFAULT',
        template.slug,
        channel,
        variables,
        windowMinutes,
      );

      if (bufferRes.isFirst && bufferRes.digestId) {
        // Schedule flush job
        await this.pgBossService.send(
          DIGEST_QUEUE_NAME,
          { digestId: bufferRes.digestId },
          { startAfter: windowMinutes * 60 },
        );
      }

      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.DELIVERED,
          messageId: `buffered_in_digest_${bufferRes.digestId}`,
        },
      });
      return;
    }

    // 5. Resolve Recipient Target
    const recipient = recipientOverride || this.resolveRecipient(subscriber, channel);
    if (!recipient) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `No recipient address configured for channel ${channel}`,
        },
      });
      return;
    }

    // 6. Render Template Content
    const renderedSubject = template.subject ? this.templateEngine.render(template.subject, variables) : undefined;
    const renderedBodyText = this.templateEngine.render(template.bodyText, variables);
    const renderedBodyHtml = template.bodyHtml ? this.templateEngine.render(template.bodyHtml, variables) : undefined;

    // 7. Update Status to PROCESSING
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationStatus.PROCESSING,
        recipient,
        subject: renderedSubject,
        content: renderedBodyText,
      },
    });

    // 8. Dispatch via Provider
    const provider = this.providerFactory.getProvider(channel, providerOverride);
    const result = await provider.send({
      recipient,
      subject: renderedSubject,
      content: renderedBodyText,
      htmlContent: renderedBodyHtml,
      metadata: variables,
    });

    // 9. Handle Dispatch Result
    if (result.success) {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.DELIVERED,
          messageId: result.messageId,
          provider: provider.name,
        },
      });
    } else {
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: result.error,
          provider: provider.name,
          retriesCount: { increment: 1 },
        },
      });

      // Cross-Channel Fallback Logic
      if (template.fallbackChannel && template.fallbackChannel !== channel) {
        await this.triggerFallback(logId, subscriber, template, variables, category);
      }
    }
  }

  async processDigestFlush(digestId: string): Promise<void> {
    const { subscriber, templateSlug, channel, combinedVariables, category } =
      await this.digestService.flushDigest(digestId);

    if (combinedVariables.count === 0) return;

    const template = await this.prisma.template.findUnique({
      where: { slug: templateSlug },
    });
    if (!template) return;

    const recipient = this.resolveRecipient(subscriber, channel);
    if (!recipient) return;

    const renderedSubject = template.subject
      ? this.templateEngine.render(template.subject, combinedVariables)
      : undefined;
    const renderedBodyText = this.templateEngine.render(template.bodyText, combinedVariables);
    const renderedBodyHtml = template.bodyHtml
      ? this.templateEngine.render(template.bodyHtml, combinedVariables)
      : undefined;

    const provider = this.providerFactory.getProvider(channel);
    await provider.send({
      recipient,
      subject: renderedSubject,
      content: renderedBodyText,
      htmlContent: renderedBodyHtml,
      metadata: combinedVariables,
    });

    this.logger.log(`Digest ${digestId} with ${combinedVariables.count} items flushed to ${recipient} via ${channel}`);
  }

  private resolveRecipient(subscriber: any, channel: ChannelType): string | null {
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
        return subscriber.fcmTokens && subscriber.fcmTokens.length > 0 ? subscriber.fcmTokens[0] : null;
      case ChannelType.IN_APP:
        return subscriber.externalId || null;
      default:
        return null;
    }
  }

  private async triggerFallback(
    parentLogId: string,
    subscriber: any,
    template: any,
    variables: Record<string, any>,
    category?: string,
  ): Promise<void> {
    const fallbackChannel = template.fallbackChannel as ChannelType;
    const fallbackRecipient = this.resolveRecipient(subscriber, fallbackChannel);

    if (!fallbackRecipient) {
      return;
    }

    await this.prisma.notificationLog.update({
      where: { id: parentLogId },
      data: { status: NotificationStatus.FALLBACK_TRIGGERED },
    });

    const fallbackLog = await this.prisma.notificationLog.create({
      data: {
        subscriberId: subscriber.id,
        templateSlug: template.slug,
        channel: fallbackChannel,
        provider: 'PENDING',
        recipient: fallbackRecipient,
        content: '',
        status: NotificationStatus.QUEUED,
        parentLogId,
      },
    });

    await this.pgBossService.send(
      NOTIFICATION_QUEUE_NAME,
      {
        logId: fallbackLog.id,
        subscriberExternalId: subscriber.externalId,
        templateSlug: template.slug,
        channel: fallbackChannel,
        variables,
        category,
        parentLogId,
      },
      { retryLimit: 3, retryBackoff: true },
    );
  }
}
