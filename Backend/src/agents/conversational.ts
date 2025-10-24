import { llm } from '../config/llm.js';
import type { AgentState } from '../langgraph/state.js';

/**
 * Conversational Brain Agent - Handles general queries without data retrieval
 * This is the AI assistant personality that answers questions about capabilities,
 * provides help, and handles casual conversation
 */
export async function conversationalBrainAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    CONVERSATIONAL BRAIN AGENT          ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('🧠 AI Brain: Handling conversational query...');
  console.log('📥 Query:', state.userQuery);
  console.log('');

  try {
    const { userQuery, relevantDatasets } = state;

    // Build context about connected data sources
    const dataContext = relevantDatasets && relevantDatasets.length > 0
      ? `\nConnected Data Sources: ${relevantDatasets.length} datasets available including: ${relevantDatasets.slice(0, 3).map(d => d.name).join(', ')}`
      : '\nNo data sources currently connected.';

    const prompt = `You are an AI-powered analytics copilot assistant. You help users understand and analyze their business data through natural conversation.

Your capabilities:
- Connect to Google Drive, OneDrive, Notion, and other data sources
- Analyze structured data (CSV, Excel) and unstructured data (PDFs, documents)
- Generate insights, visualizations, and summaries automatically
- Answer questions about data in natural language
- Create interactive dashboards
- Detect trends, anomalies, and patterns

Current context:${dataContext}

User Query: "${userQuery}"

Provide a helpful, friendly response. If the user is asking about capabilities, explain what you can do. If they need to connect data first, guide them. Be conversational and encouraging.

Keep your response concise (2-3 sentences) unless more detail is needed.`;

    console.log('🔄 Calling LLM for conversational response...');
    const response = await llm.invoke(prompt);
    const summary = response.content as string;

    console.log('✅ Response generated:');
    console.log('   Length:', summary.length, 'characters');
    console.log('   Preview:', summary.substring(0, 100) + '...');
    console.log('╚════════════════════════════════════════╝\n');

    return {
      summary,
      insights: [
        {
          type: 'summary',
          title: 'AI Assistant',
          content: 'Conversational response generated',
          confidence: 1.0,
        },
      ],
      nextAgent: null, // End workflow
      messages: [
        {
          role: 'assistant',
          content: summary,
          timestamp: new Date(),
        },
      ],
    };
  } catch (error) {
    console.error('❌ Conversational Brain error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');

    // Fallback response
    return {
      summary: "I'm your AI analytics copilot! I can help you analyze data, create visualizations, and generate insights. To get started, connect a data source from the sidebar, or ask me what I can do!",
      insights: [],
      nextAgent: null,
      messages: [
        {
          role: 'assistant',
          content: "I'm your AI analytics copilot! I can help you analyze data, create visualizations, and generate insights. To get started, connect a data source from the sidebar, or ask me what I can do!",
          timestamp: new Date(),
        },
      ],
    };
  }
}
