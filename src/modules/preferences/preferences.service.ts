import { Injectable, NotFoundException } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SetPreferenceDto } from './dto/set-preference.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async setPreference(dto: SetPreferenceDto) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: dto.subscriberExternalId },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with external ID "${dto.subscriberExternalId}" not found`);
    }

    const category = dto.category || 'DEFAULT';

    return this.prisma.userPreference.upsert({
      where: {
        subscriberId_channel_category: {
          subscriberId: subscriber.id,
          channel: dto.channel,
          category,
        },
      },
      create: {
        subscriberId: subscriber.id,
        channel: dto.channel,
        category,
        isEnabled: dto.isEnabled,
      },
      update: {
        isEnabled: dto.isEnabled,
      },
    });
  }

  async getSubscriberPreferences(subscriberExternalId: string) {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
      include: { preferences: true },
    });
    if (!subscriber) {
      throw new NotFoundException(`Subscriber with external ID "${subscriberExternalId}" not found`);
    }
    return subscriber.preferences;
  }

  async isChannelAllowed(
    subscriberExternalId: string,
    channel: ChannelType,
    category: string = 'DEFAULT',
  ): Promise<boolean> {
    const subscriber = await this.prisma.subscriber.findUnique({
      where: { externalId: subscriberExternalId },
    });
    if (!subscriber) return true; // Default allow if not found

    const pref = await this.prisma.userPreference.findUnique({
      where: {
        subscriberId_channel_category: {
          subscriberId: subscriber.id,
          channel,
          category,
        },
      },
    });

    if (pref) {
      return pref.isEnabled;
    }

    // Default fallback: allow
    return true;
  }
}
