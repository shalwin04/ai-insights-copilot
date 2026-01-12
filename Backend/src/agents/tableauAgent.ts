import type { AgentState } from '../langgraph/state.js';
import { tableauService } from '../services/tableau.js';
import {
  buildTableauIndex,
  generateTableauEmbeddings,
  tableauDiscoveryAgent,
} from './tableauDiscovery.js';

/**
 * Tableau Agent - Integrates with LangGraph workflow
 *
 * This agent:
 * 1. Checks if Tableau is authenticated
 * 2. Builds searchable index of Tableau content
 * 3. Uses AI to find relevant visualizations
 * 4. Returns Tableau views with embed URLs
 */

// Cache the Tableau index to avoid rebuilding on every query
let tableauIndexCache: Awaited<ReturnType<typeof generateTableauEmbeddings>> | null = null;
let lastIndexBuildTime: number = 0;
const INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getTableauIndex() {
  const now = Date.now();

  // Return cached index if still valid
  if (tableauIndexCache && (now - lastIndexBuildTime) < INDEX_CACHE_TTL) {
    console.log('📋 Using cached Tableau index');
    return tableauIndexCache;
  }

  console.log('🔄 Building fresh Tableau index...');
  const index = await buildTableauIndex();
  const indexWithEmbeddings = await generateTableauEmbeddings(index);

  tableauIndexCache = indexWithEmbeddings;
  lastIndexBuildTime = now;

  return indexWithEmbeddings;
}

