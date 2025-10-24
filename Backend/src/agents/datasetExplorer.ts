import { llm } from '../config/llm.js';
import { detectNumericColumns, detectCategoricalColumns, detectDateColumns } from '../utils/dataAggregation.js';

export interface ColumnStatistics {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  min?: number | string;
  max?: number | string;
  sampleValues?: any[];
}

export interface DatasetOverview {
  totalRows: number;
  totalColumns: number;
  dataTypes: {
    numeric: number;
    categorical: number;
    date: number;
    other: number;
  };
  dataQuality: {
    missingValuesPercent: number;
    duplicateRowsCount: number;
    completenessScore: number;
  };
  columnStatistics: ColumnStatistics[];
}

/**
 * Dataset Explorer Agent - Analyzes dataset schema and generates statistics
 */
export async function datasetExplorerAgent(
  datasetInfo: any,
  sampleData: any[]
): Promise<DatasetOverview> {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     DATASET EXPLORER AGENT START       ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('🔍 Exploring dataset:', datasetInfo.name);
  console.log('   Sample size:', sampleData.length);

  try {
    const columns = datasetInfo.columns || [];

    // Detect column types
    const numericColumns = sampleData.length > 0 ? detectNumericColumns(sampleData, columns) : [];
    const categoricalColumns = sampleData.length > 0 ? detectCategoricalColumns(sampleData, columns) : [];
    const dateColumns = sampleData.length > 0 ? detectDateColumns(sampleData, columns) : [];

    console.log(`   📊 Numeric columns: ${numericColumns.length}`);
    console.log(`   🏷️  Categorical columns: ${categoricalColumns.length}`);
    console.log(`   📅 Date columns: ${dateColumns.length}`);

    // Calculate column statistics
    const columnStatistics: ColumnStatistics[] = columns.map((colName: string) => {
      const values = sampleData.map(row => row[colName]).filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(values);
      const nullCount = sampleData.length - values.length;

      let type: 'string' | 'number' | 'date' | 'boolean' = 'string';
      if (numericColumns.includes(colName)) type = 'number';
      else if (dateColumns.includes(colName)) type = 'date';
      else if (categoricalColumns.includes(colName)) type = 'string';

      const stats: ColumnStatistics = {
        name: colName,
        type,
        nullCount,
        uniqueCount: uniqueValues.size,
        sampleValues: Array.from(uniqueValues).slice(0, 5),
      };

      // Calculate numeric statistics
      if (type === 'number') {
        const numericValues = values.map(Number).filter(v => !isNaN(v));
        if (numericValues.length > 0) {
          stats.mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          stats.min = Math.min(...numericValues);
          stats.max = Math.max(...numericValues);

          // Calculate median
          const sorted = [...numericValues].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          const midValPrev = sorted[mid - 1];
          const midVal = sorted[mid];
          if (midValPrev !== undefined && midVal !== undefined) {
            stats.median = sorted.length % 2 === 0
              ? (midValPrev + midVal) / 2
              : midVal;
          }
        }
      }

      // For date/string columns, get min/max
      if (type === 'date' || type === 'string') {
        if (values.length > 0) {
          const sorted = [...values].sort();
          stats.min = sorted[0];
          stats.max = sorted[sorted.length - 1];
        }
      }

      return stats;
    });

    // Calculate data quality metrics
    const totalCells = sampleData.length * columns.length;
    const missingCells = columnStatistics.reduce((sum, col) => sum + col.nullCount, 0);
    const missingValuesPercent = totalCells > 0 ? (missingCells / totalCells) * 100 : 0;

    // Simple duplicate detection (comparing first 10 rows)
    const sampleForDupes = sampleData.slice(0, Math.min(100, sampleData.length));
    const uniqueRows = new Set(sampleForDupes.map(row => JSON.stringify(row)));
    const duplicateRowsCount = sampleForDupes.length - uniqueRows.size;

    const completenessScore = Math.max(0, Math.min(100, 100 - missingValuesPercent));

    const overview: DatasetOverview = {
      totalRows: datasetInfo.rowCount || sampleData.length,
      totalColumns: columns.length,
      dataTypes: {
        numeric: numericColumns.length,
        categorical: categoricalColumns.length,
        date: dateColumns.length,
        other: columns.length - numericColumns.length - categoricalColumns.length - dateColumns.length,
      },
      dataQuality: {
        missingValuesPercent: parseFloat(missingValuesPercent.toFixed(2)),
        duplicateRowsCount,
        completenessScore: parseFloat(completenessScore.toFixed(1)),
      },
      columnStatistics,
    };

    console.log('✅ Dataset Explorer Complete!');
    console.log(`   Total Rows: ${overview.totalRows.toLocaleString()}`);
    console.log(`   Total Columns: ${overview.totalColumns}`);
    console.log(`   Data Quality: ${overview.dataQuality.completenessScore}%`);
    console.log('╚════════════════════════════════════════╝\n');

    return overview;
  } catch (error) {
    console.error('❌ Dataset Explorer error:', error);
    console.error('Stack:', (error as Error).stack);
    console.log('╚════════════════════════════════════════╝\n');

    // Return minimal fallback
    return {
      totalRows: datasetInfo.rowCount || 0,
      totalColumns: datasetInfo.columns?.length || 0,
      dataTypes: {
        numeric: 0,
        categorical: 0,
        date: 0,
        other: 0,
      },
      dataQuality: {
        missingValuesPercent: 0,
        duplicateRowsCount: 0,
        completenessScore: 100,
      },
      columnStatistics: [],
    };
  }
}
