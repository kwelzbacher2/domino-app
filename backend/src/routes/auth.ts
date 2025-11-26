/**
 * Authentication routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';
import type { User } from '../types';

const router = Router();

/**
 * POST /api/auth/signin
 * Sign in with username - creates new user or retrieves existing
 */
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { username, userId } = req.body;

    if (!username || !userId) {
      return res.status(400).json({ error: 'Username and userId are required' });
    }

    // Check if user exists
    const existingUser = await query<User>(
      'SELECT * FROM users WHERE user_id = $1',
      [userId]
    );

    if (existingUser.rows.length > 0) {
      // Update last sync time
      await query(
        'UPDATE users SET last_sync_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      );
      return res.json(existingUser.rows[0]);
    }

    // Create new user
    const newUser = await query<User>(
      `INSERT INTO users (user_id, username, created_at, last_sync_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, username]
    );

    res.status(201).json(newUser.rows[0]);
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

export default router;
