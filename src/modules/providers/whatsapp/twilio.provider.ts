import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChannelType } from '@prisma/client';
import axios from 'axios';
import { INotificationProvider, ProviderResult, SendPayload } from '../interfaces/provider.interface';

@Injectable()
export class TwilioWhatsAppProvider implements INotificationProvider {
  readonly name = 'TWILIO';
  readonly channel = ChannelType.WHATSAPP;
  private readonly logger = new Logger(TwilioWhatsAppProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(payload: SendPayload): Promise<ProviderResult> {
    try {
      const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
      const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
      const fromNumber = this.config.get<string>('TWILIO_PHONE_NUMBER');

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error('Twilio credentials are not fully configured');
      }

      const formattedFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;
      const formattedTo = payload.recipient.startsWith('whatsapp:') ? payload.recipient : `whatsapp:${payload.recipient}`;

      const params = new URLSearchParams();
      params.append('From', formattedFrom);
      params.append('To', formattedTo);
      params.append('Body', payload.content);

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const response = await axios.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${auth}`,
        },
        timeout: 10000,
      });

      return {
        success: true,
        messageId: response.data?.sid,
        rawResponse: response.data,
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      this.logger.error(`Twilio send failed: ${msg}`, err.stack);
      return {
        success: false,
        error: msg,
        rawResponse: err.response?.data,
      };
    }
  }
}
