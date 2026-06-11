import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  // Prevent multiple instances of Prisma Client in development
  const globalWithPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
    pool?: pg.Pool;
  };
  
  if (!globalWithPrisma.pool) {
    globalWithPrisma.pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }
  
  if (!globalWithPrisma.prisma) {
    const adapter = new PrismaPg(globalWithPrisma.pool);
    globalWithPrisma.prisma = new PrismaClient({ adapter });
  }
  
  prisma = globalWithPrisma.prisma;
}

export default prisma;
