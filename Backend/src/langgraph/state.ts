import { Annotation } from '@langchain/langgraph';

export interface Dataset {
  id: string;
  name: string;
  type: string;
  columns?: string[];
  schema?: Record<string, string>;
  summary?: string;
  rowCount?: number;
  sampleRows?: any[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface Visualization {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  data: any[];
  spec?: any; // Vega-Lite spec
  title?: string;
  description?: string;
}

export interface Insight {
  type: 'trend' | 'anomaly' | 'correlation' | 'summary';
  title: string;
  content: string;
  confidence: number;
}

// Define the state annotation for LangGraph
export const StateAnnotation = Annotation.Root({
  // User input
  userQuery: Annotation<string>,

  // Conversation history
  messages: Annotation<Message[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Query understanding
  intent: Annotation<'query' | 'visualization' | 'summary' | 'comparison' | 'analysis'>,
  queryType: Annotation<string>,

  // Retrieved datasets
  relevantDatasets: Annotation<Dataset[]>({
    reducer: (current, update) => update,
    default: () => [],
  }),

  // Analysis results
  analysisResults: Annotation<any>,
  queryCode: Annotation<string>,

  // Visualization
  visualization: Annotation<Visualization | null>,

  // Insights
  insights: Annotation<Insight[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  // Web search results
  searchResults: Annotation<any>,
  searchContext: Annotation<string>,

  // Summary
  summary: Annotation<string>,

  // Routing
  nextAgent: Annotation<string | null>,

  // Metadata
  metadata: Annotation<Record<string, any>>({
    reducer: (current, update) => ({ ...current, ...update }),
    default: () => ({}),
  }),

  // Error handling
  error: Annotation<string | null>,
});

export type AgentState = typeof StateAnnotation.State;
