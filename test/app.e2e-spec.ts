import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import { PgBossService } from '../src/modules/queue/pg-boss.service';
import { ChannelType } from '@prisma/client';

describe('Notifier Dispatcher Engine (e2e)', () => {
  let app: INestApplication;
  const masterKey = 'notif_sec_master_key_12345';

  const templatesMap = new Map<string, any>();
  const subscribersMap = new Map<string, any>();

  const mockPrismaService = {
    apiKey: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    subscriber: {
      create: jest.fn().mockImplementation((args) => {
        const item = { id: `sub_${Date.now()}`, ...args.data, preferences: [] };
        subscribersMap.set(args.data.externalId, item);
        return item;
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        return subscribersMap.get(args.where.externalId) || null;
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Array.from(subscribersMap.values());
      }),
      count: jest.fn().mockImplementation(() => subscribersMap.size),
    },
    template: {
      create: jest.fn().mockImplementation((args) => {
        const item = { id: `tmpl_${Date.now()}`, ...args.data };
        templatesMap.set(args.data.slug, item);
        return item;
      }),
      findUnique: jest.fn().mockImplementation((args) => {
        return templatesMap.get(args.where.slug) || null;
      }),
      findMany: jest.fn().mockImplementation(() => {
        return Array.from(templatesMap.values());
      }),
    },
    userPreference: {
      upsert: jest.fn().mockImplementation((args) => ({
        id: 'pref_e2e_1',
        ...args.create,
      })),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    notificationLog: {
      create: jest.fn().mockImplementation((args) => ({
        id: 'log_e2e_1',
        ...args.data,
      })),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue({
        id: 'log_e2e_1',
        messageId: 'msg_resend_999',
        status: 'DELIVERED',
      }),
      update: jest.fn().mockResolvedValue({ id: 'log_e2e_1' }),
    },
    inAppNotification: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  const mockPgBossService = {
    isReady: jest.fn().mockReturnValue(true),
    send: jest.fn().mockResolvedValue('job_e2e_id'),
    work: jest.fn().mockResolvedValue('worker_e2e_id'),
  };

  beforeAll(async () => {
    process.env.MASTER_API_KEY = masterKey;
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(PgBossService)
      .useValue(mockPgBossService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Health Check Endpoint', () => {
    it('GET /health - should return healthy status without authentication', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('2. Authentication & Subscriber Management', () => {
    it('POST /api/v1/subscribers - should reject without API key (401)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/subscribers')
        .send({ externalId: 'usr_unauth' })
        .expect(401);
    });

    it('POST /api/v1/subscribers - should create subscriber with valid x-api-key header', () => {
      return request(app.getHttpServer())
        .post('/api/v1/subscribers')
        .set('x-api-key', masterKey)
        .send({ externalId: 'usr_e2e_100', email: 'e2e@example.com' })
        .expect(201)
        .expect((res) => {
          expect(res.body.externalId).toBe('usr_e2e_100');
        });
    });
  });

  describe('3. Template Management', () => {
    it('POST /api/v1/templates - should create a notification template', () => {
      return request(app.getHttpServer())
        .post('/api/v1/templates')
        .set('x-api-key', masterKey)
        .send({
          slug: 'welcome-e2e',
          title: 'Welcome E2E',
          bodyText: 'Hello {{name}}',
          defaultChannel: ChannelType.EMAIL,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.slug).toBe('welcome-e2e');
        });
    });
  });

  describe('4. User Preferences', () => {
    it('POST /api/v1/preferences - should save channel preference', () => {
      return request(app.getHttpServer())
        .post('/api/v1/preferences')
        .set('x-api-key', masterKey)
        .send({
          subscriberExternalId: 'usr_e2e_100',
          channel: ChannelType.EMAIL,
          category: 'MARKETING',
          isEnabled: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.isEnabled).toBe(false);
        });
    });
  });

  describe('5. Notification Dispatching', () => {
    it('POST /api/v1/notify - should enqueue notification (202 Accepted)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/notify')
        .set('x-api-key', masterKey)
        .send({
          subscriberExternalId: 'usr_e2e_100',
          templateSlug: 'welcome-e2e',
          variables: { name: 'Alice' },
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.status).toBe('QUEUED');
          expect(res.body.subscriberExternalId).toBe('usr_e2e_100');
        });
    });

    it('POST /api/v1/notify/broadcast - should broadcast to subscribers (202 Accepted)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/notify/broadcast')
        .set('x-api-key', masterKey)
        .send({
          subscriberExternalIds: ['usr_e2e_100'],
          templateSlug: 'welcome-e2e',
          variables: { notice: 'Broadcasting test' },
        })
        .expect(202)
        .expect((res) => {
          expect(res.body.status).toBe('BROADCAST_QUEUED');
          expect(res.body.totalQueued).toBe(1);
        });
    });
  });

  describe('6. Inbound Delivery Webhooks', () => {
    it('POST /api/v1/webhooks/resend - should process public webhook callback', () => {
      return request(app.getHttpServer())
        .post('/api/v1/webhooks/resend')
        .send({
          type: 'email.opened',
          data: { email_id: 'msg_resend_999' },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.updated).toBe(true);
        });
    });
  });

  describe('7. In-App Notifications Feed', () => {
    it('GET /api/v1/in-app/unread-count/:externalId - should return unread counter', () => {
      return request(app.getHttpServer())
        .get('/api/v1/in-app/unread-count/usr_e2e_100')
        .set('x-api-key', masterKey)
        .expect(200)
        .expect((res) => {
          expect(res.body.unreadCount).toBe(0);
        });
    });
  });
});
