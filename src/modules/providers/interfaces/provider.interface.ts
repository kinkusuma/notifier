import { ChannelType } from '@prisma/client';

export interface SendPayload {
  recipient: string;
  subject?: string;
  content: string;
  htmlContent?: string;
  metadata?: Record<string, any>;
}

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  rawResponse?: any;
}

export interface INotificationProvider {
  readonly name: string;
  readonly channel: ChannelType;
  send(payload: SendPayload): Promise<ProviderResult>;
}
