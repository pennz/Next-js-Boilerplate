import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Logger } from 'drizzle-orm/logger';
import * as schema from '@/models/Schema';
import { Env } from './Env';

// Custom logger for better debugging
class HealthRecordDebugLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    console.log('\n🔍 [DRIZZLE DEBUG] ===================');
    console.log('⏰ Timestamp:', new Date().toISOString());
    console.log('📝 SQL Query:', query);
    console.log('🎯 Parameters:', JSON.stringify(params, null, 2));
    console.log('=====================================\n');
  }
}

// Stores the db connection in the global scope to prevent multiple instances due to hot reloading with Next.js
const globalForDb = globalThis as unknown as {
  drizzle: NodePgDatabase<typeof schema>;
};

// Need a database for production? Check out https://www.prisma.io/?via=nextjsboilerplate
// Tested and compatible with Next.js Boilerplate
const createDbConnection = () => {
  console.log('🚀 Creating Drizzle database connection...');
  console.log('🔗 Database URL exists:', !!Env.DATABASE_URL);
  console.log('🌍 Environment:', Env.NODE_ENV);
  
  // Determine if we should use SSL
  const useSSL = !Env.DATABASE_URL.includes('localhost') && !Env.DATABASE_URL.includes('127.0.0.1');
  console.log('🔒 SSL enabled:', useSSL);

  return drizzle({
    connection: {
      connectionString: Env.DATABASE_URL,
      ssl: useSSL,
    },
    schema,
    // Enable logging - use simple logger in production, detailed in development
    logger: Env.NODE_ENV === 'development' 
      ? new HealthRecordDebugLogger() 
      : true, // Simple logging in production
  });
};

const db = globalForDb.drizzle || createDbConnection();

// Only store in global during development to prevent hot reload issues
if (Env.NODE_ENV !== 'production') {
  globalForDb.drizzle = db;
}

// Add error handling for migrations
try {
  console.log('🔄 Running database migrations...');
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'migrations'),
  });
  console.log('✅ Database migrations completed successfully');
} catch (migrationError) {
  console.error('❌ Migration failed:', migrationError);
  console.error('Migration error details:', {
    name: migrationError.name,
    message: migrationError.message,
    stack: migrationError.stack,
  });
  // Don't throw here to prevent app from crashing, but log the error
}

// Test database connection
try {
  console.log('🧪 Testing database connection...');
  await db.execute('SELECT 1 as test');
  console.log('✅ Database connection test successful');
} catch (connectionError) {
  console.error('❌ Database connection test failed:', connectionError);
  console.error('Connection error details:', {
    name: connectionError.name,
    message: connectionError.message,
    code: connectionError.code,
  });
}

export { db };
