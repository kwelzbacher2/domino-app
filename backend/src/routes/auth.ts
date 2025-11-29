/**
 * Authentication routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';
import type { User } from '../types';

const router = Router();

/**
 * GET /api/auth/users
 * Get all users (for admin/debugging)
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const result = await query<User>(
      'SELECT user_id as id, username, created_at, last_sync_at FROM users ORDER BY created_at DESC'
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

/**
 * GET /api/auth/user/:username
 * Get user by username
 */
router.get('/user/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const result = await query<User>(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Map database fields to frontend format
    const user = result.rows[0];
    res.json({
      id: user.user_id,
      username: user.username,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * DELETE /api/auth/user/:userId
 * Delete a user and all their associated data
 */
router.delete('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Delete user's rounds first (foreign key constraint)
    await query('DELETE FROM cloud_rounds WHERE game_id IN (SELECT game_id FROM cloud_games WHERE user_id = $1)', [userId]);
    
    // Delete user's games
    await query('DELETE FROM cloud_games WHERE user_id = $1', [userId]);
    
    // Delete user
    const result = await query('DELETE FROM users WHERE user_id = $1 RETURNING *', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User and all associated data deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

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
      
      // Map database fields to frontend format
      const user = existingUser.rows[0];
      return res.json({
        id: user.user_id,
        username: user.username,
        createdAt: user.created_at
      });
    }

    // Create new user
    const newUser = await query<User>(
      `INSERT INTO users (user_id, username, created_at, last_sync_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [userId, username]
    );

    // Map database fields to frontend format
    const user = newUser.rows[0];
    res.status(201).json({
      id: user.user_id,
      username: user.username,
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: 'Failed to sign in' });
  }
});

export default router;
