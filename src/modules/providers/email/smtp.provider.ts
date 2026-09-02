import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class SmtpEmailProvider implements INotificationProvider {
  readonly name = 'SMTP';
  readonly channel = ChannelType.EMAIL;
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure = this.config.get<string>('SMTP_SECURE') === 'true';

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(port),
        secure,
        auth: user && pass ? { user, pass } : undefined,
      });
    }
  }

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      if (!this.transporter) {
        this.initTransporter();
      }

      if (!this.transporter) {
        throw new Error('SMTP transporter is not configured');
      }

      const from = this.config.get<string>('SMTP_FROM', 'Notifier <no-reply@example.com>');
      const info = await this.transporter.sendMail({
        from,
        to: payload.recipient,
        subject: payload.subject || 'Notification',
        text: payload.content,
        html: payload.htmlContent || undefined,
      });

      return {
        success: true,
        messageId: info.messageId,
        rawResponse: info,
      };
    } catch (err: any) {
      this.logger.error(`SMTP send failed: ${err.message}`, err.stack);
      return {
        success: false,
        error: err.message,
      };
    }
  }
}
