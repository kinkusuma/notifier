import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import { Resend } from 'resend';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class ResendEmailProvider implements INotificationProvider {
  readonly name = 'RESEND';
  readonly channel = ChannelType.EMAIL;
  private readonly logger = new Logger(ResendEmailProvider.name);
  private resend: Resend | null = null;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const apiKey = this.config.get<string>('RESEND_API_KEY');
      if (!this.resend && apiKey) {
        this.resend = new Resend(apiKey);
      }

      if (!this.resend) {
        throw new Error('Resend API key is not configured');
      }

      const from = this.config.get<string>('RESEND_FROM', 'Notifier <onboarding@resend.dev>');
      const response = await this.resend.emails.send({
        from,
        to: payload.recipient,
        subject: payload.subject || 'Notification',
        text: payload.content,
        html: payload.htmlContent || undefined,
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.message,
          rawResponse: response.error,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
        rawResponse: response.data,
      };
    } catch (err: any) {
      this.logger.error(`Resend email send failed: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
