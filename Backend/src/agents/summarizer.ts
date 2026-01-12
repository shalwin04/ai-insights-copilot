import { llm } from '../config/llm.js';
import type { AgentState, Insight } from '../langgraph/state.js';

/**
 * Summarizer Agent - Generates natural language insights and summaries
 */
export async function summarizerAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      SUMMARIZER AGENT START            ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('📥 Input State:');
  console.log('   - Query:', state.userQuery);
  console.log('   - Datasets:', state.relevantDatasets?.length || 0);
  console.log('   - Has Analysis:', !!state.analysisResults);
  console.log('   - Intent:', state.intent);
  console.log('');

  try {
    const { userQuery, relevantDatasets, analysisResults, visualization, intent, searchResults, tableauViews } = state;

    // Build context for summarization
    const context: string[] = [];

    context.push(`User Query: "${userQuery}"`);
    context.push(`Intent: ${intent}`);

    // Include Tableau visualizations if found
    if (tableauViews && tableauViews.length > 0) {
      context.push(`\nTableau Visualizations Found (${tableauViews.length}):`);
      tableauViews.forEach((view, index) => {
        context.push(`${index + 1}. "${view.name}" from workbook "${view.workbookName || 'Unknown'}"`);
        context.push(`   - Relevance: ${Math.round(view.relevanceScore * 100)}%`);
        context.push(`   - Description: ${view.description || 'Interactive Tableau dashboard'}`);
        if (view.projectName) {
          context.push(`   - Project: ${view.projectName}`);
        }
      });
      context.push(`\nNote: These Tableau dashboards contain the actual data and will be displayed to the user.`);
    }

    // Include search results if available
    if (searchResults) {
      context.push(`\nExternal Research Findings:`);
      context.push(searchResults.summary || JSON.stringify(searchResults.results || [], null, 2));
    }

    if (relevantDatasets && relevantDatasets.length > 0) {
      context.push(`\nDatasets analyzed:`);
      relevantDatasets.forEach(d => {
        context.push(`- ${d.name}: ${d.summary || 'No summary available'}`);
        if (d.rowCount) {
          context.push(`  Total Rows: ${d.rowCount}`);
        }
        if (d.columns) {
          context.push(`  Columns (${d.columns.length}): ${d.columns.join(', ')}`);
        }
        // Include statistics if available
        if ((d as any).statistics) {
          context.push(`  Statistics: ${JSON.stringify((d as any).statistics, null, 2)}`);
        }
        // Mention available data points
        const dataPoints = (d as any).aggregatedData?.length || (d as any).sampleRows?.length || 0;
        if (dataPoints > 0) {
          context.push(`  Data available for analysis: ${dataPoints} rows`);
        }
      });
    }

    if (analysisResults) {
      context.push(`\nAnalysis performed:`);
      context.push(typeof analysisResults === 'string' ? analysisResults : JSON.stringify(analysisResults, null, 2));
    }

    if (visualization) {
      context.push(`\nVisualization created:`);
      context.push(`Type: ${visualization.type}`);
      context.push(`Data points: ${visualization.data?.length || 0}`);
    }

    const prompt = `You are an AI data analyst providing insights to a user. Based on the analysis performed, generate:

1. A clear, concise summary (2-3 sentences)
2. Key insights (2-4 bullet points)
3. Notable trends or patterns
4. Actionable recommendations (if applicable)
${searchResults ? '5. Comparison with external benchmarks/industry data when relevant' : ''}

Context:
${context.join('\n')}

${tableauViews && tableauViews.length > 0 ? `
IMPORTANT: Tableau visualizations have been found and WILL BE DISPLAYED to the user below your message.
- DO NOT make up or simulate data
- DO NOT say "I don't have access to the data"
- Instead, explain that you found ${tableauViews.length} relevant Tableau dashboard(s)
- Reference the specific dashboard names you found
- Explain that the user can interact with the live Tableau visualizations to explore the actual data
- Be brief since the interactive dashboards will provide the detailed data
` : ''}

Generate a helpful, professional response that directly answers the user's query.
Be specific with numbers and findings when available.
${searchResults ? 'When external research is available, integrate those findings to provide context and comparisons.' : ''}
If analysis is limited, explain what was found and suggest next steps.`;

    console.log('🔄 Calling LLM for summary generation...');
    const response = await llm.invoke(prompt);
    const summary = response.content as string;

    console.log('✅ Summarizer: Summary generated');
    console.log(`   Length: ${summary.length} characters`);
    console.log(`   Preview: ${summary.substring(0, 150)}...`);
    console.log('');

    // Extract insights from summary (simple approach)
    const insights: Insight[] = [];

    // Parse for trends (simple keyword detection)
    if (summary.toLowerCase().includes('increase') || summary.toLowerCase().includes('growth')) {
      insights.push({
        type: 'trend',
        title: 'Growth Detected',
        content: 'Analysis indicates positive growth trend',
        confidence: 0.7,
      });
    }

    if (summary.toLowerCase().includes('decrease') || summary.toLowerCase().includes('decline')) {
      insights.push({
        type: 'trend',
        title: 'Decline Observed',
        content: 'Analysis indicates declining trend',
        confidence: 0.7,
      });
    }

    // Add general insight
    insights.push({
      type: 'summary',
      title: 'Analysis Complete',
      content: summary.split('\n')[0] || summary.substring(0, 150),
      confidence: 0.9,
    });

    console.log('📊 Generated', insights.length, 'insights');
    console.log('✅ Summarizer Complete!');
    console.log('╚════════════════════════════════════════╝\n');

    return {
      summary,
      insights,
      visualization, // Preserve visualization from previous agents
      tableauViews, // Preserve Tableau views from previous agents
      nextAgent: null, // End of workflow
      messages: [
        {
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
        },
      ],
    };
  } catch (error) {
    console.error('❌ Summarizer Agent error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');
    return {
      error: `Summarizer agent failed: ${error}`,
      summary: 'Unable to generate summary. Please try again.',
      nextAgent: null,
    };
  }
}
