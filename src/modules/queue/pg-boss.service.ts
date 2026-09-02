import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss: any = null;
  private isStarted = false;
  private lastError: string | null = null;
  private isReconnecting = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    await this.startWithRetry();
  }

  private async startWithRetry(maxRetries = 5, delayMs = 2000) {
    let connectionString = this.config.get<string>('DIRECT_URL') || this.config.get<string>('DATABASE_URL');
    if (!connectionString) {
      this.logger.warn('DATABASE_URL not configured. PgBoss will not start.');
      this.lastError = 'DATABASE_URL not configured';
      return;
    }

    // For Neon Postgres, pg-boss works best on direct host or with explicit SSL
    if (connectionString.includes('-pooler.') && !this.config.get<string>('DIRECT_URL')) {
      connectionString = connectionString.replace('-pooler.', '.');
    }

    const isSsl =
      connectionString.includes('sslmode=require') ||
      connectionString.includes('neon.tech') ||
      connectionString.includes('supabase.co');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const pgBossModule = await import('pg-boss');
        const PgBoss = (pgBossModule as any).PgBoss || (pgBossModule as any).default || pgBossModule;

        this.boss = new PgBoss({
          connectionString,
          ssl: isSsl ? { rejectUnauthorized: false } : undefined,
          application_name: 'notifier_pg_boss',
          schema: 'pgboss',
          max: 10,
          connectionTimeoutMillis: 30000,
          keepAlive: true,
        });

        this.boss.on('error', (error: any) => {
          this.logger.warn(`PgBoss connection dropped: ${error.message}`);
          this.lastError = error.message;

          if (
            error.message.includes('Connection terminated') ||
            error.message.includes('timeout') ||
            error.message.includes('ECONNRESET')
          ) {
            this.handleConnectionDrop();
          }
        });

        await this.boss.start();
        this.isStarted = true;
        this.lastError = null;
        this.isReconnecting = false;
        this.logger.log('✅ PgBoss queue engine connected and started successfully.');
        return;
      } catch (err: any) {
        this.lastError = err.message;
        this.logger.warn(
          `PgBoss connection attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${delayMs}ms...`,
        );
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, delayMs));
        } else {
          this.logger.error(`❌ Failed to start PgBoss after ${maxRetries} attempts: ${err.message}`, err.stack);
        }
      }
    }
  }

  private async handleConnectionDrop() {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    this.isStarted = false;

    this.logger.log('🔄 Attempting automatic reconnection to PgBoss (Neon wake-up)...');
    try {
      if (this.boss) {
        try {
          await this.boss.stop({ graceful: false });
        } catch {
          // ignore cleanup errors on dead connection
        }
      }
      await this.startWithRetry(3, 3000);
    } finally {
      this.isReconnecting = false;
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

  getLastError(): string | null {
    return this.lastError;
  }
}
