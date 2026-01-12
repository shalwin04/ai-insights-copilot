import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { embeddings } from '../config/llm.js';
import { tableauService } from '../services/tableau.js';
import type { TableauWorkbook, TableauView } from '../types/tableau.js';

/**
 * Tableau Discovery Agent
 *
 * This agent helps users discover relevant Tableau content by:
 * - Semantically searching workbooks, dashboards, and sheets
 * - Understanding user intent and matching it to Tableau content
 * - Recommending the most relevant visualizations
 */

export interface TableauDiscoveryResult {
  type: 'workbook' | 'dashboard' | 'sheet' | 'view';
  id: string;
  name: string;
  description: string;
  relevanceScore: number;
  workbookName?: string | undefined;
  workbookId?: string | undefined;
  projectName?: string | undefined;
  embedUrl?: string | undefined;
  reasoning?: string | undefined;
}

export interface TableauContentIndex {
  id: string;
  name: string;
  type: 'workbook' | 'dashboard' | 'sheet' | 'view';
  description: string;
  keywords: string[];
  workbookName?: string | undefined;
  workbookId?: string | undefined;
  projectName?: string | undefined;
  embedding?: number[] | undefined;
  metadata: any;
}

/**
 * Build searchable index of all Tableau content
 */
export async function buildTableauIndex(): Promise<TableauContentIndex[]> {
  const workbooks = await tableauService.listWorkbooks();
  const index: TableauContentIndex[] = [];

  for (const workbook of workbooks) {
    // Index workbook
    const workbookDescription = `${workbook.name} workbook in ${workbook.project?.name || 'Default'} project. ` +
      `Contains ${workbook.views?.length || 0} visualizations.`;

    index.push({
      id: workbook.id,
      name: workbook.name,
      type: 'workbook',
      description: workbook.description || workbookDescription,
      keywords: [
        workbook.name,
        workbook.project?.name || 'Default',
        'workbook',
        'tableau',
      ],
      projectName: workbook.project?.name,
      metadata: {
        contentUrl: workbook.contentUrl,
        webpageUrl: workbook.webpageUrl,
        createdAt: workbook.createdAt,
        updatedAt: workbook.updatedAt,
      },
    });

    // Get views for this workbook
    try {
      const views = await tableauService.getWorkbookViews(workbook.id);

      for (const view of views) {
        const viewDescription = `${view.name} visualization in ${workbook.name}. ` +
          `Type: ${view.viewUrlName.includes('dashboard') ? 'dashboard' : 'sheet'}.`;

        index.push({
          id: view.id,
          name: view.name,
          type: view.viewUrlName.includes('dashboard') ? 'dashboard' : 'sheet',
          description: viewDescription,
          keywords: [
            view.name,
            workbook.name,
            workbook.project?.name || 'Default',
            view.viewUrlName.includes('dashboard') ? 'dashboard' : 'sheet',
            'visualization',
            'chart',
          ],
          workbookName: workbook.name,
          workbookId: workbook.id,
          projectName: workbook.project?.name,
          metadata: {
            contentUrl: view.contentUrl,
            viewUrlName: view.viewUrlName,
            workbookId: workbook.id,
          },
        });
      }
    } catch (error) {
      console.error(`Failed to get views for workbook ${workbook.name}:`, error);
    }
  }

  return index;
}

/**
 * Generate embeddings for Tableau content index
 */
export async function generateTableauEmbeddings(
  index: TableauContentIndex[]
): Promise<TableauContentIndex[]> {
  console.log(`🧠 Generating embeddings for ${index.length} Tableau items...`);

  // Prepare documents for embedding
  const documents = index.map((item) => {
    const keywords = item.keywords.join(', ');
    return `${item.type}: ${item.name}. ${item.description}. Keywords: ${keywords}`;
  });

  // Generate embeddings in batches
  const batchSize = 50;
  const indexWithEmbeddings: TableauContentIndex[] = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const batchEmbeddings = await embeddings.embedDocuments(batch);

    for (let j = 0; j < batch.length; j++) {
      const item = index[i + j];
      if (item) {
        indexWithEmbeddings.push({
          id: item.id,
          name: item.name,
          type: item.type,
          description: item.description,
          keywords: item.keywords,
          workbookName: item.workbookName,
          workbookId: item.workbookId,
          projectName: item.projectName,
          metadata: item.metadata,
          embedding: batchEmbeddings[j],
        });
      }
    }

    console.log(`   Processed ${Math.min(i + batchSize, documents.length)}/${documents.length}`);
  }

  console.log('✅ Embeddings generated');
  return indexWithEmbeddings;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] || 0;
    const bVal = b[i] || 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Search Tableau content using semantic similarity
 */
