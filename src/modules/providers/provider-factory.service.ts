import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import { INotificationProvider } from './interfaces/provider.interface';
import { SmtpEmailProvider } from './email/smtp.provider';
import { ResendEmailProvider } from './email/resend.provider';
import { TelegramBotProvider } from './telegram/telegram.provider';
import { FonnteWhatsAppProvider } from './whatsapp/fonnte.provider';
import { TwilioWhatsAppProvider } from './whatsapp/twilio.provider';
import { GenericWebhookProvider } from './webhook/webhook.provider';
import { FcmPushProvider } from './push/fcm.provider';
import { InAppProvider } from './in-app/in-app.provider';

@Injectable()
export class ProviderFactoryService {
  private readonly providers = new Map<string, INotificationProvider>();

  constructor(
    private readonly config: ConfigService,
    private readonly smtpEmailProvider: SmtpEmailProvider,
    private readonly resendEmailProvider: ResendEmailProvider,
    private readonly telegramBotProvider: TelegramBotProvider,
    private readonly fonnteWhatsAppProvider: FonnteWhatsAppProvider,
    private readonly twilioWhatsAppProvider: TwilioWhatsAppProvider,
    private readonly genericWebhookProvider: GenericWebhookProvider,
    private readonly fcmPushProvider: FcmPushProvider,
    private readonly inAppProvider: InAppProvider,
  ) {
    this.registerProvider(this.smtpEmailProvider);
    this.registerProvider(this.resendEmailProvider);
    this.registerProvider(this.telegramBotProvider);
    this.registerProvider(this.fonnteWhatsAppProvider);
    this.registerProvider(this.twilioWhatsAppProvider);
    this.registerProvider(this.genericWebhookProvider);
    this.registerProvider(this.fcmPushProvider);
    this.registerProvider(this.inAppProvider);
  }

  private registerProvider(provider: INotificationProvider) {
    this.providers.set(`${provider.channel}_${provider.name.toUpperCase()}`, provider);
  }

  getProvider(channel: ChannelType, providerName?: string): INotificationProvider {
    if (providerName) {
      const specific = this.providers.get(`${channel}_${providerName.toUpperCase()}`);
      if (specific) {
        return specific;
      }
    }

    switch (channel) {
      case ChannelType.EMAIL: {
        const defaultEmail = this.config.get<string>('DEFAULT_EMAIL_PROVIDER', 'RESEND').toUpperCase();
        return (
          this.providers.get(`${ChannelType.EMAIL}_${defaultEmail}`) ||
          this.resendEmailProvider ||
          this.smtpEmailProvider
        );
      }
      case ChannelType.WHATSAPP: {
        const defaultWa = this.config.get<string>('DEFAULT_WHATSAPP_PROVIDER', 'FONNTE').toUpperCase();
        return (
          this.providers.get(`${ChannelType.WHATSAPP}_${defaultWa}`) ||
          this.fonnteWhatsAppProvider ||
          this.twilioWhatsAppProvider
        );
      }
      case ChannelType.TELEGRAM:
        return this.telegramBotProvider;
      case ChannelType.WEBHOOK:
        return this.genericWebhookProvider;
      case ChannelType.PUSH:
        return this.fcmPushProvider;
      case ChannelType.IN_APP:
        return this.inAppProvider;
      default:
        throw new NotFoundException(`No provider available for channel: ${channel}`);
    }
  }
}
