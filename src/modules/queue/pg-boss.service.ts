import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: any = null;
  private isStarted = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    let connectionString = this.config.get<string>('DIRECT_URL') || this.config.get<string>('DATABASE_URL');
    if (!connectionString) {
      this.logger.warn('DATABASE_URL not configured. PgBoss will not start.');
      return;
    }

    // If using Neon pooler host (-pooler.), prefer direct host for background workers/queues to prevent pooler disconnects
    if (connectionString.includes('-pooler.')) {
      connectionString = connectionString.replace('-pooler.', '.');
    }

    try {
      const isSsl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co');
      
      const pgBossModule = await import('pg-boss');
      const PgBoss = pgBossModule.PgBoss || (pgBossModule as any).default || pgBossModule;

      this.boss = new PgBoss({
        connectionString,
        ssl: isSsl ? { rejectUnauthorized: false } : undefined,
        application_name: 'notifier_pg_boss',
      });

      this.boss.on('error', (error: any) => {
        this.logger.error(`PgBoss error: ${error.message}`);
      });

      await this.boss.start();
      this.isStarted = true;
      this.logger.log('PgBoss queue engine started successfully.');
    } catch (err: any) {
      this.logger.error(`Failed to start PgBoss: ${err.message}`, err.stack);
    }
  }

  async onModuleDestroy() {
    if (this.boss && this.isStarted) {
      await this.boss.stop({ graceful: true, timeout: 5000 });
      this.isStarted = false;
      this.logger.log('PgBoss stopped gracefully.');
    }
  }

  async send(queueName: string, data: object, options?: any): Promise<string | null> {
    if (!this.boss || !this.isStarted) {
      this.logger.warn(`PgBoss not connected. Skipping sending job to "${queueName}".`);
      return null;
    }
    return this.boss.send(queueName, data, options);
  }

  async work<T>(
    queueName: string,
    handler: (jobs: Array<{ id: string; data: T }>) => Promise<void>,
    options?: any,
  ): Promise<string | null> {
    if (!this.boss || !this.isStarted) {
      this.logger.warn(`PgBoss not connected. Skipping worker for "${queueName}".`);
      return null;
    }
    return this.boss.work(queueName, options || {}, handler);
  }

  getBossInstance(): any {
    return this.boss;
  }

  isReady(): boolean {
    return this.isStarted;
  }
}
