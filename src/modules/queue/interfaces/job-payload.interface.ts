import { ChannelType } from '@prisma/client';

export interface NotificationJobPayload {
  logId: string;
  subscriberExternalId: string;
  templateSlug: string;
  channel: ChannelType;
  providerOverride?: string;
  recipientOverride?: string;
  variables: Record<string, any>;
  category?: string;
  parentLogId?: string;
}
