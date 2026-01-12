import express, { type Request, type Response } from 'express';
import { executeWorkflow } from '../langgraph/workflow.js';
import { COLLECTIONS, addDocuments, getCollection } from '../config/chromadb.js';
import { tableauService } from '../services/tableau.js';
import type { AgentState } from '../langgraph/state.js';

const router = express.Router();

// Middleware to check authentication (for Google Drive features)
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// Optional authentication - allows chat to work without Google login
const optionalAuth = (req: Request, res: Response, next: Function) => {
  // Just ensure session exists
  if (!req.session) {
    req.session = {} as any;
  }
  next();
};

/**
 * Send a chat message and get AI response
 * Note: Google auth is optional - Tableau queries work with just Tableau auth
 */
router.post('/message', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const userId = req.session!.user?.id || 'anonymous';
    const actualSessionId = sessionId || `session-${Date.now()}`;

    console.log(`💬 Chat message from ${userId}: "${message}"`);

    // Set Tableau authentication if available in session
    if (req.session?.tableauAuth?.token) {
      console.log('🔐 Setting Tableau authentication for workflow');
      tableauService.setAuth(
        req.session.tableauAuth.token,
        req.session.tableauAuth.siteId
      );
    }

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

    // Store chat history in ChromaDB (optional)
    if (process.env.CHROMA_ENABLED === 'true') {
      try {
        const userMessageId = `msg-${actualSessionId}-${Date.now()}-user`;
        const assistantMessageId = `msg-${actualSessionId}-${Date.now()}-assistant`;

        await addDocuments(
          COLLECTIONS.CHAT_HISTORY,
          [userMessageId, assistantMessageId],
          [[0], [0]], // Dummy embeddings for chat history
          [
            {
              sessionId: actualSessionId,
              userId,
              role: 'user',
              content: message,
              timestamp: new Date().toISOString(),
            },
            {
              sessionId: actualSessionId,
              userId,
              role: 'assistant',
              content: result.summary || 'No response generated',
              intent: result.intent,
              datasetsUsed: result.relevantDatasets?.map(d => d.id) || [],
              insights: result.insights || [],
              timestamp: new Date().toISOString(),
            },
          ],
          [message, result.summary || 'No response generated']
        );
      } catch (error) {
        console.log('ℹ️  Skipping chat history storage (ChromaDB optional)');
      }
    }

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
      tableauViews: result.tableauViews || [],
      sessionId: actualSessionId,
    };

    console.log('📤 Sending response to frontend:');
    console.log('   - Message length:', response.message.length);
    console.log('   - Tableau views count:', response.tableauViews.length);
    if (response.tableauViews.length > 0) {
      console.log('   - Tableau views:', response.tableauViews.map((v: any) => v.name).join(', '));
    }

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

    const collection = getCollection(COLLECTIONS.CHAT_HISTORY);
    const result = await collection.get({
      where: {
        $and: [
          { sessionId: sessionId },
          { userId: userId },
        ],
      },
    });

    const messages = (result.ids || []).map((id: string, index: number) => ({
      role: result.metadatas?.[index]?.role,
      content: result.metadatas?.[index]?.content,
      timestamp: result.metadatas?.[index]?.timestamp,
      metadata: {
        intent: result.metadatas?.[index]?.intent,
        datasetsUsed: result.metadatas?.[index]?.datasetsUsed,
        insights: result.metadatas?.[index]?.insights,
      },
    })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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

    const collection = getCollection(COLLECTIONS.CHAT_HISTORY);
    const result = await collection.get({
      where: { userId },
    });

    // Group messages by sessionId
    const sessionMap = new Map<string, any>();

    (result.ids || []).forEach((id: string, index: number) => {
      const metadata = result.metadatas?.[index];
      if (metadata) {
        const sessionId = metadata.sessionId;
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            sessionId,
            messageCount: 0,
            lastMessage: null,
            lastTimestamp: '',
          });
        }
        const session = sessionMap.get(sessionId);
        session.messageCount++;
        if (!session.lastTimestamp || metadata.timestamp > session.lastTimestamp) {
          session.lastTimestamp = metadata.timestamp;
          session.lastMessage = metadata;
        }
      }
    });

    const sessions = Array.from(sessionMap.values()).sort((a, b) =>
      new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );

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
