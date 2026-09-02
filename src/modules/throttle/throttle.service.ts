import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ThrottleService {
  private readonly logger = new Logger(ThrottleService.name);

  constructor(private readonly prisma: PrismaService) {}

  async isThrottled(
    subscriberId: string,
    category: string = 'DEFAULT',
    limitPerHour: number = 20,
  ): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const count = await this.prisma.notificationLog.count({
      where: {
        subscriberId,
        createdAt: { gte: oneHourAgo },
        status: { notIn: ['FAILED'] },
      },
    });

    if (count >= limitPerHour) {
      this.logger.warn(`Subscriber ${subscriberId} throttled: ${count} notifications in past hour (limit: ${limitPerHour})`);
      return true;
    }

    return false;
  }
}
