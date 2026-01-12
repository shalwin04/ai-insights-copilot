import { embeddings } from '../config/llm.js';
import { COLLECTIONS, semanticSearch, textSearch } from '../config/chromadb.js';
import type { AgentState, Dataset } from '../langgraph/state.js';
import { getUploadedDatasets, getDatasetById } from '../services/csvProcessor.js';

/**
 * Retriever Agent - Performs semantic search to find relevant datasets
 * Now also checks for uploaded Tableau CSV files
 */
export async function retrieverAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('🔍 Retriever Agent: Searching for relevant datasets...');

  try {
    const { userQuery } = state;
    let datasets: Dataset[] = [];

    // First, check for uploaded Tableau CSV files
    console.log('📤 Checking for uploaded Tableau CSV files...');
    const uploadedDatasets = getUploadedDatasets();

    if (uploadedDatasets.length > 0) {
      console.log(`✅ Found ${uploadedDatasets.length} uploaded Tableau datasets`);

      // For uploaded datasets, we have ALL the data in memory
      const uploadedWithFullData = uploadedDatasets.map(ds => {
        const fullDataset = getDatasetById(ds.id);
        return {
          id: ds.id,
          name: ds.name,
          type: ds.type as 'tableau_csv',
          columns: ds.columns,
          schema: {}, // CSV doesn't have schema
          summary: ds.summary,
          rowCount: fullDataset?.allRows?.length || ds.rowCount,
          sampleRows: fullDataset?.allRows || ds.sampleRows, // Use ALL rows for uploaded CSVs
          aggregatedData: undefined,
          statistics: undefined,
        };
      });

      datasets = uploadedWithFullData;
      console.log('   Using uploaded Tableau CSV data for analysis');
      uploadedDatasets.forEach(d => console.log(`   - ${d.name} (${d.rowCount} rows)`));
    }

    // If no uploaded data, fall back to ChromaDB search
    if (datasets.length === 0) {
      console.log('📊 No uploaded data, searching ChromaDB...');

      // Generate embedding for the query
      console.log('🧠 Generating query embedding...');
      const queryEmbedding = await embeddings.embedQuery(userQuery);

      // Perform semantic search in ChromaDB
      console.log('🔎 Searching ChromaDB...');
      const results = await semanticSearch(
        COLLECTIONS.DATASETS,
        queryEmbedding,
        undefined,
        5 // Top 5 results
      );

      // Transform results to Dataset format
      datasets = results.map((result: any) => ({
        id: result.id,
        name: result.name,
        type: result.type,
        columns: result.columns,
        schema: result.schema,
        summary: result.summary,
        rowCount: result.rowCount,
        sampleRows: result.sampleRows,
        aggregatedData: result.aggregatedData,
        statistics: result.statistics,
      }));

      console.log(`✅ Retriever: Found ${datasets.length} datasets in ChromaDB`);
      datasets.forEach(d => console.log(`   - ${d.name} (score: relevance)`));
    }

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
      const textResults = await textSearch(
        COLLECTIONS.DATASETS,
        state.userQuery,
        5
      );

      const datasets: Dataset[] = textResults.map((result: any) => ({
        id: result.id,
        name: result.name,
        type: result.type,
        columns: result.columns,
        schema: result.schema,
        summary: result.summary,
        rowCount: result.rowCount,
        sampleRows: result.sampleRows,
        aggregatedData: result.aggregatedData,
        statistics: result.statistics,
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
