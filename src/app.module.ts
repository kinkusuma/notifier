import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { TemplateEngineModule } from './modules/template-engine/template-engine.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { QueueModule } from './modules/queue/queue.module';
import { SubscribersModule } from './modules/subscribers/subscribers.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    TemplateEngineModule,
    ProvidersModule,
    QueueModule,
    SubscribersModule,
    TemplatesModule,
    PreferencesModule,
    ApiKeysModule,
    DispatchModule,
    HealthModule,
  ],
})
export class AppModule {}
