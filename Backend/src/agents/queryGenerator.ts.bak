import { llm } from '../config/llm.js';
import { esClient, INDICES } from '../config/elasticsearch.js';
import type { AgentState } from '../langgraph/state.js';

/**
 * Query Generator Agent - Generates and executes data queries
 *
 * This agent takes the analysis plan and actual data to perform operations like:
 * - Filtering
 * - Aggregations
 * - Grouping
 * - Calculations
 */
export async function queryGeneratorAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    QUERY GENERATOR AGENT START         ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('📥 Input State:');
  console.log('   - Query:', state.userQuery);
  console.log('   - Datasets:', state.relevantDatasets?.length || 0);
  console.log('');

  try {
    const { userQuery, relevantDatasets, analysisResults } = state;

    if (!relevantDatasets || relevantDatasets.length === 0) {
      return {
        error: 'No datasets available',
        nextAgent: 'summarizer',
      };
    }

    // Get full dataset with sample data from Elasticsearch
    const firstDataset = relevantDatasets[0];
    if (!firstDataset) {
      return {
        error: 'No dataset found',
        nextAgent: 'summarizer',
      };
    }
    const datasetId = firstDataset.id;

    console.log('📊 Fetching full dataset from Elasticsearch...');
    const esResponse = await esClient.get({
      index: INDICES.DATASETS,
      id: datasetId,
    });

    const fullDataset = (esResponse as any)._source;

    // Build rich context with actual data
    const dataContext = `
Dataset: ${fullDataset.name}
Columns: ${fullDataset.columns?.join(', ') || 'Unknown'}
Row Count: ${fullDataset.rowCount || 'Unknown'}

Sample Data (first 5 rows):
${fullDataset.sampleRows ? JSON.stringify(fullDataset.sampleRows, null, 2) : 'No sample data'}

Statistics:
${fullDataset.statistics ? JSON.stringify(fullDataset.statistics, null, 2) : 'No statistics'}

Analysis Plan:
${typeof analysisResults === 'string' ? analysisResults : JSON.stringify(analysisResults)}
`;

    const prompt = `You are a data analyst. Based on the user's query and the dataset, analyze the data and provide insights.

User Query: "${userQuery}"

${dataContext}

Tasks:
1. Analyze the sample data to answer the user's question
2. Identify trends, patterns, or key findings
3. Perform any necessary calculations (sums, averages, etc.)
4. Provide specific numbers and facts from the data

Provide a detailed analysis with specific insights and numbers.`;

    console.log('🔄 Calling LLM for data analysis...');
    const response = await llm.invoke(prompt);
    const analysisText = response.content as string;

    console.log('✅ Query Generator: Analysis complete');
    console.log(`   Length: ${analysisText.length} characters`);
    console.log('╚════════════════════════════════════════╝\n');

    return {
      analysisResults: {
        ...state.analysisResults,
        queryResults: analysisText,
        executedAt: new Date().toISOString(),
      },
      nextAgent: 'summarizer',
      metadata: {
        ...state.metadata,
        hasQueryResults: true,
      },
    };
  } catch (error) {
    console.error('❌ Query Generator error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');
    return {
      error: `Query generator failed: ${error}`,
      nextAgent: 'summarizer',
    };
  }
}
