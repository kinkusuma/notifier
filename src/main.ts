import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.enableShutdownHooks();

  // Global pipes, filters, interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Swagger & OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Notification Dispatcher Engine')
    .setDescription(
      'Enterprise Multi-Channel Notification Dispatcher Engine supporting Email (SMTP, Resend), Telegram, WhatsApp (Fonnte, Twilio), Webhooks, and Push (FCM) with pg-boss queue, handlebars templating, and automatic cross-channel fallback.',
    )
    .setVersion('1.0.0')
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Scalar API Reference setup
  app.use(
    '/reference',
    apiReference({
      theme: 'purple',
      spec: {
        content: document,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 Notifier Engine is running on: http://localhost:${port}`);
  logger.log(`📖 Swagger Documentation: http://localhost:${port}/docs`);
  logger.log(`✨ Scalar API Reference: http://localhost:${port}/reference`);
  logger.log(`💓 Health Check: http://localhost:${port}/health`);
}

bootstrap();
