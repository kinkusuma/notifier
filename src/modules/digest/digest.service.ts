import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChannelType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DigestService {
  private readonly logger = new Logger(DigestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async bufferNotification(
    subscriberId: string,
    category: string,
    templateSlug: string,
    channel: ChannelType,
    variables: Record<string, any>,
    windowMinutes: number = 15,
  ): Promise<{ isBuffered: boolean; isFirst: boolean; digestId?: string }> {
    const existing = await this.prisma.notificationDigest.findFirst({
      where: {
        subscriberId,
        category,
        templateSlug,
        channel,
        status: 'BUFFERING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existing) {
      const items = Array.isArray(existing.items) ? existing.items : [];
      items.push(variables);

      await this.prisma.notificationDigest.update({
        where: { id: existing.id },
        data: { items },
      });

      this.logger.log(`Appended notification to existing digest ${existing.id} (total: ${items.length} items)`);
      return { isBuffered: true, isFirst: false, digestId: existing.id };
    }

    const expiresAt = new Date(Date.now() + windowMinutes * 60 * 1000);
    const newDigest = await this.prisma.notificationDigest.create({
      data: {
        subscriberId,
        category,
        templateSlug,
        channel,
        items: [variables],
        expiresAt,
        status: 'BUFFERING',
      },
    });

    this.logger.log(`Created new digest buffer ${newDigest.id} expiring at ${expiresAt.toISOString()}`);
    return { isBuffered: true, isFirst: true, digestId: newDigest.id };
  }

  async flushDigest(digestId: string) {
    const digest = await this.prisma.notificationDigest.findUnique({
      where: { id: digestId },
      include: { subscriber: true },
    });

    if (!digest) {
      throw new NotFoundException(`Digest "${digestId}" not found`);
    }

    await this.prisma.notificationDigest.update({
      where: { id: digestId },
      data: { status: 'DISPATCHED' },
    });

    const items = Array.isArray(digest.items) ? digest.items : [];
    return {
      subscriber: digest.subscriber,
      templateSlug: digest.templateSlug,
      channel: digest.channel,
      category: digest.category,
      combinedVariables: {
        items,
        count: items.length,
      },
    };
  }
}
