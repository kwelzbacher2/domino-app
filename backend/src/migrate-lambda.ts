/**
 * Lambda function to run database migrations
 * Invoke once to set up the database schema
 */

import { initDatabase, runMigrations } from './db/database';

export const handler = async () => {
  console.log('Starting database migration...');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'DATABASE_URL not set' }),
    };
  }
  
  try {
    console.log('Initializing database connection...');
    initDatabase(DATABASE_URL);
    
    console.log('Running migrations...');
    await runMigrations();
    
    console.log('Migration completed successfully');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Migration completed successfully' }),
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
