import express, { type Request, type Response } from 'express';
import { tableauService } from '../services/tableau.js';
import { buildTableauOAuthUrl, tableauConfig } from '../config/tableau.js';
import { COLLECTIONS, upsertDocuments } from '../config/chromadb.js';
import { embeddings } from '../config/llm.js';
import { generateEmbeddingJWT } from '../services/tableauJWT.js';
import type { TableauWorkbookIndex } from '../types/tableau.js';

const router = express.Router();

/**
 * Middleware to check Tableau authentication
 */
const requireTableauAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session?.tableauAuth?.token) {
    return res.status(401).json({ error: 'Not authenticated with Tableau' });
  }

  // Set auth in service
  tableauService.setAuth(
    req.session.tableauAuth.token,
    req.session.tableauAuth.siteId
  );

  next();
};

/**
 * Initiate Tableau OAuth flow
 */
router.get('/auth', (req: Request, res: Response) => {
  try {
    const oauthUrl = buildTableauOAuthUrl();
    res.json({ authUrl: oauthUrl });
  } catch (error: any) {
    console.error('❌ Failed to initiate OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate OAuth', details: error.message });
  }
});

/**
 * OAuth callback - Exchange code for token
 */
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code missing' });
    }

    console.log('🔐 Processing Tableau OAuth callback...');

    // Exchange code for token
    const authCredentials = await tableauService.exchangeOAuthCode(code as string);

    // Store in session
    const authData: any = {
      token: authCredentials.token,
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    };
    if (authCredentials.expiresAt) {
      authData.expiresAt = authCredentials.expiresAt.toISOString();
    }
    req.session!.tableauAuth = authData;

    console.log('✅ Tableau authentication successful');

    // Start background workbook indexing
    indexWorkbooksInBackground(authCredentials.token, authCredentials.siteId);

    // Redirect to frontend success page
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/tableau/success`);
  } catch (error: any) {
    console.error('❌ OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/tableau/error?message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Authenticate with Personal Access Token (for testing)
 */
router.post('/auth/pat', async (req: Request, res: Response) => {
  try {
    console.log('🔐 Authenticating with PAT...');

    const authCredentials = await tableauService.authenticateWithPAT();

    // Store in session
    req.session!.tableauAuth = {
      token: authCredentials.token,
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    };

    // Start background workbook indexing
    indexWorkbooksInBackground(authCredentials.token, authCredentials.siteId);

    res.json({
      success: true,
      message: 'Authenticated with Tableau',
      siteId: authCredentials.siteId,
    });
  } catch (error: any) {
    console.error('❌ PAT authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

/**
 * Authenticate with Direct Trust JWT
 */
router.post('/auth/jwt', async (req: Request, res: Response) => {
  try {
    console.log('🔐 Authenticating with Direct Trust JWT...');

    const { username, secretId, secretValue, clientId } = req.body;

    if (!username || !secretId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['username', 'secretId'],
        note: 'secretValue and clientId are optional if configured in .env'
      });
    }

    const { authenticateWithJWT } = await import('../services/tableauJWT.js');
    const authCredentials = await authenticateWithJWT(username, secretId, secretValue, clientId);

    // Store in session
    req.session!.tableauAuth = {
      token: authCredentials.token,
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    };

    // Start background workbook indexing
    indexWorkbooksInBackground(authCredentials.token, authCredentials.siteId);

    res.json({
      success: true,
      message: 'Authenticated with Tableau using Direct Trust JWT',
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    });
  } catch (error: any) {
    console.error('❌ JWT authentication error:', error);
    res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
});

/**
 * Authenticate using server-side credentials (for demo/hackathon)
 */
router.post('/auth/connect', async (req: Request, res: Response) => {
  try {
    console.log('🔐 Authenticating with server-side Tableau credentials...');

    // Use credentials from environment variables
    const username = process.env.TABLEAU_USERNAME;
    const secretId = process.env.TABLEAU_SECRET_ID;
    const secretValue = process.env.TABLEAU_CLIENT_SECRET;
    const clientId = process.env.TABLEAU_CLIENT_ID;

    if (!username || !secretId) {
      return res.status(500).json({
        error: 'Tableau credentials not configured on server',
        hint: 'Set TABLEAU_USERNAME and TABLEAU_SECRET_ID in .env'
      });
    }

    const { authenticateWithJWT } = await import('../services/tableauJWT.js');
    const authCredentials = await authenticateWithJWT(username, secretId, secretValue, clientId);

    // Store in session
    req.session!.tableauAuth = {
      token: authCredentials.token,
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    };

    // Start background workbook indexing
    indexWorkbooksInBackground(authCredentials.token, authCredentials.siteId);

    res.json({
      success: true,
      message: 'Connected to Tableau Cloud successfully',
      siteId: authCredentials.siteId,
      userId: authCredentials.userId,
    });
  } catch (error: any) {
    console.error('❌ Tableau connection error:', error);
    res.status(500).json({ error: 'Failed to connect to Tableau', details: error.message });
  }
});

/**
 * Get embedding JWT token for authenticated visualization
 */
router.get('/auth/embedding-token', (req: Request, res: Response) => {
  try {
    // Generate token for the authenticated user
    const username = process.env.TABLEAU_USERNAME;
    const token = generateEmbeddingJWT(username);

    res.json({
      token,
      expiresIn: 600, // 10 minutes
    });
  } catch (error: any) {
    console.error('❌ Failed to generate embedding token:', error);
    res.status(500).json({ error: 'Failed to generate token', details: error.message });
  }
});

/**
 * Get Tableau authentication status
 */
router.get('/auth/status', (req: Request, res: Response) => {
  const tableauAuth = req.session?.tableauAuth;

  if (!tableauAuth?.token) {
    return res.json({
      authenticated: false,
      serverUrl: tableauConfig.serverUrl,
      siteName: tableauConfig.siteName,
    });
  }

  // Check if token is expired (if OAuth)
  let isExpired = false;
  if (tableauAuth.expiresAt) {
    isExpired = new Date(tableauAuth.expiresAt) < new Date();
  }

  res.json({
    authenticated: !isExpired,
    siteId: tableauAuth.siteId,
    userId: tableauAuth.userId,
    serverUrl: tableauConfig.serverUrl,
    siteName: tableauConfig.siteName,
    expiresAt: tableauAuth.expiresAt,
  });
});

/**
 * Sign out from Tableau
 */
router.post('/auth/signout', async (req: Request, res: Response) => {
  try {
    if (req.session?.tableauAuth) {
      tableauService.setAuth(
        req.session.tableauAuth.token,
        req.session.tableauAuth.siteId
      );
      await tableauService.signOut();
      delete req.session.tableauAuth;
    }

    res.json({ success: true, message: 'Signed out from Tableau' });
  } catch (error: any) {
    console.error('❌ Sign out error:', error);
    res.status(500).json({ error: 'Sign out failed', details: error.message });
  }
});

/**
 * List all workbooks
 */
router.get('/workbooks', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const workbooks = await tableauService.listWorkbooks();

    res.json({
      success: true,
      count: workbooks.length,
      workbooks: workbooks.map(wb => ({
        id: wb.id,
        name: wb.name,
        description: wb.description,
        projectName: wb.project.name,
        createdAt: wb.createdAt,
        updatedAt: wb.updatedAt,
        webpageUrl: wb.webpageUrl,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error fetching workbooks:', error);
    res.status(500).json({ error: 'Failed to fetch workbooks', details: error.message });
  }
});

/**
 * Get a specific workbook
 */
router.get('/workbooks/:workbookId', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const { workbookId } = req.params;
    const workbook = await tableauService.getWorkbook(workbookId!);

    res.json({
      success: true,
      workbook,
    });
  } catch (error: any) {
    console.error('❌ Error fetching workbook:', error);
    res.status(500).json({ error: 'Failed to fetch workbook', details: error.message });
  }
});

/**
 * Get views in a workbook
 */
router.get('/workbooks/:workbookId/views', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const { workbookId } = req.params;
    const views = await tableauService.getWorkbookViews(workbookId!);

    res.json({
      success: true,
      count: views.length,
      views,
    });
  } catch (error: any) {
    console.error('❌ Error fetching views:', error);
    res.status(500).json({ error: 'Failed to fetch views', details: error.message });
  }
});

/**
 * List all views
 */
router.get('/views', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const views = await tableauService.listViews();

    res.json({
      success: true,
      count: views.length,
      views: views.map(view => ({
        id: view.id,
        name: view.name,
        contentUrl: view.contentUrl,
        createdAt: view.createdAt,
        workbookId: view.workbook?.id,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error fetching views:', error);
    res.status(500).json({ error: 'Failed to fetch views', details: error.message });
  }
});

/**
 * Get view data
 */
router.get('/views/:viewId/data', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params;
    const viewData = await tableauService.getViewData(viewId!);

    res.json({
      success: true,
      data: viewData,
    });
  } catch (error: any) {
    console.error('❌ Error fetching view data:', error);
    res.status(500).json({ error: 'Failed to fetch view data', details: error.message });
  }
});

/**
 * Get view embed URL
 */
router.get('/views/:viewId/embed-url', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const { viewId } = req.params as { viewId: string };

    // Get view details first
    const views = await tableauService.listViews();
    const view = views.find(v => v.id === viewId);

    if (!view) {
      return res.status(404).json({ error: 'View not found' });
    }

    const embedUrl = tableauService.getViewEmbedUrl(viewId, view.contentUrl);

    res.json({
      success: true,
      embedUrl,
      viewName: view.name,
    });
  } catch (error: any) {
    console.error('❌ Error getting embed URL:', error);
    res.status(500).json({ error: 'Failed to get embed URL', details: error.message });
  }
});

/**
 * List all data sources
 */
router.get('/datasources', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    const dataSources = await tableauService.listDataSources();

    res.json({
      success: true,
      count: dataSources.length,
      dataSources: dataSources.map(ds => ({
        id: ds.id,
        name: ds.name,
        type: ds.type,
        projectName: ds.project.name,
        createdAt: ds.createdAt,
        isCertified: ds.isCertified,
      })),
    });
  } catch (error: any) {
    console.error('❌ Error fetching data sources:', error);
    res.status(500).json({ error: 'Failed to fetch data sources', details: error.message });
  }
});

/**
 * Trigger manual workbook indexing
 */
router.post('/index', requireTableauAuth, async (req: Request, res: Response) => {
  try {
    console.log('🔄 Starting manual workbook indexing...');

    const token = req.session!.tableauAuth!.token;
    const siteId = req.session!.tableauAuth!.siteId;

    await indexWorkbooks(token, siteId);

    res.json({
      success: true,
      message: 'Workbooks indexed successfully',
    });
  } catch (error: any) {
    console.error('❌ Indexing error:', error);
    res.status(500).json({ error: 'Indexing failed', details: error.message });
  }
});

/**
 * Helper: Index workbooks in background
 */
async function indexWorkbooksInBackground(token: string, siteId: string) {
  setTimeout(async () => {
    try {
      await indexWorkbooks(token, siteId);
    } catch (error) {
      console.error('❌ Background indexing failed:', error);
    }
  }, 2000); // Wait 2 seconds before starting
}

/**
 * Helper: Index workbooks in ChromaDB for semantic search
 */
async function indexWorkbooks(token: string, siteId: string) {
  // Skip indexing if ChromaDB is disabled (Tableau Discovery Agent works independently)
  if (!process.env.CHROMA_ENABLED) {
    console.log('ℹ️  Skipping ChromaDB indexing (Tableau Discovery Agent works independently)');
    return;
  }

  console.log('📚 Indexing Tableau workbooks in ChromaDB...');

  tableauService.setAuth(token, siteId);

  const workbooks = await tableauService.listWorkbooks();
  console.log(`   Found ${workbooks.length} workbooks to index`);

  if (workbooks.length === 0) {
    console.log('   ⚠️  No workbooks to index');
    return;
  }

  // Create searchable documents
  const documents: TableauWorkbookIndex[] = workbooks.map(wb => {
    const tags = Array.isArray(wb.tags) ? wb.tags.map(t => t.label) : [];
    const searchText = [
      wb.name,
      wb.description || '',
      wb.project.name,
      ...tags,
    ].join(' ').toLowerCase();

    return {
      id: wb.id,
      name: wb.name,
      description: wb.description || '',
      projectName: wb.project.name,
      fields: [], // Will be populated by Metadata API later
      viewNames: [], // Will be populated later
      dataSourceIds: [],
      tags,
      createdAt: wb.createdAt,
      webpageUrl: wb.webpageUrl,
      searchText,
    };
  });

  // Generate embeddings
  console.log('   🧠 Generating embeddings...');
  const embeddingsList = await Promise.all(
    documents.map(doc => embeddings.embedQuery(doc.searchText))
  );

  // Store in ChromaDB
  console.log('   💾 Storing in ChromaDB...');
  await upsertDocuments(
    COLLECTIONS.DATASETS, // Reuse datasets collection for now
    documents.map(d => `tableau-${d.id}`),
    embeddingsList,
    documents,
    documents.map(d => d.searchText)
  );

  console.log(`✅ Indexed ${documents.length} Tableau workbooks`);
}

export default router;
