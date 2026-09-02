import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotProvider } from '../providers/telegram/telegram.provider';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramProvider: TelegramBotProvider,
    private readonly config: ConfigService,
  ) {}

  async handleResendWebhook(payload: any) {
    const eventType = payload.type;
    const emailId = payload.data?.email_id || payload.data?.id;

    if (!emailId) {
      return { updated: false, reason: 'No email_id in payload' };
    }

    let status: NotificationStatus | null = null;
    if (eventType === 'email.delivered') status = NotificationStatus.DELIVERED;
    else if (eventType === 'email.opened') status = NotificationStatus.OPENED;
    else if (eventType === 'email.clicked') status = NotificationStatus.CLICKED;
    else if (eventType === 'email.bounced') status = NotificationStatus.BOUNCED;

    if (!status) {
      return { updated: false, reason: `Ignored event type ${eventType}` };
    }

    const log = await this.prisma.notificationLog.findFirst({
      where: { messageId: emailId },
    });

    if (!log) {
      return { updated: false, reason: `Log with messageId ${emailId} not found` };
    }

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: { status },
    });

    this.logger.log(`Resend webhook updated logId ${log.id} to status ${status}`);
    return { updated: true, logId: log.id, status };
  }

  async handleTwilioWebhook(payload: any) {
    const messageSid = payload.MessageSid || payload.SmsSid;
    const messageStatus = (payload.MessageStatus || payload.SmsStatus || '').toLowerCase();

    if (!messageSid) {
      return { updated: false, reason: 'No MessageSid in payload' };
    }

    let status: NotificationStatus | null = null;
    if (messageStatus === 'delivered') status = NotificationStatus.DELIVERED;
    else if (messageStatus === 'read') status = NotificationStatus.OPENED;
    else if (messageStatus === 'failed' || messageStatus === 'undelivered') status = NotificationStatus.FAILED;

    if (!status) {
      return { updated: false, reason: `Ignored status ${messageStatus}` };
    }

    const log = await this.prisma.notificationLog.findFirst({
      where: { messageId: messageSid },
    });

    if (!log) {
      return { updated: false, reason: `Log with messageId ${messageSid} not found` };
    }

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: { status },
    });

    this.logger.log(`Twilio webhook updated logId ${log.id} to status ${status}`);
    return { updated: true, logId: log.id, status };
  }

  async handleFonnteWebhook(payload: any) {
    const messageId = payload.id || payload.message_id;
    const statusStr = (payload.status || '').toLowerCase();

    if (!messageId) {
      return { updated: false, reason: 'No id in payload' };
    }

    let status: NotificationStatus | null = null;
    if (statusStr === 'sent' || statusStr === 'delivered') status = NotificationStatus.DELIVERED;
    else if (statusStr === 'read') status = NotificationStatus.OPENED;
    else if (statusStr === 'failed') status = NotificationStatus.FAILED;

    if (!status) {
      return { updated: false, reason: `Ignored status ${statusStr}` };
    }

    const log = await this.prisma.notificationLog.findFirst({
      where: { messageId: String(messageId) },
    });

    if (!log) {
      return { updated: false, reason: `Log with messageId ${messageId} not found` };
    }

    await this.prisma.notificationLog.update({
      where: { id: log.id },
      data: { status },
    });

    return { updated: true, logId: log.id, status };
  }

  /**
   * Telegram Magic Connect Webhook
   * Automatically captures chatId from user clicking "https://t.me/bot?start=<subscriberExternalId>"
   */
  async handleTelegramWebhook(payload: any) {
    const message = payload.message || payload.edited_message;
    if (!message || !message.chat?.id) {
      return { ok: true, ignored: true };
    }

    const chatId = String(message.chat.id);
    const text = (message.text || '').trim();

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const externalId = parts.length > 1 ? parts[1].trim() : null;

      if (externalId) {
        const subscriber = await this.prisma.subscriber.findUnique({
          where: { externalId },
        });

        if (subscriber) {
          await this.prisma.subscriber.update({
            where: { externalId },
            data: { telegramChatId: chatId },
          });

          this.logger.log(`✅ Telegram Magic Connect: Linked Subscriber ${externalId} with Chat ID ${chatId}`);

          // Reply confirmation to user
          await this.telegramProvider.send({
            recipient: chatId,
            content: `🎉 <b>Selamat!</b> Akun Anda (<code>${externalId}</code>) berhasil terhubung ke sistem notifikasi.\n\nAnda akan menerima pemberitahuan otomatis di sini.`,
          });

          return { ok: true, linked: true, subscriberExternalId: externalId, chatId };
        } else {
          await this.telegramProvider.send({
            recipient: chatId,
            content: `⚠️ ID Pengguna <code>${externalId}</code> tidak ditemukan di sistem. Pastikan Anda mendaftar terlebih dahulu.`,
          });
          return { ok: true, linked: false, reason: 'Subscriber not found' };
        }
      } else {
        await this.telegramProvider.send({
          recipient: chatId,
          content: `👋 <b>Halo!</b> Ini adalah bot Notifier.\n\nUntuk menghubungkan akun Anda, gunakan tombol <i>"Hubungkan Telegram"</i> dari aplikasi Anda.`,
        });
        return { ok: true, linked: false, reason: 'No start payload' };
      }
    }

    return { ok: true, ignored: true };
  }

  getTelegramConnectUrl(subscriberExternalId: string): string {
    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME', 'YourNotifierBot');
    return `https://t.me/${botUsername}?start=${encodeURIComponent(subscriberExternalId)}`;
  }
}
