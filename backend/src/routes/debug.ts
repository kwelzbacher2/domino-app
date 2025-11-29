/**
 * Debug routes for troubleshooting
 * Only use in development!
 */
import { Router } from 'express';
import { query } from '../db/database';

const router = Router();

/**
 * GET /api/debug/users
 * List all users
 */
router.get('/users', async (req, res) => {
  try {
    const result = await query('SELECT id, username, created_at FROM users ORDER BY created_at DESC');
    res.json({
      count: result.rows.length,
      users: result.rows,
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/debug/user/:username
 * Get user by username
 */
router.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await query(
      'SELECT id, username, created_at FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Debug user error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/debug/tables
 * List all tables in the database
 */
router.get('/tables', async (req, res) => {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    res.json({
      tables: result.rows.map(row => row.table_name),
    });
  } catch (error) {
    console.error('Debug tables error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch tables',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/debug/health
 * Check database connection
 */
router.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as time');
    res.json({
      status: 'ok',
      database: 'connected',
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error('Debug health error:', error);
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/debug/reset
 * Clear all data from database (DANGEROUS - use with caution!)
 */
router.get('/reset', async (req, res) => {
  try {
    // Delete all data from tables
    await query('TRUNCATE TABLE error_reports CASCADE');
    await query('TRUNCATE TABLE cloud_games CASCADE');
    await query('TRUNCATE TABLE users CASCADE');
    
    res.json({
      message: 'Database cleared successfully',
      warning: 'All user data has been deleted',
    });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ 
      error: 'Failed to reset database',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
