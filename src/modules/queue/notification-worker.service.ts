import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChannelType, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProviderFactoryService } from '../providers/provider-factory.service';
import { TemplateEngineService } from '../template-engine/template-engine.service';
import { PreferencesService } from '../preferences/preferences.service';
import { PgBossService } from './pg-boss.service';
import { NotificationJobPayload } from './interfaces/job-payload.interface';

export const NOTIFICATION_QUEUE_NAME = 'notifications-dispatch';

@Injectable()
export class NotificationWorkerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationWorkerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: ProviderFactoryService,
    private readonly templateEngine: TemplateEngineService,
    private readonly preferencesService: PreferencesService,
    private readonly pgBossService: PgBossService,
  ) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

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

    this.logger.log(`Worker registered on queue "${NOTIFICATION_QUEUE_NAME}".`);
  }

  async processJob(data: NotificationJobPayload): Promise<void> {
    const { logId, subscriberExternalId, templateSlug, channel, variables, providerOverride, recipientOverride, category } = data;

    this.logger.log(`Processing notification logId: ${logId} for subscriber: ${subscriberExternalId} via ${channel}`);

    // 1. Fetch Subscriber & Template
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });

    if (!subscriber) {
      this.logger.error(`Subscriber ${subscriberExternalId} not found. Aborting.`);
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
      this.logger.error(`Template ${templateSlug} not found. Aborting.`);
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

    // 3. Resolve Recipient Target
    const recipient = recipientOverride || this.resolveRecipient(subscriber, channel);
    if (!recipient) {
      this.logger.error(`No destination address found for channel ${channel} on subscriber ${subscriberExternalId}`);
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: `No recipient address configured for channel ${channel}`,
        },
      });
      return;
    }

    // 4. Render Template Content
    const renderedSubject = template.subject ? this.templateEngine.render(template.subject, variables) : undefined;
    const renderedBodyText = this.templateEngine.render(template.bodyText, variables);
    const renderedBodyHtml = template.bodyHtml ? this.templateEngine.render(template.bodyHtml, variables) : undefined;

    // 5. Update Status to PROCESSING
    await this.prisma.notificationLog.update({
      where: { id: logId },
      data: {
        status: NotificationStatus.PROCESSING,
        recipient,
        subject: renderedSubject,
        content: renderedBodyText,
      },
    });

    // 6. Dispatch via Provider
    const provider = this.providerFactory.getProvider(channel, providerOverride);
    const result = await provider.send({
      recipient,
      subject: renderedSubject,
      content: renderedBodyText,
      htmlContent: renderedBodyHtml,
      metadata: variables,
    });

    // 7. Handle Dispatch Result
    if (result.success) {
      this.logger.log(`Notification logId: ${logId} successfully DELIVERED via ${provider.name}.`);
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.DELIVERED,
          messageId: result.messageId,
          provider: provider.name,
        },
      });
    } else {
      this.logger.warn(`Notification logId: ${logId} FAILED via ${provider.name}: ${result.error}`);
      await this.prisma.notificationLog.update({
        where: { id: logId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage: result.error,
          provider: provider.name,
          retriesCount: { increment: 1 },
        },
      });

      // 8. Cross-Channel Fallback Logic
      if (template.fallbackChannel && template.fallbackChannel !== channel) {
        await this.triggerFallback(logId, subscriber, template, variables, category);
      }
    }
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
      this.logger.warn(`Cannot trigger fallback to ${fallbackChannel}: subscriber has no recipient configured.`);
      return;
    }

    this.logger.log(`Triggering Cross-Channel Fallback from logId: ${parentLogId} to ${fallbackChannel}`);

    // Update parent log to FALLBACK_TRIGGERED
    await this.prisma.notificationLog.update({
      where: { id: parentLogId },
      data: { status: NotificationStatus.FALLBACK_TRIGGERED },
    });

    // Create new fallback notification log
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

    // Enqueue fallback job
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