export async function tableauAgent(state: AgentState): Promise<Partial<AgentState>> {
  try {
    console.log('\n🎨 Tableau Agent: Searching for visualizations and extracting data...');

    const query = state.userQuery;

    // Get or build Tableau index
    const tableauIndex = await getTableauIndex();

    // Use Discovery Agent to find relevant visualizations
    const discoveryResult = await tableauDiscoveryAgent(query, tableauIndex);

    if (discoveryResult.results.length === 0) {
      console.log('⚠️  No Tableau visualizations found');
      return {
        tableauViews: [],
        insights: [
          ...(state.insights || []),
          {
            type: 'summary',
            title: 'No Tableau Visualizations Found',
            content: 'No relevant Tableau visualizations found for your query.',
            confidence: 1.0,
          },
        ],
        nextAgent: 'summarizer',
      };
    }

    console.log(`✅ Found ${discoveryResult.results.length} Tableau visualizations`);

    // Extract data from the most relevant view for custom visualization
    const bestMatch = discoveryResult.results[0];
    let relevantDatasets: any[] = [];

    if (bestMatch) {
      console.log(`📊 Extracting data from best match: "${bestMatch.name}" (relevance: ${Math.round(bestMatch.relevanceScore * 100)}%)`);

      try {
        const viewData = await tableauService.getViewData(bestMatch.id);
        console.log(`✅ Extracted ${viewData.totalRowCount} rows with ${viewData.columns.length} columns`);

        // Convert to dataset format for analysis and custom visualization
        const extractedDataset = {
          id: bestMatch.id,
          name: `${bestMatch.workbookName} - ${bestMatch.name}`,
          type: 'tableau_view' as const,
          summary: bestMatch.description || `Data from ${bestMatch.name} visualization`,
          columns: viewData.columns,
          rowCount: viewData.totalRowCount,
          sampleRows: viewData.data.slice(0, 100), // First 100 rows for analysis
          source: 'tableau',
          metadata: {
            workbookName: bestMatch.workbookName,
            viewId: bestMatch.id,
            relevanceScore: bestMatch.relevanceScore,
          },
        };

        relevantDatasets = [extractedDataset];
        console.log(`📊 Prepared dataset for custom visualization: ${extractedDataset.name}`);
      } catch (error: any) {
        console.error(`❌ Failed to extract data from view: ${error.message}`);
        console.log(`ℹ️  Will show Tableau dashboards instead of custom visualizations`);
      }
    }

    // Format Tableau views for the response (exclude workbooks, only include actual views)
    const tableauViews = discoveryResult.results
      .filter((result) => result.type !== 'workbook')
      .map((result) => {
      const view: any = {
        id: result.id,
        name: result.name,
        type: result.type,
        description: result.description,
        relevanceScore: result.relevanceScore,
      };

      // Only add optional properties if they exist
      if (result.workbookName) view.workbookName = result.workbookName;
      if (result.workbookId) view.workbookId = result.workbookId;
      if (result.projectName) view.projectName = result.projectName;

      // Construct proper embed URL for views (not workbooks)
      if (result.type !== 'workbook' && result.embedUrl && result.workbookName) {
        // Tableau URLs need proper encoding
        // Extract workbook and view names from the embedUrl
        let workbookName = result.workbookName;
        let viewName = '';

        if (result.embedUrl.includes('/sheets/')) {
          // Format: "WorkbookName/sheets/ViewName"
          const parts = result.embedUrl.split('/sheets/');
          if (parts.length === 2 && parts[1]) {
            viewName = parts[1];
          }
        } else if (result.embedUrl.includes('/')) {
          // Format: "WorkbookName/ViewName"
          const parts = result.embedUrl.split('/');
          if (parts.length === 2 && parts[1]) {
            viewName = parts[1];
          }
        } else {
          // Just the view name
          viewName = result.embedUrl;
        }

        // DO NOT URL encode - tableau-viz component handles encoding internally
        // Just use raw names with spaces
        const embedPath = `${workbookName}/${viewName}`;

        console.log(`🔗 Building embed URL: workbook="${workbookName}", view="${viewName}" → "${embedPath}"`);

        view.embedUrl = embedPath;
        view.fullEmbedUrl = `https://10ax.online.tableau.com/t/shalwinspace/views/${embedPath}`;
      }

      return view;
    });

    // Add insights about the discovered visualizations
    const insights = [
      ...(state.insights || []),
      {
        type: 'summary' as const,
        title: 'Tableau Visualizations Found',
        content: discoveryResult.summary,
        confidence: 0.9,
      },
    ];

    // If we have a specific recommendation, add it
    if (discoveryResult.suggestedVisualization) {
      insights.push({
        type: 'summary' as const,
        title: 'Recommended Visualization',
        content: `💡 Recommended: "${discoveryResult.suggestedVisualization}" - This visualization best matches your query.`,
        confidence: 0.95,
      });
    }

    // If we extracted data, route to retriever for custom visualization
    // Otherwise just show Tableau dashboards
    const nextAgent = relevantDatasets.length > 0 ? 'retriever' : 'summarizer';

    console.log(`➡️  Routing to: ${nextAgent} (${relevantDatasets.length > 0 ? 'with extracted data for custom viz' : 'dashboards only'})`);

    const result: Partial<AgentState> = {
      insights,
      nextAgent,
    };

    if (relevantDatasets.length > 0) {
      // Route to retriever with extracted data for custom visualization
      result.relevantDatasets = relevantDatasets;
    } else {
      // No data extraction - show Tableau dashboards
      result.tableauViews = tableauViews;
    }

    return result;
  } catch (error: any) {
    console.error('❌ Tableau Agent error:', error);

    // Check if it's an authentication error
    if (error.message.includes('Not authenticated')) {
      return {
        insights: [
          ...(state.insights || []),
          {
            type: 'summary' as const,
            title: 'Tableau Authentication Required',
            content: '⚠️ Tableau is not authenticated. Please connect to Tableau Cloud first.',
            confidence: 1.0,
          },
        ],
        nextAgent: 'summarizer',
      };
    }

    return {
      error: `Tableau discovery failed: ${error.message}`,
      nextAgent: 'summarizer',
    };
  }
}

/**
 * Check if query is Tableau-related
 */
export function isTableauQuery(query: string): boolean {
  const tableauKeywords = [
    'dashboard',
    'visualization',
    'viz',
    'tableau',
    'chart',
    'graph',
    'report',
    'workbook',
    'view',
    'show me',
    'display',
    'visualize',
    'plot',
  ];

  const queryLower = query.toLowerCase();
  return tableauKeywords.some((keyword) => queryLower.includes(keyword));
}
