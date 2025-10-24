import { StateGraph, START, END } from '@langchain/langgraph';
import { StateAnnotation, type AgentState } from './state.js';
import { routerAgent } from '../agents/router.js';
import { retrieverAgent } from '../agents/retriever.js';
import { analyzerAgent } from '../agents/analyzer.js';
import { summarizerAgent } from '../agents/summarizer.js';
import { conversationalBrainAgent } from '../agents/conversational.js';
import { visualizerAgent } from '../agents/visualizer.js';
import { queryGeneratorAgent } from '../agents/queryGenerator.js';
import { searchAgent } from '../agents/search.js';

/**
 * Routing function - determines next step in workflow
 */
function routeNext(state: AgentState): string {
  if (state.error) {
    console.log('⚠️  Error detected, ending workflow');
    return END;
  }

  if (!state.nextAgent) {
    console.log('✅ Workflow complete');
    return END;
  }

  console.log(`➡️  Routing to: ${state.nextAgent}`);
  return state.nextAgent;
}

/**
 * Create the LangGraph workflow
 */
export function createWorkflow() {
  const workflow = new StateGraph(StateAnnotation)
    // Add all agent nodes
    .addNode('router', routerAgent)
    .addNode('retriever', retrieverAgent)
    .addNode('search', searchAgent)
    .addNode('analyzer', analyzerAgent)
    .addNode('summarizer', summarizerAgent)
    .addNode('conversational_brain', conversationalBrainAgent)
    .addNode('visualizer', visualizerAgent)
    .addNode('query_generator', queryGeneratorAgent)

    // Define edges
    .addEdge(START, 'router')
    .addConditionalEdges('router', routeNext, {
      retriever: 'retriever',
      search: 'search',
      analyzer: 'analyzer',
      summarizer: 'summarizer',
      conversational_brain: 'conversational_brain',
      [END]: END,
    })
    .addConditionalEdges('retriever', routeNext, {
      search: 'search',
      analyzer: 'analyzer',
      summarizer: 'summarizer',
      [END]: END,
    })
    .addConditionalEdges('search', routeNext, {
      analyzer: 'analyzer',
      summarizer: 'summarizer',
      [END]: END,
    })
    .addConditionalEdges('analyzer', routeNext, {
      summarizer: 'summarizer',
      visualizer: 'visualizer',
      query_generator: 'query_generator',
      [END]: END,
    })
    .addConditionalEdges('visualizer', routeNext, {
      summarizer: 'summarizer',
      [END]: END,
    })
    .addConditionalEdges('query_generator', routeNext, {
      summarizer: 'summarizer',
      [END]: END,
    })
    .addConditionalEdges('summarizer', routeNext, {
      [END]: END,
    })
    .addConditionalEdges('conversational_brain', routeNext, {
      [END]: END,
    });

  return workflow.compile();
}

/**
 * Execute the workflow with a user query
 */
export async function executeWorkflow(
  userQuery: string,
  onUpdate?: (state: AgentState) => void
): Promise<AgentState> {
  console.log(`\n🚀 Starting workflow for query: "${userQuery}"\n`);

  const app = createWorkflow();

  // Initial state
  const initialState: Partial<AgentState> = {
    userQuery,
    messages: [
      {
        role: 'user',
        content: userQuery,
        timestamp: new Date(),
      },
    ],
    relevantDatasets: [],
    insights: [],
    metadata: {},
  };

  try {
    let finalState: AgentState | undefined;

    // Stream through the workflow
    const stream = await app.stream(initialState as any);
    for await (const step of stream as any) {
      const entries = Object.entries(step);
      if (entries.length === 0) continue;

      const [nodeName, nodeState] = entries[0] as [string, any];
      console.log(`\n📍 Step: ${nodeName}`);

      // Call update callback if provided
      if (onUpdate && nodeState) {
        onUpdate(nodeState as AgentState);
      }

      finalState = nodeState as AgentState;
    }

    if (!finalState) {
      throw new Error('Workflow did not produce a final state');
    }

    console.log('\n✅ Workflow completed successfully\n');
    return finalState;
  } catch (error) {
    console.error('\n❌ Workflow failed:', error);
    throw error;
  }
}

/**
 * Simple test function
 */
export async function testWorkflow() {
  console.log('🧪 Testing workflow...\n');

  const result = await executeWorkflow(
    'Show me sales trends',
    (state) => {
      console.log('📊 Update:', {
        agent: state.nextAgent,
        datasetsFound: state.relevantDatasets.length,
        hasError: !!state.error,
      });
    }
  );

  console.log('\n📋 Final Result:');
  console.log('Intent:', result.intent);
  console.log('Datasets:', result.relevantDatasets.length);
  console.log('Summary:', result.summary?.substring(0, 100) + '...');
  console.log('Insights:', result.insights.length);

  return result;
}
