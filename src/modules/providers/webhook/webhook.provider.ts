import { Injectable, Logger } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import axios from 'axios';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class GenericWebhookProvider implements INotificationProvider {
  readonly name = 'WEBHOOK';
  readonly channel = ChannelType.WEBHOOK;
  private readonly logger = new Logger(GenericWebhookProvider.name);

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const targetUrl = payload.recipient;
      if (!targetUrl || !targetUrl.startsWith('http')) {
        throw new Error(`Invalid webhook target URL: ${targetUrl}`);
      }

      let body: any;

      if (targetUrl.includes('discord.com/api/webhooks')) {
        body = {
          content: payload.content,
          embeds: payload.subject
            ? [
                {
                  title: payload.subject,
                  description: payload.content,
                  color: 0x5865f2,
                },
              ]
            : undefined,
        };
      } else if (targetUrl.includes('hooks.slack.com')) {
        body = {
          text: payload.content,
        };
      } else {
        body = {
          event: 'notification.dispatch',
          subject: payload.subject,
          content: payload.content,
          recipient: payload.recipient,
          metadata: payload.metadata,
          timestamp: new Date().toISOString(),
        };
      }

      const response = await axios.post(targetUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Notifier-Dispatcher/1.0',
        },
        timeout: 10000,
      });

      return {
        success: response.status >= 200 && response.status < 300,
        messageId: `wh_${Date.now()}`,
        rawResponse: response.data,
      };
    } catch (err: any) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      this.logger.error(`Webhook send failed: ${msg}`, err.stack);
      return {
        success: false,
        error: msg,
        rawResponse: err.response?.data,
      };
    }
  }
}
