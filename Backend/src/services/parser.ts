import Papa from 'papaparse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Use require for pdf-parse since it's a CommonJS module
const pdfParseModule = require('pdf-parse');
const pdfParse = pdfParseModule.default || pdfParseModule;

export interface ParsedData {
  type: 'tabular' | 'text';
  content: any;
  metadata: {
    rowCount?: number;
    columnCount?: number;
    columns?: string[];
    schema?: Record<string, string>;
    textLength?: number;
  };
}

/**
 * Parse CSV file content
 */
export async function parseCSV(buffer: Buffer): Promise<ParsedData> {
  const text = buffer.toString('utf-8');

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const columns = results.meta.fields || [];
        const data = results.data;

        // Infer schema
        const schema: Record<string, string> = {};
        if (data.length > 0 && columns.length > 0) {
          columns.forEach(col => {
            const firstValue = (data[0] as any)[col];
            schema[col] = typeof firstValue;
          });
        }

        resolve({
          type: 'tabular',
          content: data,
          metadata: {
            rowCount: data.length,
            columnCount: columns.length,
            columns,
            schema,
          },
        });
      },
      error: (error: Error) => {
        reject(error);
      },
    });
  });
}

/**
 * Parse Excel file using xlsx package
 */
export async function parseExcel(buffer: Buffer): Promise<ParsedData> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    // Get first sheet
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('No sheets found in Excel file');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    if (!worksheet) {
      throw new Error('Worksheet not found');
    }

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return {
        type: 'tabular',
        content: [],
        metadata: {
          rowCount: 0,
          columnCount: 0,
          columns: [],
          schema: {},
        },
      };
    }

    // Extract columns and schema
    const columns = Object.keys(data[0] as any);
    const schema: Record<string, string> = {};

    columns.forEach(col => {
      const firstValue = (data[0] as any)[col];
      schema[col] = typeof firstValue;
    });

    return {
      type: 'tabular',
      content: data,
      metadata: {
        rowCount: data.length,
        columnCount: columns.length,
        columns,
        schema,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel: ${error}`);
  }
}

/**
 * Parse PDF file
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedData> {
  try {
    const data = await pdfParse(buffer);

    return {
      type: 'text',
      content: data.text,
      metadata: {
        textLength: data.text.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error}`);
  }
}

/**
 * Parse Word document
 */
export async function parseWord(buffer: Buffer): Promise<ParsedData> {
  try {
    const result = await mammoth.extractRawText({ buffer });

    return {
      type: 'text',
      content: result.value,
      metadata: {
        textLength: result.value.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse Word document: ${error}`);
  }
}

/**
 * Parse JSON file
 */
export async function parseJSON(buffer: Buffer): Promise<ParsedData> {
  try {
    const text = buffer.toString('utf-8');
    const data = JSON.parse(text);

    // Check if it's an array of objects (tabular)
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const columns = Object.keys(data[0]);
      const schema: Record<string, string> = {};

      columns.forEach(col => {
        schema[col] = typeof data[0][col];
      });

      return {
        type: 'tabular',
        content: data,
        metadata: {
          rowCount: data.length,
          columnCount: columns.length,
          columns,
          schema,
        },
      };
    }

    // Otherwise, treat as text
    return {
      type: 'text',
      content: JSON.stringify(data, null, 2),
      metadata: {
        textLength: text.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}`);
  }
}

/**
 * Main parser function - routes to appropriate parser based on MIME type
 */
export async function parseFile(buffer: Buffer, mimeType: string): Promise<ParsedData> {
  if (mimeType.includes('csv') || mimeType.includes('text/csv')) {
    return parseCSV(buffer);
  }

  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('xlsx')) {
    return parseExcel(buffer);
  }

  if (mimeType.includes('pdf')) {
    return parsePDF(buffer);
  }

  if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('msword')) {
    return parseWord(buffer);
  }

  if (mimeType.includes('json')) {
    return parseJSON(buffer);
  }

  // Default: treat as text
  return {
    type: 'text',
    content: buffer.toString('utf-8'),
    metadata: {
      textLength: buffer.length,
    },
  };
}

/**
 * Extract sample rows from tabular data
 */
export function extractSample(data: any[], sampleSize: number = 5): any[] {
  return data.slice(0, Math.min(sampleSize, data.length));
}

/**
 * Calculate basic statistics for numeric columns
 */
export function calculateStatistics(data: any[], columns: string[]): Record<string, any> {
  const stats: Record<string, any> = {};

  columns.forEach(col => {
    const values = data.map(row => row[col]).filter(v => typeof v === 'number' && !isNaN(v));

    if (values.length > 0) {
      const sorted = values.sort((a, b) => a - b);
      stats[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        median: sorted[Math.floor(sorted.length / 2)],
        count: values.length,
        nullCount: data.length - values.length,
      };
    }
  });

  return stats;
}
