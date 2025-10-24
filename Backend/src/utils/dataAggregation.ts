/**
 * Data aggregation utilities for generating visualizations
 */

export interface AggregationConfig {
  groupBy: string;
  aggregateBy: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max';
  limit?: number;
}

export interface AggregatedResult {
  name: string;
  value: number;
}

/**
 * Aggregate tabular data based on configuration
 */
export function aggregateData(
  data: any[],
  config: AggregationConfig
): AggregatedResult[] {
  if (!data || data.length === 0) {
    return [];
  }

  const { groupBy, aggregateBy, operation, limit = 15 } = config;

  // Group data by the specified column
  const groups = new Map<string, any[]>();

  data.forEach(row => {
    const key = String(row[groupBy] || 'Unknown');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

  // Perform aggregation operation
  const results: AggregatedResult[] = [];

  groups.forEach((groupRows, groupKey) => {
    let value: number;

    switch (operation) {
      case 'count':
        value = groupRows.length;
        break;

      case 'sum':
        value = groupRows.reduce((sum, row) => {
          const val = parseFloat(row[aggregateBy]);
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        break;

      case 'avg':
        const sum = groupRows.reduce((sum, row) => {
          const val = parseFloat(row[aggregateBy]);
          return sum + (isNaN(val) ? 0 : val);
        }, 0);
        value = sum / groupRows.length;
        break;

      case 'min':
        value = Math.min(...groupRows.map(row => {
          const val = parseFloat(row[aggregateBy]);
          return isNaN(val) ? Infinity : val;
        }));
        break;

      case 'max':
        value = Math.max(...groupRows.map(row => {
          const val = parseFloat(row[aggregateBy]);
          return isNaN(val) ? -Infinity : val;
        }));
        break;

      default:
        value = 0;
    }

    results.push({
      name: groupKey,
      value: Math.round(value * 100) / 100, // Round to 2 decimal places
    });
  });

  // Sort by value descending and limit results
  return results
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/**
 * Detect numeric columns in a dataset
 */
export function detectNumericColumns(data: any[], columns: string[]): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const sampleRow = data[0];
  return columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'number' || !isNaN(parseFloat(value));
  });
}

/**
 * Detect categorical columns in a dataset
 */
export function detectCategoricalColumns(data: any[], columns: string[]): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const numericCols = new Set(detectNumericColumns(data, columns));
  return columns.filter(col => !numericCols.has(col));
}

/**
 * Detect date/time columns in a dataset
 */
export function detectDateColumns(data: any[], columns: string[]): string[] {
  if (!data || data.length === 0) {
    return [];
  }

  const sampleRow = data[0];
  return columns.filter(col => {
    const value = sampleRow[col];
    if (typeof value === 'string') {
      // Check if it looks like a date
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}/, // YYYY-MM-DD
        /^\d{2}\/\d{2}\/\d{4}/, // MM/DD/YYYY
        /^\d{2}-\d{2}-\d{4}/, // DD-MM-YYYY
      ];
      return datePatterns.some(pattern => pattern.test(value));
    }
    return false;
  });
}

/**
 * Get top N values from a column
 */
export function getTopValues(
  data: any[],
  column: string,
  n: number = 10
): { value: string; count: number }[] {
  const counts = new Map<string, number>();

  data.forEach(row => {
    const value = String(row[column] || 'Unknown');
    counts.set(value, (counts.get(value) || 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}
