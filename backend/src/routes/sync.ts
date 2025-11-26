/**
 * Sync status routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';

const router = Router();

/**
 * GET /api/sync/:userId
 * Get sync status for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userResult = await query(
      'SELECT last_sync_at FROM users WHERE user_id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const gamesResult = await query(
      'SELECT COUNT(*) as game_count FROM cloud_games WHERE user_id = $1',
      [userId]
    );

    res.json({
      lastSyncAt: userResult.rows[0].last_sync_at,
      gameCount: parseInt(gamesResult.rows[0].game_count, 10),
      status: 'synced'
    });
  } catch (error) {
    console.error('Get sync status error:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

export default router;
