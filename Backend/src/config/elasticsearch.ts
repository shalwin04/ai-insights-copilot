import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const clientConfig: any = {
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
};

if (process.env.ELASTICSEARCH_API_KEY) {
  clientConfig.auth = { apiKey: process.env.ELASTICSEARCH_API_KEY };
}

export const esClient = new Client(clientConfig);

// Index names
export const INDICES = {
  DATASETS: 'datasets',
  FILES: 'files',
  CHAT_HISTORY: 'chat_history',
  INSIGHTS: 'insights',
};

// Initialize indices
export async function initializeElasticsearch() {
  try {
    // Check connection
    await esClient.ping();
    console.log('✅ Elasticsearch connected');

    // Create datasets index
    const datasetsExists = await esClient.indices.exists({ index: INDICES.DATASETS });
    if (!datasetsExists) {
      await (esClient.indices.create as any)({
        index: INDICES.DATASETS,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              name: { type: 'text' },
              source: { type: 'keyword' },
              type: { type: 'keyword' },
              size: { type: 'long' },
              rowCount: { type: 'integer' },
              columnCount: { type: 'integer' },
              columns: { type: 'keyword' },
              schema: { type: 'object' },
              summary: { type: 'text' },
              embedding: {
                type: 'dense_vector',
                dims: 1536, // OpenAI embedding dimension
              },
              metadata: { type: 'object' },
              content: { type: 'text' },
              sampleRows: { type: 'object', enabled: false }, // Store as-is without indexing
              aggregatedData: { type: 'object', enabled: false }, // Store up to 100 rows for visualizations
              statistics: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created datasets index');
    }

    // Create files index
    const filesExists = await esClient.indices.exists({ index: INDICES.FILES });
    if (!filesExists) {
      await (esClient.indices.create as any)({
        index: INDICES.FILES,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              datasetId: { type: 'keyword' },
              name: { type: 'text' },
              path: { type: 'keyword' },
              type: { type: 'keyword' },
              size: { type: 'long' },
              content: { type: 'text' },
              embedding: {
                type: 'dense_vector',
                dims: 1536,
              },
              chunks: {
                type: 'nested',
                properties: {
                  text: { type: 'text' },
                  embedding: {
                    type: 'dense_vector',
                    dims: 1536,
                  },
                  metadata: { type: 'object' },
                },
              },
              metadata: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created files index');
    }

    // Create chat history index
    const chatExists = await esClient.indices.exists({ index: INDICES.CHAT_HISTORY });
    if (!chatExists) {
      await (esClient.indices.create as any)({
        index: INDICES.CHAT_HISTORY,
        body: {
          mappings: {
            properties: {
              sessionId: { type: 'keyword' },
              userId: { type: 'keyword' },
              role: { type: 'keyword' },
              content: { type: 'text' },
              metadata: { type: 'object' },
              timestamp: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created chat history index');
    }

    // Create insights index
    const insightsExists = await esClient.indices.exists({ index: INDICES.INSIGHTS });
    if (!insightsExists) {
      await (esClient.indices.create as any)({
        index: INDICES.INSIGHTS,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              sessionId: { type: 'keyword' },
              type: { type: 'keyword' },
              title: { type: 'text' },
              content: { type: 'text' },
              visualization: { type: 'object' },
              datasets: { type: 'keyword' },
              query: { type: 'text' },
              metadata: { type: 'object' },
              pinned: { type: 'boolean' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      console.log('✅ Created insights index');
    }

    console.log('✅ Elasticsearch indices initialized');
  } catch (error) {
    console.error('❌ Elasticsearch initialization failed:', error);
    throw error;
  }
}

// Helper function to search with semantic similarity
export async function semanticSearch(
  index: string,
  embedding: number[],
  filter?: any,
  size: number = 10
) {
  const response = await (esClient.search as any)({
    index,
    body: {
      size,
      query: {
        bool: {
          must: [
            {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                  params: { query_vector: embedding },
                },
              },
            },
          ],
          filter: filter ? [filter] : [],
        },
      },
    },
  });

  return response.hits.hits.map((hit: any) => ({
    ...hit._source,
    score: hit._score,
  }));
}
