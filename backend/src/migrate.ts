/**
 * Database migration script
 */
import dotenv from 'dotenv';
import { initDatabase, runMigrations, closeDatabase } from './db/database';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

async function migrate() {
  try {
    console.log('Initializing database connection...');
    initDatabase(DATABASE_URL!);

    console.log('Running migrations...');
    await runMigrations();

    console.log('Migrations completed successfully!');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closeDatabase();
    process.exit(1);
  }
}

migrate();
