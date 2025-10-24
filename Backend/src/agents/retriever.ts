import { embeddings } from '../config/llm.js';
import { esClient, INDICES, semanticSearch } from '../config/elasticsearch.js';
import type { AgentState, Dataset } from '../langgraph/state.js';

/**
 * Retriever Agent - Performs semantic search to find relevant datasets
 */
export async function retrieverAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('🔍 Retriever Agent: Searching for relevant datasets...');

  try {
    const { userQuery } = state;

    // Generate embedding for the query
    console.log('🧠 Generating query embedding...');
    const queryEmbedding = await embeddings.embedQuery(userQuery);

    // Perform semantic search in Elasticsearch
    console.log('🔎 Searching Elasticsearch...');
    const results = await semanticSearch(
      INDICES.DATASETS,
      queryEmbedding,
      undefined,
      5 // Top 5 results
    );

    // Transform results to Dataset format
    const datasets: Dataset[] = results.map((result: any) => ({
      id: result.id,
      name: result.name,
      type: result.type,
      columns: result.columns,
      schema: result.schema,
      summary: result.summary,
      rowCount: result.rowCount,
      sampleRows: result.sampleRows,
      aggregatedData: result.aggregatedData, // Include aggregated data for visualizations
      statistics: result.statistics, // Include statistics for analysis
    }));

    console.log(`✅ Retriever: Found ${datasets.length} relevant datasets`);
    datasets.forEach(d => console.log(`   - ${d.name} (score: relevance)`));

    // If no datasets found, provide helpful message
    if (datasets.length === 0) {
      return {
        relevantDatasets: [],
        nextAgent: null,
        error: 'No relevant datasets found. Please connect a data source or upload files.',
      };
    }

    // Determine next agent - check if web search is required
    const requiresWebSearch = state.metadata?.requiresWebSearch;
    const nextAgent = requiresWebSearch ? 'search' : 'analyzer';

    if (requiresWebSearch) {
      console.log('   🔍 Web search required - routing to search agent');
    }

    return {
      relevantDatasets: datasets,
      nextAgent,
      metadata: {
        ...state.metadata,
        retrieverTimestamp: new Date().toISOString(),
        datasetsSearched: datasets.length,
      },
    };
  } catch (error) {
    console.error('❌ Retriever Agent error:', error);

    // Fallback: try text search without embeddings
    try {
      console.log('⚠️  Falling back to text search...');
      const textResults = await (esClient.search as any)({
        index: INDICES.DATASETS,
        body: {
          query: {
            multi_match: {
              query: state.userQuery,
              fields: ['name^2', 'summary', 'columns'],
            },
          },
          size: 5,
        },
      });

      const datasets: Dataset[] = textResults.hits.hits.map((hit: any) => ({
        id: hit._source.id,
        name: hit._source.name,
        type: hit._source.type,
        columns: hit._source.columns,
        schema: hit._source.schema,
        summary: hit._source.summary,
        rowCount: hit._source.rowCount,
        sampleRows: hit._source.sampleRows,
        aggregatedData: hit._source.aggregatedData, // Include aggregated data for visualizations
        statistics: hit._source.statistics, // Include statistics for analysis
      }));

      console.log(`✅ Fallback: Found ${datasets.length} datasets via text search`);

      // Determine next agent - check if web search is required
      const requiresWebSearch = state.metadata?.requiresWebSearch;
      const nextAgent = datasets.length === 0 ? null : (requiresWebSearch ? 'search' : 'analyzer');

      return {
        relevantDatasets: datasets,
        nextAgent,
        metadata: {
          ...state.metadata,
          fallbackSearch: true,
        },
      };
    } catch (fallbackError) {
      console.error('❌ Fallback search also failed:', fallbackError);
      return {
        error: `Retriever agent failed: ${error}`,
        nextAgent: null,
      };
    }
  }
}
