import { llm } from '../config/llm.js';
import type { AgentState } from '../langgraph/state.js';

/**
 * Analyzer Agent - Analyzes dataset structure and plans analysis approach
 */
export async function analyzerAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('📊 Analyzer Agent: Planning analysis...');

  try {
    const { userQuery, relevantDatasets, intent, searchResults } = state;

    if (!relevantDatasets || relevantDatasets.length === 0) {
      return {
        error: 'No datasets available for analysis',
        nextAgent: null,
      };
    }

    // Build dataset context
    const datasetInfo = relevantDatasets.map(d => {
      const columnInfo = d.columns ? `Columns: ${d.columns.join(', ')}` : 'No column info';
      const schemaInfo = d.schema ? `\nSchema: ${JSON.stringify(d.schema, null, 2)}` : '';
      const sampleInfo = d.sampleRows ? `\nSample data (first row): ${JSON.stringify(d.sampleRows[0])}` : '';
      const statsInfo = (d as any).statistics ? `\nStatistics: ${JSON.stringify((d as any).statistics, null, 2)}` : '';
      const dataAvailable = (d as any).aggregatedData ? `\n✓ ${(d as any).aggregatedData.length} data rows available for analysis` : '';

      return `Dataset: ${d.name}
Type: ${d.type}
Total Rows: ${d.rowCount || 'Unknown'}
${columnInfo}${schemaInfo}${sampleInfo}${statsInfo}${dataAvailable}`;
    }).join('\n\n');

    // Include search results context if available
    const searchContext = searchResults ? `

External Research Context (from web search):
${searchResults.summary || JSON.stringify(searchResults.results || [], null, 2)}

Note: Use this external context to provide comparisons, benchmarks, or additional insights when analyzing the user's data.
` : '';

    const prompt = `You are a data analysis expert. Analyze the user's query and available datasets to plan the analysis.

User Query: "${userQuery}"
Intent: ${intent}

Available Datasets:
${datasetInfo}${searchContext}

Tasks:
1. Identify which datasets are most relevant
2. Determine what analysis is needed
3. Identify required columns/fields
4. Suggest the approach (aggregation, filtering, grouping, etc.)
5. Describe expected output format
${searchResults ? '6. Consider how to integrate external research findings with the dataset analysis' : ''}

Provide a clear, structured analysis plan.`;

    const response = await llm.invoke(prompt);
    const analysisPlan = response.content as string;

    console.log('✅ Analyzer: Analysis plan created');
    console.log(`   Plan summary: ${analysisPlan.substring(0, 100)}...`);

    // Determine next step based on intent
    // For uploaded Tableau CSVs, we have all data in memory, so route to visualizer
    let nextAgent = 'summarizer';
    if (intent === 'visualization') {
      nextAgent = 'visualizer';
    } else if (intent === 'query' || intent === 'analysis' || intent === 'comparison') {
      // Route to visualizer instead of query_generator (which is disabled)
      // For uploaded CSVs, we have all the data already
      nextAgent = 'visualizer';
    }

    return {
      analysisResults: {
        plan: analysisPlan,
        selectedDatasets: relevantDatasets.map(d => d.id),
        timestamp: new Date().toISOString(),
      },
      nextAgent,
      metadata: {
        ...state.metadata,
        analysisPlan,
      },
    };
  } catch (error) {
    console.error('❌ Analyzer Agent error:', error);
    return {
      error: `Analyzer agent failed: ${error}`,
      nextAgent: null,
    };
  }
}
