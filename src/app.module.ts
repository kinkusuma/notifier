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
import { InAppModule } from './modules/in-app/in-app.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ThrottleModule } from './modules/throttle/throttle.module';
import { DigestModule } from './modules/digest/digest.module';
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
    ThrottleModule,
    DigestModule,
    QueueModule,
    SubscribersModule,
    TemplatesModule,
    PreferencesModule,
    ApiKeysModule,
    DispatchModule,
    InAppModule,
    WebhooksModule,
    HealthModule,
  ],
})
export class AppModule {}