export async function semanticSearchTableau(
  query: string,
  index: TableauContentIndex[],
  limit: number = 5
): Promise<TableauDiscoveryResult[]> {
  // Generate query embedding
  const queryEmbedding = await embeddings.embedQuery(query);

  // Calculate similarities
  const results = index
    .filter((item) => item.embedding)
    .map((item) => ({
      ...item,
      relevanceScore: cosineSimilarity(queryEmbedding, item.embedding!),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  // Convert to discovery results
  return results.map((item) => ({
    type: item.type,
    id: item.id,
    name: item.name,
    description: item.description,
    relevanceScore: item.relevanceScore,
    workbookName: item.workbookName || undefined,
    workbookId: item.workbookId || undefined,
    projectName: item.projectName || undefined,
    // Use contentUrl which has format "WorkbookName/sheets/ViewName"
    embedUrl: item.metadata.contentUrl || item.metadata.viewUrlName || undefined,
  }));
}

/**
 * Tableau Discovery Agent - Find relevant visualizations
 */
export async function tableauDiscoveryAgent(
  userQuery: string,
  tableauIndex: TableauContentIndex[]
): Promise<{
  results: TableauDiscoveryResult[];
  summary: string;
  suggestedVisualization?: string | undefined;
}> {
  try {
    console.log(`🔍 Tableau Discovery Agent searching for: "${userQuery}"`);

    // Step 1: Semantic search
    const semanticResults = await semanticSearchTableau(userQuery, tableauIndex, 10);

    if (semanticResults.length === 0) {
      return {
        results: [],
        summary: 'No relevant Tableau visualizations found for your query.',
      };
    }

    // Step 2: Use LLM to refine and explain results
    const model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
      temperature: 0.3,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a Tableau expert assistant helping users discover relevant visualizations.

Your task:
1. Analyze the user's query and the matching Tableau content
2. Identify the most relevant visualization(s)
3. Provide a brief, helpful summary
4. Suggest which specific visualization best answers their question

Be concise and actionable. Focus on helping the user find exactly what they need.`,
      ],
      [
        'user',
        `User Query: {query}

Matching Tableau Content:
{matches}

Provide:
1. A brief summary (2-3 sentences) of what visualizations were found
2. Which specific visualization you recommend (by name)
3. Why it's the best match`,
      ],
    ]);

    const matches = semanticResults
      .slice(0, 5)
      .map(
        (r, i) =>
          `${i + 1}. [${r.type.toUpperCase()}] ${r.name}
   - Workbook: ${r.workbookName || 'N/A'}
   - Project: ${r.projectName || 'Default'}
   - Description: ${r.description}
   - Relevance: ${(r.relevanceScore * 100).toFixed(1)}%`
      )
      .join('\n\n');

    const chain = prompt.pipe(model).pipe(new StringOutputParser());

    const analysis = await chain.invoke({
      query: userQuery,
      matches,
    });

    console.log('✅ Discovery completed');

    return {
      results: semanticResults.slice(0, 5),
      summary: analysis,
      suggestedVisualization: semanticResults[0]?.name || undefined,
    };
  } catch (error: any) {
    console.error('❌ Tableau Discovery Agent error:', error);
    throw new Error(`Discovery failed: ${error.message}`);
  }
}

/**
 * Quick keyword-based search (fallback when embeddings not available)
 */
export function keywordSearchTableau(
  query: string,
  index: TableauContentIndex[],
  limit: number = 5
): TableauDiscoveryResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/);

  const results = index
    .map((item) => {
      const searchText = `${item.name} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();

      // Calculate simple relevance score
      let score = 0;

      // Exact name match - highest score
      if (item.name.toLowerCase() === queryLower) {
        score += 100;
      }

      // Name contains query - high score
      if (item.name.toLowerCase().includes(queryLower)) {
        score += 50;
      }

      // Count matching keywords
      queryWords.forEach((word) => {
        if (searchText.includes(word)) {
          score += 10;
        }
      });

      return {
        type: item.type,
        id: item.id,
        name: item.name,
        description: item.description,
        relevanceScore: score / 100,
        workbookName: item.workbookName || undefined,
        workbookId: item.workbookId || undefined,
        projectName: item.projectName || undefined,
        // Use contentUrl which has format "WorkbookName/sheets/ViewName"
        embedUrl: item.metadata.contentUrl || item.metadata.viewUrlName || undefined,
      };
    })
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, limit);

  return results;
}
