import express, { type Request, type Response } from 'express';
import { COLLECTIONS, getCollection, getDocument } from '../config/chromadb.js';
import { datasetExplorerAgent } from '../agents/datasetExplorer.js';
import { insightsGeneratorAgent } from '../agents/insightsGenerator.js';
import { visualizerAgent } from '../agents/visualizer.js';
import type { AgentState } from '../langgraph/state.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * Get list of available datasets
 */
router.get('/datasets', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user?.id || 'anonymous';

    // Query ChromaDB for user's datasets
    const collection = getCollection(COLLECTIONS.DATASETS);
    const result = await collection.get({
      where: { userId },
    });

    const datasets = (result.ids || []).map((id: string, index: number) => {
      const metadata = result.metadatas?.[index] || {};
      return {
        id,
        name: metadata.name,
        type: metadata.type || 'unknown',
        source: metadata.source || 'local',
        rows: metadata.rowCount,
        columns: metadata.columnCount || 0,
        size: metadata.size || 'Unknown',
        lastModified: metadata.createdAt,
      };
    }).sort((a: any, b: any) =>
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    );

    res.json({ datasets });
  } catch (error: any) {
    console.error('❌ Error fetching datasets:', error);
    res.status(500).json({
      error: 'Failed to fetch datasets',
      details: error.message,
    });
  }
});

/**
 * Get detailed dataset overview and statistics
 */
router.get('/datasets/:datasetId/overview', requireAuth, async (req: Request, res: Response) => {
  try {
    const { datasetId } = req.params;
    const userId = req.session!.user?.id || 'anonymous';

    console.log(`🔍 Getting overview for dataset: ${datasetId}`);

    // Get dataset from ChromaDB
    const dataset = await getDocument(COLLECTIONS.DATASETS, datasetId!);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Check authorization
    if (dataset.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Use stored sample data or aggregated data
    const sampleData = dataset.sampleRows || dataset.aggregatedData || [];

    console.log(`   Found ${sampleData.length} sample rows`);

    // Run dataset explorer agent
    const overview = await datasetExplorerAgent(
      {
        id: datasetId,
        name: dataset.name,
        type: dataset.type,
        rowCount: dataset.rowCount,
        columns: dataset.columns || [],
      },
      sampleData
    );

    res.json({
      dataset: {
        id: datasetId,
        name: dataset.name,
        type: dataset.type,
        source: dataset.source,
        lastModified: dataset.createdAt,
      },
      overview,
      preview: sampleData.slice(0, 10), // Send first 10 rows for preview
    });
  } catch (error: any) {
    console.error('❌ Error getting dataset overview:', error);
    res.status(500).json({
      error: 'Failed to get dataset overview',
      details: error.message,
    });
  }
});

/**
 * Generate insights for a dataset
 */
router.post('/datasets/:datasetId/insights', requireAuth, async (req: Request, res: Response) => {
  try {
    const { datasetId } = req.params;
    const userId = req.session!.user?.id || 'anonymous';

    console.log(`💡 Generating insights for dataset: ${datasetId}`);

    // Get dataset from ChromaDB
    const dataset = await getDocument(COLLECTIONS.DATASETS, datasetId!);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Check authorization
    if (dataset.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Use stored sample data
    const sampleData = dataset.sampleRows || dataset.aggregatedData || [];

    console.log(`   Analyzing ${sampleData.length} rows`);

    // Generate insights
    const insights = await insightsGeneratorAgent(
      {
        id: datasetId,
        name: dataset.name,
        type: dataset.type,
        rowCount: dataset.rowCount,
        columns: dataset.columns || [],
      },
      sampleData,
      dataset.statistics
    );

    res.json({ insights });
  } catch (error: any) {
    console.error('❌ Error generating insights:', error);
    res.status(500).json({
      error: 'Failed to generate insights',
      details: error.message,
    });
  }
});

/**
 * Generate visualizations for a dataset
 */
router.post('/datasets/:datasetId/visualizations', requireAuth, async (req: Request, res: Response) => {
  try {
    const { datasetId } = req.params;
    const { query } = req.body; // Optional: specific query for visualization
    const userId = req.session!.user?.id || 'anonymous';

    console.log(`📊 Generating visualizations for dataset: ${datasetId}`);

    // Get dataset from ChromaDB
    const dataset = await getDocument(COLLECTIONS.DATASETS, datasetId!);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Check authorization
    if (dataset.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Use stored sample data
    const sampleData = dataset.sampleRows || dataset.aggregatedData || [];

    // Prepare state for visualizer agent
    const state: Partial<AgentState> = {
      userQuery: query || `Generate visualizations for ${dataset.name}`,
      intent: 'visualization',
      relevantDatasets: [
        {
          id: datasetId || '',
          name: dataset.name || 'Unknown',
          type: dataset.type as any,
          rowCount: dataset.rowCount,
          columns: dataset.columns || [],
          sampleRows: sampleData.slice(0, 20),
          aggregatedData: sampleData,
          statistics: dataset.statistics,
        } as any,
      ],
      messages: [],
      nextAgent: null,
      metadata: {},
    };

    // Generate visualizations
    const result = await visualizerAgent(state as AgentState);

    res.json({
      visualizations: result.visualization ? [result.visualization] : [],
    });
  } catch (error: any) {
    console.error('❌ Error generating visualizations:', error);
    res.status(500).json({
      error: 'Failed to generate visualizations',
      details: error.message,
    });
  }
});

/**
 * Get column details and distribution
 */
router.get('/datasets/:datasetId/columns/:columnName', requireAuth, async (req: Request, res: Response) => {
  try {
    const { datasetId, columnName } = req.params;
    const userId = req.session!.user?.id || 'anonymous';
    const colName = columnName ? decodeURIComponent(columnName) : '';

    // Get dataset from ChromaDB
    const dataset = await getDocument(COLLECTIONS.DATASETS, datasetId!);

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    if (dataset.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Use stored sample data
    const sampleData = dataset.sampleRows || dataset.aggregatedData || [];
    const columnValues = sampleData
      .map((row: any) => row[colName])
      .filter((v: any) => v !== null && v !== undefined);

    // Calculate distribution
    const distribution: { [key: string]: number } = {};
    columnValues.forEach((value: any) => {
      const key = String(value);
      distribution[key] = (distribution[key] || 0) + 1;
    });

    // Sort by frequency and get top 20
    const topValues = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([value, count]) => ({
        value,
        count,
        percentage: ((count / columnValues.length) * 100).toFixed(2),
      }));

    res.json({
      columnName: colName,
      totalValues: columnValues.length,
      uniqueValues: Object.keys(distribution).length,
      topValues,
    });
  } catch (error: any) {
    console.error('❌ Error getting column details:', error);
    res.status(500).json({
      error: 'Failed to get column details',
      details: error.message,
    });
  }
});

export default router;
