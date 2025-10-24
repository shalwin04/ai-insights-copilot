import { llm } from '../config/llm.js';
import type { AgentState } from '../langgraph/state.js';
import { detectNumericColumns, detectCategoricalColumns, detectDateColumns } from '../utils/dataAggregation.js';

/**
 * Visualizer Agent - Generates visualization configurations based on data analysis
 */
export async function visualizerAgent(state: AgentState): Promise<Partial<AgentState>> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║      VISUALIZER AGENT START            ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('📊 Input State:');
  console.log('   - Query:', state.userQuery);
  console.log('   - Datasets:', state.relevantDatasets?.length || 0);
  console.log('   - Has Analysis:', !!state.analysisResults);
  console.log('');

  try {
    const { userQuery, relevantDatasets, analysisResults } = state;

    if (!relevantDatasets || relevantDatasets.length === 0) {
      return {
        error: 'No datasets available for visualization',
        nextAgent: 'summarizer',
      };
    }

    // Get the first dataset with sample data
    const dataset = relevantDatasets[0];

    if (!dataset) {
      return {
        error: 'Dataset not found',
        nextAgent: 'summarizer',
      };
    }

    // Use aggregatedData if available, otherwise fall back to sampleRows
    const dataForVisualization = (dataset as any).aggregatedData || (dataset as any).sampleRows || [];
    const dataPointsAvailable = dataForVisualization.length;

    console.log(`   📊 Data points available for visualization: ${dataPointsAvailable}`);

    // Detect column types to help with visualization selection
    const columns = dataset.columns || [];
    const numericColumns = dataForVisualization.length > 0 ? detectNumericColumns(dataForVisualization, columns) : [];
    const categoricalColumns = dataForVisualization.length > 0 ? detectCategoricalColumns(dataForVisualization, columns) : [];
    const dateColumns = dataForVisualization.length > 0 ? detectDateColumns(dataForVisualization, columns) : [];

    console.log(`   📈 Numeric columns: ${numericColumns.join(', ') || 'none'}`);
    console.log(`   🏷️  Categorical columns: ${categoricalColumns.join(', ') || 'none'}`);
    console.log(`   📅 Date columns: ${dateColumns.join(', ') || 'none'}`);

    // Build context about the data
    const dataContext = `
Dataset: ${dataset.name}
Type: ${dataset.type}
Total Rows in Dataset: ${dataset.rowCount || 'Unknown'}
Available Data Rows: ${dataPointsAvailable}

Columns (${columns.length}):
- Numeric: ${numericColumns.join(', ') || 'none'}
- Categorical: ${categoricalColumns.join(', ') || 'none'}
- Date/Time: ${dateColumns.join(', ') || 'none'}

${(dataset as any).statistics ? `Column Statistics:\n${JSON.stringify((dataset as any).statistics, null, 2)}\n` : ''}

${analysisResults ? `Analysis Plan:\n${typeof analysisResults === 'string' ? analysisResults : JSON.stringify(analysisResults)}\n` : ''}

ACTUAL DATA (${dataPointsAvailable} rows):
${JSON.stringify(dataForVisualization, null, 2)}
`;

    const prompt = `You are a data visualization expert. Based on the user's query and dataset, generate a visualization configuration.

User Query: "${userQuery}"

Data Context:
${dataContext}

IMPORTANT: You have access to ${dataPointsAvailable} rows of ACTUAL DATA from the dataset. Use this real data to create meaningful visualizations.

Generate a JSON visualization config with this structure:

For BAR, LINE, PIE charts:
{
  "type": "bar" | "line" | "pie",
  "title": "Chart Title",
  "xAxis": "column_name_for_x_axis",
  "yAxis": "column_name_for_y_axis",
  "data": [
    { "name": "category", "value": actual_number }
  ],
  "description": "What this visualization shows"
}

For SCATTER charts:
{
  "type": "scatter",
  "title": "Chart Title",
  "xAxis": "column_name_for_x_axis",
  "yAxis": "column_name_for_y_axis",
  "data": [
    { "x": actual_x_value, "y": actual_y_value, "name": "optional_label" }
  ],
  "description": "What this visualization shows"
}

Rules:
1. MUST use the actual data provided above - do NOT invent mock data
2. Choose the most appropriate chart type for the query and data
3. Use actual column names from the dataset columns
4. Aggregate or summarize the data intelligently based on the query
5. For time-series: use line charts with date/time on x-axis
6. For categorical comparisons: use bar charts with categories
7. For proportions: use pie charts with percentage breakdowns
8. For correlations/relationships: use scatter plots with x,y coordinates
9. Include meaningful aggregations (sum, average, count, etc.) when appropriate
10. Limit visualization to 10-20 most relevant data points if dataset is large
11. For scatter plots, sample data evenly across the range to show the pattern

Examples of good aggregations:
- Revenue by Region: use bar chart with Sum revenue grouped by region
- Sales over Time: use line chart with Sum/count sales grouped by date/month
- Product Performance: use bar chart comparing metrics across top products
- Customer Segments: use pie chart with Count or sum by segment
- Discount vs Profit: use scatter plot with discount on x-axis and profit on y-axis

Return ONLY valid JSON, no markdown or explanation.`;

    console.log('🔄 Calling LLM for visualization generation...');
    const response = await llm.invoke(prompt);
    let vizContent = response.content as string;

    // Clean up response - remove markdown code blocks if present
    vizContent = vizContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    console.log('📊 Raw LLM response:', vizContent.substring(0, 200));

    // Try to parse the visualization config
    let visualization;
    try {
      // Try to fix common JSON issues before parsing
      let cleanedContent = vizContent
        .replace(/{\s*name"/g, '{ "name"')  // Fix missing opening quote: {name" -> { "name"
        .replace(/,\s*{name"/g, ', {"name"') // Fix in arrays: ,{name" -> ,{"name"
        .replace(/"\s*:\s*"([^"]*)"(?=[,}])/g, '": "$1"') // Ensure proper quote closure
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']'); // Remove trailing commas before ]

      visualization = JSON.parse(cleanedContent);
      console.log('✅ Visualizer: Visualization config generated');
      console.log('   Type:', visualization.type);
      console.log('   Title:', visualization.title);
      console.log('   Data points:', visualization.data?.length || 0);
    } catch (parseError) {
      console.error('❌ Failed to parse visualization JSON:', parseError);
      console.error('Response was:', vizContent);

      // Try one more time with more aggressive cleaning
      try {
        // Extract just the data array and reconstruct
        const dataMatch = vizContent.match(/"data"\s*:\s*\[([\s\S]*?)\]/);
        const titleMatch = vizContent.match(/"title"\s*:\s*"([^"]+)"/);
        const typeMatch = vizContent.match(/"type"\s*:\s*"([^"]+)"/);
        const descMatch = vizContent.match(/"description"\s*:\s*"([^"]+)"/);
        const xAxisMatch = vizContent.match(/"xAxis"\s*:\s*"([^"]+)"/);
        const yAxisMatch = vizContent.match(/"yAxis"\s*:\s*"([^"]+)"/);

        if (dataMatch && dataMatch[1] && titleMatch && typeMatch) {
          const dataStr = dataMatch[1];
          const vizType = typeMatch[1];
          let data: any[] = [];

          // Check if it's a scatter plot (has x,y format)
          if (vizType === 'scatter') {
            // Try to extract x,y pairs
            const scatterEntries = dataStr.match(/\{\s*"?x"?\s*:\s*([0-9.-]+)\s*,\s*"?y"?\s*:\s*([0-9.-]+)[^}]*\}/g);

            if (scatterEntries) {
              data = scatterEntries.map(entry => {
                const xMatch = entry.match(/"?x"?\s*:\s*([0-9.-]+)/);
                const yMatch = entry.match(/"?y"?\s*:\s*([0-9.-]+)/);
                const nameMatch = entry.match(/"?name"?\s*:\s*"([^"]+)"/);
                return {
                  x: xMatch && xMatch[1] ? parseFloat(xMatch[1]) : 0,
                  y: yMatch && yMatch[1] ? parseFloat(yMatch[1]) : 0,
                  name: nameMatch && nameMatch[1] ? nameMatch[1] : undefined
                };
              });
            }
          } else {
            // Extract name-value pairs for other chart types
            const entries = dataStr.match(/\{\s*"?name"?\s*:\s*"([^"]+)"\s*,\s*"?value"?\s*:\s*([0-9.-]+)\s*\}/g);

            if (entries) {
              data = entries.map(entry => {
                const nameMatch = entry.match(/"?name"?\s*:\s*"([^"]+)"/);
                const valueMatch = entry.match(/"?value"?\s*:\s*([0-9.-]+)/);
                return {
                  name: nameMatch && nameMatch[1] ? nameMatch[1] : 'Unknown',
                  value: valueMatch && valueMatch[1] ? parseFloat(valueMatch[1]) : 0
                };
              });
            }
          }

          visualization = {
            type: vizType as any,
            title: titleMatch[1],
            description: descMatch ? descMatch[1] : undefined,
            xAxis: xAxisMatch ? xAxisMatch[1] : undefined,
            yAxis: yAxisMatch ? yAxisMatch[1] : undefined,
            data
          };

          console.log('✅ Recovered visualization via regex extraction');
          console.log('   Type:', vizType);
          console.log('   Data points:', data.length);
        } else {
          throw new Error('Could not extract visualization data');
        }
      } catch (fallbackError) {
        console.error('❌ Fallback parsing also failed:', fallbackError);

        // Final fallback: create a simple default visualization
        visualization = {
          type: 'bar',
          title: 'Data Overview',
          description: 'Unable to generate custom visualization',
          data: [],
        };
      }
    }

    console.log('✅ Visualizer Complete!');
    console.log('╚════════════════════════════════════════╝\n');

    return {
      visualization,
      nextAgent: 'summarizer', // Always go to summarizer after visualization
      metadata: {
        ...state.metadata,
        hasVisualization: true,
      },
    };
  } catch (error) {
    console.error('❌ Visualizer Agent error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');
    return {
      error: `Visualizer agent failed: ${error}`,
      nextAgent: 'summarizer',
    };
  }
}
