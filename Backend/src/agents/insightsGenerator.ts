import { llm } from '../config/llm.js';
import type { AgentState } from '../langgraph/state.js';
import { detectNumericColumns, detectCategoricalColumns, detectDateColumns } from '../utils/dataAggregation.js';

export interface Insight {
  type: 'trend' | 'anomaly' | 'summary' | 'recommendation';
  title: string;
  content: string;
  confidence: number;
}

/**
 * Insights Generator Agent - Generates AI-powered insights from dataset analysis
 */
export async function insightsGeneratorAgent(
  datasetInfo: any,
  sampleData: any[],
  statistics?: any
): Promise<Insight[]> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║    INSIGHTS GENERATOR AGENT START      ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('🔍 Generating insights for dataset:', datasetInfo.name);
  console.log('   Rows analyzed:', sampleData.length);

  try {
    const columns = datasetInfo.columns || [];
    const numericColumns = sampleData.length > 0 ? detectNumericColumns(sampleData, columns) : [];
    const categoricalColumns = sampleData.length > 0 ? detectCategoricalColumns(sampleData, columns) : [];
    const dateColumns = sampleData.length > 0 ? detectDateColumns(sampleData, columns) : [];

    const dataContext = `
Dataset: ${datasetInfo.name}
Type: ${datasetInfo.type}
Total Rows: ${datasetInfo.rowCount || 'Unknown'}
Analyzed Rows: ${sampleData.length}

Columns (${columns.length}):
- Numeric: ${numericColumns.join(', ') || 'none'}
- Categorical: ${categoricalColumns.join(', ') || 'none'}
- Date/Time: ${dateColumns.join(', ') || 'none'}

${statistics ? `Statistics:\n${JSON.stringify(statistics, null, 2)}\n` : ''}

Sample Data (first ${Math.min(10, sampleData.length)} rows):
${JSON.stringify(sampleData.slice(0, 10), null, 2)}
`;

    const prompt = `You are an expert data analyst. Analyze the provided dataset and generate 4 key insights.

Data Context:
${dataContext}

Generate exactly 4 insights covering different aspects:
1. One TREND insight - identify patterns, growth, or changes over time
2. One ANOMALY insight - identify unusual patterns, outliers, or notable observations
3. One SUMMARY insight - provide key statistics or dominant characteristics
4. One RECOMMENDATION insight - suggest actions or opportunities based on the data

Return ONLY a valid JSON array with this exact structure:
[
  {
    "type": "trend",
    "title": "Brief title (max 50 chars)",
    "content": "Detailed insight explanation (2-3 sentences)",
    "confidence": 0.85
  },
  {
    "type": "anomaly",
    "title": "Brief title",
    "content": "Detailed explanation",
    "confidence": 0.82
  },
  {
    "type": "summary",
    "title": "Brief title",
    "content": "Detailed explanation",
    "confidence": 0.95
  },
  {
    "type": "recommendation",
    "title": "Brief title",
    "content": "Actionable recommendation",
    "confidence": 0.80
  }
]

Rules:
- Use actual data from the provided sample
- Confidence should be between 0.7 and 0.99
- Be specific with numbers and percentages
- Make insights actionable and meaningful
- Focus on business value and practical implications

Return ONLY the JSON array, no markdown or explanation.`;

    console.log('🔄 Calling LLM for insights generation...');
    const response = await llm.invoke(prompt);
    let insightsContent = response.content as string;

    // Clean up response
    insightsContent = insightsContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    console.log('📊 Raw LLM response length:', insightsContent.length);

    let insights: Insight[];
    try {
      insights = JSON.parse(insightsContent);

      // Validate insights
      if (!Array.isArray(insights) || insights.length === 0) {
        throw new Error('Insights must be a non-empty array');
      }

      // Ensure all required fields are present
      insights = insights.map(insight => ({
        type: insight.type || 'summary',
        title: insight.title || 'Insight',
        content: insight.content || '',
        confidence: Math.min(0.99, Math.max(0.7, insight.confidence || 0.85))
      }));

      console.log('✅ Insights Generator: Generated', insights.length, 'insights');
      insights.forEach((insight, i) => {
        console.log(`   ${i + 1}. [${insight.type}] ${insight.title}`);
      });
    } catch (parseError) {
      console.error('❌ Failed to parse insights JSON:', parseError);
      console.error('Response was:', insightsContent);

      // Fallback: generate basic insights
      insights = [
        {
          type: 'summary',
          title: 'Dataset Overview',
          content: `This dataset contains ${datasetInfo.rowCount || 'multiple'} records with ${columns.length} columns. ` +
                   `Analysis includes ${numericColumns.length} numeric and ${categoricalColumns.length} categorical fields.`,
          confidence: 0.90
        },
        {
          type: 'trend',
          title: 'Data Distribution',
          content: 'The dataset shows a diverse distribution across multiple dimensions, ' +
                   'providing comprehensive coverage for analysis.',
          confidence: 0.75
        },
        {
          type: 'recommendation',
          title: 'Further Analysis',
          content: 'Consider performing deeper analysis on numeric trends and categorical breakdowns ' +
                   'to uncover more specific patterns.',
          confidence: 0.80
        }
      ];

      console.log('⚠️  Using fallback insights');
    }

    console.log('✅ Insights Generator Complete!');
    console.log('╚════════════════════════════════════════╝\n');

    return insights;
  } catch (error) {
    console.error('❌ Insights Generator error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');

    // Return basic fallback insights
    return [
      {
        type: 'summary',
        title: 'Dataset Available',
        content: `Dataset "${datasetInfo.name}" is ready for analysis with ${datasetInfo.rowCount || 'multiple'} records.`,
        confidence: 0.85
      }
    ];
  }
}
