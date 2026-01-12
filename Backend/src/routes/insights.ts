import express from 'express';
import { COLLECTIONS, getCollection, deleteDocument } from '../config/chromadb.js';

const router = express.Router();

/**
 * GET /api/insights - Get all pinned insights
 */
router.get('/', async (req, res) => {
  try {
    const collection = getCollection(COLLECTIONS.INSIGHTS);
    if (!collection) {
      return res.json({
        success: true,
        insights: [],
        count: 0,
      });
    }
    const response = await collection.get({
      where: { pinned: true },
    });

    const insights = (response.ids || []).map((id: string, index: number) => ({
      id,
      ...(response.metadatas?.[index] || {}),
    })).sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

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

    await deleteDocument(COLLECTIONS.INSIGHTS, id);

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
