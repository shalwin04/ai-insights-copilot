import { fastLLM } from '../config/llm.js';
import type { AgentState } from '../langgraph/state.js';
import { z } from 'zod';

// Schema for structured output
const IntentSchema = z.object({
  intent: z.enum(['query', 'visualization', 'summary', 'comparison', 'analysis']),
  queryType: z.string(),
  requiresDataRetrieval: z.boolean(),
  requiresWebSearch: z.boolean(),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  reasoning: z.string(),
});

/**
 * Router Agent - Classifies user intent and routes to appropriate agents
 */
export async function routerAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║       ROUTER AGENT START               ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('📥 Input State:');
  console.log('   - Query:', state.userQuery);
  console.log('   - Has Datasets:', state.relevantDatasets?.length || 0);
  console.log('');

  try {
    const { userQuery, relevantDatasets } = state;

    // Build context about available datasets
    const datasetContext = relevantDatasets.length > 0
      ? `Available datasets:\n${relevantDatasets.map(d =>
          `- ${d.name} (${d.type}): ${d.summary || 'No summary'}`
        ).join('\n')}`
      : 'No datasets currently available. May need to connect data sources.';

    const prompt = `You are a query analyzer for an AI analytics copilot. Analyze the user's query and determine:
1. The primary intent (query/visualization/summary/comparison/analysis)
2. The type of query (e.g., "trend analysis", "comparison", "statistical summary")
3. Whether data retrieval is needed
4. Whether web search is needed for external data/benchmarks
5. Complexity level

User Query: "${userQuery}"

${datasetContext}

Web search indicators:
- Mentions of "industry", "market", "competitors", "benchmarks", "trends", "global", "external"
- Requests to compare with "other companies", "industry average", "market standards"
- Questions about "what's normal", "industry standard", "best practices"
- Phrases like "compare with", "how does it stack up", "is this good"

Analyze this query and provide structured output.`;

    const response = await fastLLM.invoke(prompt);
    const content = response.content as string;

    // Parse the response (simple keyword-based for now)
    let intent: AgentState['intent'] = 'query';
    let queryType = 'general';
    let requiresDataRetrieval = true;
    let requiresWebSearch = false;
    let complexity: 'simple' | 'moderate' | 'complex' = 'moderate';

    const lowerQuery = userQuery.toLowerCase();

    // Detect if web search is needed
    const searchKeywords = [
      'industry', 'market', 'competitor', 'benchmark', 'global', 'external',
      'industry average', 'market standard', 'best practice', 'trend',
      'compare with', 'stack up', 'is this good', 'normal', 'typical',
      'other companies', 'other sites', 'check other', 'look up',
      'internet', 'search', 'current', 'latest', 'recent',
      'online', 'web', 'worldwide', 'real-time', 'up-to-date'
    ];

    requiresWebSearch = searchKeywords.some(keyword => lowerQuery.includes(keyword));

    // Intent detection - visualization has highest priority
    // Handle typos and variations: visualiz*, visual*, visulaiz*, vis*
    const visualizationKeywords = [
      'visualiz', 'visual', 'visulaiz', 'visualis', // Common typos and variations
      'chart', 'graph', 'plot', 'display',
      'show', 'draw', 'create a vis', 'make a vis'
    ];

    const hasVisualizationIntent = visualizationKeywords.some(keyword =>
      lowerQuery.includes(keyword)
    );

    if (hasVisualizationIntent) {
      intent = 'visualization';
      queryType = 'visualization_request';
    } else if (lowerQuery.includes('summarize') || lowerQuery.includes('summary') || lowerQuery.includes('overview')) {
      intent = 'summary';
      queryType = 'summarization';
    } else if (lowerQuery.includes('compare') || lowerQuery.includes('vs') || lowerQuery.includes('versus')) {
      intent = 'comparison';
      queryType = 'comparison_analysis';
    } else if (lowerQuery.includes('analyze') || lowerQuery.includes('insight') || lowerQuery.includes('find')) {
      intent = 'analysis';
      queryType = 'deep_analysis';
    }

    // Complexity detection
    if (lowerQuery.split(' ').length < 5) {
      complexity = 'simple';
    } else if (lowerQuery.split(' ').length > 15 || lowerQuery.includes('and') || lowerQuery.includes('then')) {
      complexity = 'complex';
    }

    // Check if this is a conversational query (no data needed)
    const isConversational =
      lowerQuery.includes('hello') ||
      lowerQuery.includes('hi ') ||
      lowerQuery.includes('help') ||
      lowerQuery.includes('what can you') ||
      lowerQuery.includes('who are you') ||
      lowerQuery.includes('how do') ||
      (lowerQuery.includes('can you') && !lowerQuery.includes('data')) ||
      complexity === 'simple' && relevantDatasets.length === 0 && !requiresDataRetrieval;

    // Check if this is a Tableau query
    const tableauKeywords = [
      'dashboard', 'visualization', 'viz', 'tableau', 'chart',
      'graph', 'report', 'workbook', 'view', 'show me', 'display',
      'visualize', 'plot'
    ];
    const isTableauQuery = tableauKeywords.some(keyword => lowerQuery.includes(keyword));

    // Determine next agent
    let nextAgent = 'retriever';

    if (isConversational) {
      // Go straight to conversational summarizer - no data retrieval needed
      nextAgent = 'conversational_brain';
      requiresDataRetrieval = false;
      console.log('   🧠 Detected conversational query - using LLM brain directly');
    } else if (isTableauQuery) {
      // Route to Tableau agent for visualization discovery
      nextAgent = 'tableau';
      console.log('   🎨 Detected Tableau query - routing to Tableau Discovery Agent');
    } else if (relevantDatasets.length === 0) {
      nextAgent = 'retriever'; // Need to find datasets first
    } else if (requiresWebSearch) {
      nextAgent = 'search'; // Perform web search first
      console.log('   🔍 Detected web search requirement');
    } else if (intent === 'summary' && complexity === 'simple') {
      nextAgent = 'summarizer'; // Can go directly to summary
    } else {
      nextAgent = 'analyzer'; // Need analysis
    }

    console.log('✅ Router Analysis Complete:');
    console.log('   ✓ Intent:', intent);
    console.log('   ✓ Query Type:', queryType);
    console.log('   ✓ Complexity:', complexity);
    console.log('   ✓ Requires Web Search:', requiresWebSearch);
    console.log('   ✓ Next Agent:', nextAgent);
    console.log('╚════════════════════════════════════════╝\n');

    return {
      intent,
      queryType,
      nextAgent,
      metadata: {
        ...state.metadata,
        requiresDataRetrieval,
        requiresWebSearch,
        complexity,
        routerReasoning: content.substring(0, 200),
      },
    };
  } catch (error) {
    console.error('❌ Router Agent error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');
    return {
      error: `Router agent failed: ${error}`,
      nextAgent: null,
    };
  }
}
