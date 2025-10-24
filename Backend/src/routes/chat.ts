import express, { type Request, type Response } from 'express';
import { executeWorkflow } from '../langgraph/workflow.js';
import { esClient, INDICES } from '../config/elasticsearch.js';
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
 * Send a chat message and get AI response
 */
router.post('/message', requireAuth, async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.session!.user?.id || 'anonymous';
    const actualSessionId = sessionId || `session-${Date.now()}`;

    console.log(`💬 Chat message from ${userId}: "${message}"`);

    // Get Socket.IO instance from app
    const io = req.app.get('io');
    const socketId = req.body.socketId; // Client should send their socket ID

    // Execute LangGraph workflow with progress updates
    const result = await executeWorkflow(
      message,
      (state: AgentState) => {
        // Send progress updates via WebSocket
        if (io && socketId) {
          io.to(socketId).emit('agent:progress', {
            agent: state.nextAgent,
            hasDatasets: state.relevantDatasets?.length > 0 || false,
            hasResults: !!state.analysisResults,
            hasVisualization: !!state.visualization,
          });
        }
      }
    );

    // Store chat history in Elasticsearch
    await esClient.index({
      index: INDICES.CHAT_HISTORY,
      document: {
        sessionId: actualSessionId,
        userId,
        role: 'user',
        content: message,
        timestamp: new Date(),
      },
    });

    await esClient.index({
      index: INDICES.CHAT_HISTORY,
      document: {
        sessionId: actualSessionId,
        userId,
        role: 'assistant',
        content: result.summary || 'No response generated',
        metadata: {
          intent: result.intent,
          datasetsUsed: result.relevantDatasets?.map(d => d.id) || [],
          insights: result.insights || [],
        },
        timestamp: new Date(),
      },
    });

    // Send final response
    const response = {
      message: result.summary || 'Analysis complete',
      intent: result.intent,
      datasets: result.relevantDatasets?.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
      })) || [],
      insights: result.insights || [],
      visualization: result.visualization,
      sessionId: actualSessionId,
    };

    // Emit completion event
    if (io && socketId) {
      io.to(socketId).emit('chat:complete', response);
    }

    res.json(response);
  } catch (error: any) {
    console.error('❌ Chat error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message,
    });
  }
});

/**
 * Get chat history for a session
 */
router.get('/history/:sessionId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.session!.user?.id || 'anonymous';

    const result = await (esClient.search as any)({
      index: INDICES.CHAT_HISTORY,
      body: {
        query: {
          bool: {
            must: [
              { term: { sessionId } },
              { term: { userId } },
            ],
          },
        },
        sort: [{ timestamp: 'asc' }],
        size: 100,
      },
    });

    const messages = result.hits.hits.map((hit: any) => ({
      role: hit._source.role,
      content: hit._source.content,
      timestamp: hit._source.timestamp,
      metadata: hit._source.metadata,
    }));

    res.json({ messages });
  } catch (error: any) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      details: error.message,
    });
  }
});

/**
 * Get user's sessions
 */
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user?.id || 'anonymous';

    const result = await (esClient.search as any)({
      index: INDICES.CHAT_HISTORY,
      body: {
        query: {
          term: { userId },
        },
        aggs: {
          sessions: {
            terms: {
              field: 'sessionId',
              size: 50,
            },
            aggs: {
              latest_message: {
                top_hits: {
                  size: 1,
                  sort: [{ timestamp: 'desc' }],
                },
              },
            },
          },
        },
        size: 0,
      },
    });

    const sessions = result.aggregations?.sessions?.buckets?.map((bucket: any) => ({
      sessionId: bucket.key,
      messageCount: bucket.doc_count,
      lastMessage: bucket.latest_message.hits.hits[0]?._source,
    })) || [];

    res.json({ sessions });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      error: 'Failed to fetch sessions',
      details: error.message,
    });
  }
});

export default router;
