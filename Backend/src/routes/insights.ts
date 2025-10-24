import express from 'express';
import { esClient, INDICES } from '../config/elasticsearch.js';

const router = express.Router();

/**
 * GET /api/insights - Get all pinned insights
 */
router.get('/', async (req, res) => {
  try {
    const response = await (esClient.search as any)({
      index: INDICES.INSIGHTS,
      body: {
        query: {
          term: { pinned: true },
        },
        sort: [{ createdAt: { order: 'desc' } }],
        size: 100,
      },
    });

    const insights = response.hits.hits.map((hit: any) => ({
      ...hit._source,
      id: hit._id,
    }));

    res.json({
      success: true,
      insights,
      count: insights.length,
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
    });
  }
});

/**
 * DELETE /api/insights/:id - Delete an insight
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await esClient.delete({
      index: INDICES.INSIGHTS,
      id,
      refresh: 'true',
    });

    res.json({
      success: true,
      message: 'Insight deleted successfully',
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      res.status(404).json({
        success: false,
        error: 'Insight not found',
      });
    } else {
      console.error('Error deleting insight:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete insight',
      });
    }
  }
});

export default router;
