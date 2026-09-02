import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TerminusModule, QueueModule],
  controllers: [HealthController],
})
export class HealthModule {}
