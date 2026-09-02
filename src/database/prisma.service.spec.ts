import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/testdb';
    service = new PrismaService();
  });

  afterEach(async () => {
    // cleanup
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should implement onModuleInit and onModuleDestroy', () => {
    expect(typeof service.onModuleInit).toBe('function');
    expect(typeof service.onModuleDestroy).toBe('function');
  });
});
