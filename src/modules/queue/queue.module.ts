import { Global, Module } from '@nestjs/common';
import { PgBossService } from './pg-boss.service';
import { NotificationWorkerService } from './notification-worker.service';
import { PreferencesModule } from '../preferences/preferences.module';

@Global()
@Module({
  imports: [PreferencesModule],
  providers: [PgBossService, NotificationWorkerService],
  exports: [PgBossService, NotificationWorkerService],
})
export class QueueModule {}
