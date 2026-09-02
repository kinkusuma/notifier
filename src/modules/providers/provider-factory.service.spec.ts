import { ChannelType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ProviderFactoryService } from './provider-factory.service';
import { SmtpEmailProvider } from './email/smtp.provider';
import { ResendEmailProvider } from './email/resend.provider';
import { TelegramBotProvider } from './telegram/telegram.provider';
import { FonnteWhatsAppProvider } from './whatsapp/fonnte.provider';
import { TwilioWhatsAppProvider } from './whatsapp/twilio.provider';
import { GenericWebhookProvider } from './webhook/webhook.provider';
import { FcmPushProvider } from './push/fcm.provider';
import { InAppProvider } from './in-app/in-app.provider';
import { PrismaService } from '../../database/prisma.service';

describe('ProviderFactoryService', () => {
  let factory: ProviderFactoryService;
  let config: jest.Mocked<Partial<ConfigService>>;

  let smtp: SmtpEmailProvider;
  let resend: ResendEmailProvider;
  let telegram: TelegramBotProvider;
  let fonnte: FonnteWhatsAppProvider;
  let twilio: TwilioWhatsAppProvider;
  let webhook: GenericWebhookProvider;
  let fcm: FcmPushProvider;
  let inApp: InAppProvider;

  beforeEach(() => {
    config = {
      get: jest.fn().mockImplementation((key: string, defaultVal: any) => {
        if (key === 'DEFAULT_EMAIL_PROVIDER') return 'RESEND';
        if (key === 'DEFAULT_WHATSAPP_PROVIDER') return 'FONNTE';
        return defaultVal;
      }),
    };

    smtp = new SmtpEmailProvider(config as unknown as ConfigService);
    resend = new ResendEmailProvider(config as unknown as ConfigService);
    telegram = new TelegramBotProvider(config as unknown as ConfigService);
    fonnte = new FonnteWhatsAppProvider(config as unknown as ConfigService);
    twilio = new TwilioWhatsAppProvider(config as unknown as ConfigService);
    webhook = new GenericWebhookProvider();
    fcm = new FcmPushProvider(config as unknown as ConfigService);
    inApp = new InAppProvider({} as unknown as PrismaService);

    factory = new ProviderFactoryService(
      config as unknown as ConfigService,
      smtp,
      resend,
      telegram,
      fonnte,
      twilio,
      webhook,
      fcm,
      inApp,
    );
  });

  it('should resolve default email provider to RESEND', () => {
    const provider = factory.getProvider(ChannelType.EMAIL);
    expect(provider.name).toBe('RESEND');
  });

  it('should resolve specific email provider override when requested', () => {
    const provider = factory.getProvider(ChannelType.EMAIL, 'SMTP');
    expect(provider.name).toBe('SMTP');
  });

  it('should resolve Telegram provider', () => {
    const provider = factory.getProvider(ChannelType.TELEGRAM);
    expect(provider.name).toBe('TELEGRAM');
  });

  it('should resolve Webhook provider', () => {
    const provider = factory.getProvider(ChannelType.WEBHOOK);
    expect(provider.name).toBe('WEBHOOK');
  });

  it('should resolve WhatsApp default to FONNTE', () => {
    const provider = factory.getProvider(ChannelType.WHATSAPP);
    expect(provider.name).toBe('FONNTE');
  });

  it('should resolve IN_APP provider', () => {
    const provider = factory.getProvider(ChannelType.IN_APP);
    expect(provider.name).toBe('IN_APP');
  });
});
