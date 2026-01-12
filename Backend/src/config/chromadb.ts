import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

// Initialize ChromaDB client
// For hackathon: ChromaDB is optional. Tableau Discovery Agent works independently.
// To enable ChromaDB: docker run -p 8000:8000 chromadb/chroma
// Then set CHROMA_ENABLED=true in .env
const CHROMA_ENABLED = process.env.CHROMA_ENABLED === 'true';
export const chromaClient = CHROMA_ENABLED ? new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000',
}) : null as any;

// Collection names (equivalent to Elasticsearch indices)
export const COLLECTIONS = {
  DATASETS: 'datasets',
  FILES: 'files',
  CHAT_HISTORY: 'chat_history',
  INSIGHTS: 'insights',
  WORKFLOWS: 'workflows',
  WORKFLOW_EXECUTIONS: 'workflow_executions',
};

// Store collection instances
let collections: { [key: string]: any } = {};

/**
 * Initialize ChromaDB collections
 */
export async function initializeChromaDB() {
  try {
    if (!CHROMA_ENABLED) {
      console.log('ℹ️  ChromaDB disabled (optional for Tableau demo)');
      console.log('   Tableau Discovery Agent will work independently');
      return;
    }

    console.log('🔌 Initializing ChromaDB...');

    // Get or create datasets collection
    collections[COLLECTIONS.DATASETS] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.DATASETS,
      metadata: { description: 'User datasets with embeddings' },
    });
    console.log('✅ Created/loaded datasets collection');

    // Get or create files collection
    collections[COLLECTIONS.FILES] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.FILES,
      metadata: { description: 'User files with embeddings' },
    });
    console.log('✅ Created/loaded files collection');

    // Get or create chat history collection
    collections[COLLECTIONS.CHAT_HISTORY] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.CHAT_HISTORY,
      metadata: { description: 'Chat conversation history' },
    });
    console.log('✅ Created/loaded chat history collection');

    // Get or create insights collection
    collections[COLLECTIONS.INSIGHTS] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.INSIGHTS,
      metadata: { description: 'Generated insights' },
    });
    console.log('✅ Created/loaded insights collection');

    // Get or create workflows collection
    collections[COLLECTIONS.WORKFLOWS] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.WORKFLOWS,
      metadata: { description: 'Automated workflows' },
    });
    console.log('✅ Created/loaded workflows collection');

    // Get or create workflow executions collection
    collections[COLLECTIONS.WORKFLOW_EXECUTIONS] = await chromaClient.getOrCreateCollection({
      name: COLLECTIONS.WORKFLOW_EXECUTIONS,
      metadata: { description: 'Workflow execution history' },
    });
    console.log('✅ Created/loaded workflow executions collection');

    console.log('✅ ChromaDB initialized successfully');
  } catch (error) {
    console.error('❌ ChromaDB initialization failed:', error);
    throw error;
  }
}

/**
 * Get a collection by name
 */
export function getCollection(name: string) {
  return collections[name];
}

/**
 * Add documents to a collection
 */
export async function addDocuments(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas: object[],
  documents?: string[]
) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  await collection.add({
    ids,
    embeddings,
    metadatas,
    documents,
  });
}

/**
 * Update documents in a collection (upsert)
 */
export async function upsertDocuments(
  collectionName: string,
  ids: string[],
  embeddings: number[][],
  metadatas: object[],
  documents?: string[]
) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  await collection.upsert({
    ids,
    embeddings,
    metadatas,
    documents,
  });
}

/**
 * Semantic search using vector similarity
 */
export async function semanticSearch(
  collectionName: string,
  embedding: number[],
  filter?: object,
  limit: number = 10
) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: limit,
    where: filter,
  });

  // Transform results to match Elasticsearch format
  if (!results.ids || !results.ids[0]) {
    return [];
  }

  return results.ids[0].map((id: string, index: number) => ({
    id,
    ...(results.metadatas?.[0]?.[index] || {}),
    score: results.distances?.[0]?.[index] || 0,
  }));
}

/**
 * Get document by ID
 */
export async function getDocument(collectionName: string, id: string) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  const results = await collection.get({
    ids: [id],
  });

  if (!results.ids || results.ids.length === 0) {
    return null;
  }

  return {
    id: results.ids[0],
    ...(results.metadatas?.[0] || {}),
  };
}

/**
 * Delete document by ID
 */
export async function deleteDocument(collectionName: string, id: string) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  await collection.delete({
    ids: [id],
  });
}

/**
 * Delete documents by filter (for user data cleanup)
 */
export async function deleteDocumentsByFilter(collectionName: string, filter: object) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  await collection.delete({
    where: filter,
  });
}

/**
 * Search documents by text (simple text matching)
 * Note: ChromaDB doesn't have full-text search like Elasticsearch
 * This is a basic implementation for fallback
 */
export async function textSearch(
  collectionName: string,
  query: string,
  limit: number = 10
) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  // Get all documents and filter by text match (simple implementation)
  // For production, you'd want to implement proper full-text search
  const results = await collection.get({});

  const matches: any[] = [];

  if (results.ids && results.metadatas) {
    results.ids.forEach((id: string, index: number) => {
      const metadata = results.metadatas?.[index] || {};
      const document = results.documents?.[index] || '';

      // Simple text matching
      const metadataStr = JSON.stringify(metadata).toLowerCase();
      const documentStr = document.toString().toLowerCase();
      const queryLower = query.toLowerCase();

      if (metadataStr.includes(queryLower) || documentStr.includes(queryLower)) {
        matches.push({
          id,
          ...metadata,
        });
      }
    });
  }

  return matches.slice(0, limit);
}

/**
 * Count documents in a collection
 */
export async function countDocuments(collectionName: string, filter?: object) {
  const collection = getCollection(collectionName);
  if (!collection) {
    throw new Error(`Collection ${collectionName} not found`);
  }

  const results = await collection.get({
    where: filter,
  });

  return results.ids?.length || 0;
}
