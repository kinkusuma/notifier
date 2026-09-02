import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../database/prisma.service';
import { PgBossService } from '../queue/pg-boss.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly pgBoss: PgBossService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    return this.health.check([
      async () => {
        try {
          await this.prisma.$queryRaw`SELECT 1`;
          return { database: { status: 'up' } };
        } catch (e: any) {
          return { database: { status: 'down', message: e.message } };
        }
      },
      async () => {
        const ready = this.pgBoss.isReady();
        return {
          pgBossQueue: {
            status: ready ? 'up' : 'down',
          },
        };
      },
    ]);
  }
}
