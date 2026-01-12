import fs from 'fs';
import csv from 'csv-parser';
import { embeddings } from '../config/llm.js';

export interface ParsedCSVData {
  columns: string[];
  rows: any[];
  rowCount: number;
}

export interface TableauDataset {
  id: string;
  name: string;
  type: 'tableau_csv';
  summary: string;
  columns: string[];
  rowCount: number;
  sampleRows: any[];
  source: 'tableau_upload';
  uploadedAt: string;
  filePath: string;
}

/**
 * Parse CSV file
 */
export async function parseCSV(filePath: string): Promise<ParsedCSVData> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    let columns: string[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('headers', (headers: string[]) => {
        columns = headers;
      })
      .on('data', (row: any) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve({
          columns,
          rows,
          rowCount: rows.length,
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Generate summary of CSV data using AI
 */
async function generateDatasetSummary(
  filename: string,
  columns: string[],
  sampleRows: any[]
): Promise<string> {
  try {
    // Create a simple summary based on filename and columns
    const columnList = columns.slice(0, 10).join(', ');
    const moreColumns = columns.length > 10 ? ` and ${columns.length - 10} more` : '';

    return `Dataset from ${filename} with ${columns.length} columns including: ${columnList}${moreColumns}. Contains ${sampleRows.length} sample rows of data.`;
  } catch (error) {
    console.error('Failed to generate summary:', error);
    return `Dataset from ${filename} with ${columns.length} columns`;
  }
}

/**
 * Process Tableau CSV file for use in the system
 */
export async function processTableauCSV(
  filePath: string,
  originalName: string
): Promise<TableauDataset> {
  console.log('📊 Processing Tableau CSV:', originalName);

  // Parse CSV
  const parsedData = await parseCSV(filePath);
  console.log(`   Parsed ${parsedData.rowCount} rows, ${parsedData.columns.length} columns`);

  // Generate summary
  const summary = await generateDatasetSummary(
    originalName,
    parsedData.columns,
    parsedData.rows.slice(0, 5)
  );

  // Create dataset object
  const dataset: TableauDataset = {
    id: `tableau_csv_${Date.now()}`,
    name: originalName.replace('.csv', ''),
    type: 'tableau_csv',
    summary,
    columns: parsedData.columns,
    rowCount: parsedData.rowCount,
    sampleRows: parsedData.rows.slice(0, 100), // Store first 100 rows
    source: 'tableau_upload',
    uploadedAt: new Date().toISOString(),
    filePath,
  };

  // Store in global registry (in production, use database)
  if (!global.uploadedDatasets) {
    global.uploadedDatasets = new Map();
  }
  global.uploadedDatasets.set(dataset.id, {
    ...dataset,
    allRows: parsedData.rows, // Keep all rows in memory
  });

  console.log('✅ Dataset processed and stored');
  console.log(`   ID: ${dataset.id}`);
  console.log(`   Name: ${dataset.name}`);

  return dataset;
}

/**
 * Get all uploaded datasets
 */
export function getUploadedDatasets(): TableauDataset[] {
  if (!global.uploadedDatasets) {
    return [];
  }

  return Array.from(global.uploadedDatasets.values()).map((ds: any) => ({
    id: ds.id,
    name: ds.name,
    type: ds.type,
    summary: ds.summary,
    columns: ds.columns,
    rowCount: ds.rowCount,
    sampleRows: ds.sampleRows,
    source: ds.source,
    uploadedAt: ds.uploadedAt,
    filePath: ds.filePath,
  }));
}

/**
 * Get dataset by ID with all rows
 */
export function getDatasetById(id: string): any {
  if (!global.uploadedDatasets) {
    return null;
  }
  return global.uploadedDatasets.get(id);
}

/**
 * Search for relevant datasets based on query
 */
export function searchUploadedDatasets(query: string): TableauDataset[] {
  const datasets = getUploadedDatasets();
  const queryLower = query.toLowerCase();

  // Simple keyword matching
  return datasets.filter((dataset) => {
    const searchText = `${dataset.name} ${dataset.summary} ${dataset.columns.join(' ')}`.toLowerCase();
    return searchText.includes(queryLower) ||
           queryLower.split(' ').some(word => searchText.includes(word));
  });
}

// Global type declaration
declare global {
  var uploadedDatasets: Map<string, any>;
}
