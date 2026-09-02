import { Global, Module } from '@nestjs/common';
import { SmtpEmailProvider } from './email/smtp.provider';
import { ResendEmailProvider } from './email/resend.provider';
import { TelegramBotProvider } from './telegram/telegram.provider';
import { FonnteWhatsAppProvider } from './whatsapp/fonnte.provider';
import { TwilioWhatsAppProvider } from './whatsapp/twilio.provider';
import { GenericWebhookProvider } from './webhook/webhook.provider';
import { FcmPushProvider } from './push/fcm.provider';
import { ProviderFactoryService } from './provider-factory.service';

@Global()
@Module({
  providers: [
    SmtpEmailProvider,
    ResendEmailProvider,
    TelegramBotProvider,
    FonnteWhatsAppProvider,
    TwilioWhatsAppProvider,
    GenericWebhookProvider,
    FcmPushProvider,
    ProviderFactoryService,
  ],
  exports: [ProviderFactoryService],
})
export class ProvidersModule {}
