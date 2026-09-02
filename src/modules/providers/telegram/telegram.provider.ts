import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import axios from 'axios';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class TelegramBotProvider implements INotificationProvider {
  readonly name = 'TELEGRAM';
  readonly channel = ChannelType.TELEGRAM;
  private readonly logger = new Logger(TelegramBotProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
      if (!token) {
        throw new Error('Telegram Bot Token is not configured');
      }

      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await axios.post(
        url,
        {
          chat_id: payload.recipient,
          text: payload.content,
          parse_mode: 'HTML',
        },
        { timeout: 10000 },
      );

      if (response.data?.ok) {
        return {
          success: true,
          messageId: String(response.data.result?.message_id),
          rawResponse: response.data,
        };
      }

      return {
        success: false,
        error: response.data?.description || 'Telegram API returned false status',
        rawResponse: response.data,
      };
    } catch (err: any) {
      const msg = err.response?.data?.description || err.message;
      this.logger.error(`Telegram send failed: ${msg}`, err.stack);
      return {
        success: false,
        error: msg,
        rawResponse: err.response?.data,
      };
    }
  }
}
