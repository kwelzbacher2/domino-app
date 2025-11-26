/**
 * Storage service using localforage for IndexedDB persistence
 */
import localforage from 'localforage';

/**
 * Database version for schema management
 */
const DB_VERSION = 1;
const DB_NAME = 'domino-score-counter';

/**
 * Object store names
 */
export const STORES = {
  GAMES: 'games',
  ROUNDS: 'rounds',
} as const;

/**
 * Initialize localforage instances for each object store
 */
export const gamesStore = localforage.createInstance({
  name: DB_NAME,
  version: DB_VERSION,
  storeName: STORES.GAMES,
  description: 'Storage for game records',
});

export const roundsStore = localforage.createInstance({
  name: DB_NAME,
  version: DB_VERSION,
  storeName: STORES.ROUNDS,
  description: 'Storage for round records',
});

/**
 * Initialize the database and configure stores
 */
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection to both stores
    await gamesStore.ready();
    await roundsStore.ready();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw new Error('Database initialization failed');
  }
}

/**
 * Clear all data from the database (useful for testing)
 */
export async function clearDatabase(): Promise<void> {
  await gamesStore.clear();
  await roundsStore.clear();
}

/**
 * Get database driver information
 */
export function getDatabaseInfo() {
  return {
    gamesDriver: gamesStore.driver(),
    roundsDriver: roundsStore.driver(),
    version: DB_VERSION,
  };
}
