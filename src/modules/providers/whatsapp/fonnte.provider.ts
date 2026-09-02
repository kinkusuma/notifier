import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import axios from 'axios';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class FonnteWhatsAppProvider implements INotificationProvider {
  readonly name = 'FONNTE';
  readonly channel = ChannelType.WHATSAPP;
  private readonly logger = new Logger(FonnteWhatsAppProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const token = this.config.get<string>('FONNTE_TOKEN');
      if (!token) {
        throw new Error('Fonnte token is not configured');
      }

      const response = await axios.post(
        'https://api.fonnte.com/send',
        {
          target: payload.recipient,
          message: payload.content,
          countryCode: '62',
        },
        {
          headers: {
            Authorization: token,
          },
          timeout: 10000,
        },
      );

      if (response.data?.status === true || response.data?.status === 'true') {
        return {
          success: true,
          messageId: response.data?.id?.[0] || String(Date.now()),
          rawResponse: response.data,
        };
      }

      return {
        success: false,
        error: response.data?.reason || 'Fonnte API rejected dispatch',
        rawResponse: response.data,
      };
    } catch (err: any) {
      const msg = err.response?.data?.reason || err.message;
      this.logger.error(`Fonnte send failed: ${msg}`, err.stack);
      return {
        success: false,
        error: msg,
        rawResponse: err.response?.data,
      };
    }
  }
}
