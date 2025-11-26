/**
 * Games routes
 */
import { Router, Request, Response } from 'express';
import { query } from '../db/database';
import type { CloudGame } from '../types';

const router = Router();

/**
 * GET /api/games/:userId
 * Get all games for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await query<CloudGame>(
      `SELECT * FROM cloud_games 
       WHERE user_id = $1 
       ORDER BY updated_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to retrieve games' });
  }
});

/**
 * POST /api/games
 * Create or update a game
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      gameId,
      userId,
      gameName,
      createdAt,
      updatedAt,
      currentRound,
      status,
      playerCount,
      players
    } = req.body;

    if (!gameId || !userId || !players) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if game exists
    const existing = await query(
      'SELECT game_id FROM cloud_games WHERE game_id = $1',
      [gameId]
    );

    if (existing.rows.length > 0) {
      // Update existing game
      const result = await query<CloudGame>(
        `UPDATE cloud_games 
         SET updated_at = $1, current_round = $2, status = $3, players = $4
         WHERE game_id = $5
         RETURNING *`,
        [updatedAt || new Date(), currentRound, status, JSON.stringify(players), gameId]
      );
      return res.json(result.rows[0]);
    }

    // Create new game
    const result = await query<CloudGame>(
      `INSERT INTO cloud_games 
       (game_id, user_id, game_name, created_at, updated_at, current_round, status, player_count, players)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        gameId,
        userId,
        gameName,
        createdAt || new Date(),
        updatedAt || new Date(),
        currentRound || 1,
        status || 'active',
        playerCount,
        JSON.stringify(players)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create/update game error:', error);
    res.status(500).json({ error: 'Failed to save game' });
  }
});

/**
 * DELETE /api/games/:gameId
 * Delete a game
 */
router.delete('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    await query('DELETE FROM cloud_games WHERE game_id = $1', [gameId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

export default router;
