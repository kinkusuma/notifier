import { ChannelType, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || '';
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding Notifier database...');

  // 1. Seed Master API Key
  const masterKey = await prisma.apiKey.upsert({
    where: { key: 'notif_sec_master_key_12345' },
    update: { isActive: true },
    create: {
      key: 'notif_sec_master_key_12345',
      name: 'Default Master API Key',
      isActive: true,
    },
  });
  console.log(`✅ Seeded API Key: ${masterKey.key}`);

  // 2. Seed Default Subscriber
  const subscriber = await prisma.subscriber.upsert({
    where: { externalId: 'usr_demo_100' },
    update: {
      email: 'demo@example.com',
      phoneNumber: '+628123456789',
      telegramChatId: '123456789',
      webhookUrl: 'https://webhook.site/demo',
    },
    create: {
      externalId: 'usr_demo_100',
      email: 'demo@example.com',
      phoneNumber: '+628123456789',
      telegramChatId: '123456789',
      webhookUrl: 'https://webhook.site/demo',
      metadata: { role: 'developer', tier: 'premium' },
    },
  });
  console.log(`✅ Seeded Subscriber: ${subscriber.externalId}`);

  // 3. Seed Welcome Template
  const welcomeTemplate = await prisma.template.upsert({
    where: { slug: 'welcome-user' },
    update: {},
    create: {
      slug: 'welcome-user',
      title: 'Welcome Notification',
      subject: 'Welcome to {{appName}}, {{name}}!',
      bodyText: 'Hi {{name}}, welcome to {{appName}}! Your account has been activated.',
      bodyHtml: '<h1>Welcome to {{appName}}</h1><p>Hi <b>{{name}}</b>, your account is active!</p>',
      defaultChannel: ChannelType.EMAIL,
      fallbackChannel: ChannelType.TELEGRAM,
    },
  });
  console.log(`✅ Seeded Template: ${welcomeTemplate.slug}`);

  // 4. Seed OTP Template
  const otpTemplate = await prisma.template.upsert({
    where: { slug: 'otp-verification' },
    update: {},
    create: {
      slug: 'otp-verification',
      title: 'OTP Verification Code',
      subject: 'Your OTP Code: {{code}}',
      bodyText: 'Your verification code for {{appName}} is *{{code}}*. Valid for 5 minutes.',
      defaultChannel: ChannelType.WHATSAPP,
      fallbackChannel: ChannelType.EMAIL,
    },
  });
  console.log(`✅ Seeded Template: ${otpTemplate.slug}`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
