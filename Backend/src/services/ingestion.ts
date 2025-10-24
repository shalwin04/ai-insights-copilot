import { getDriveInstance } from '../config/googleOAuth.js';
import { esClient, INDICES } from '../config/elasticsearch.js';
import { embeddings } from '../config/llm.js';
import { parseFile, extractSample, calculateStatistics } from './parser.js';

export interface IngestionJob {
  id: string;
  userId: string;
  fileId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

const jobs = new Map<string, IngestionJob>();

/**
 * Download file content from Google Drive
 */
async function downloadFile(accessToken: string, fileId: string, refreshToken?: string, mimeType?: string): Promise<Buffer> {
  console.log(`🔑 Download attempt - has refresh token: ${!!refreshToken}, mimeType: ${mimeType}`);
  const drive = getDriveInstance(accessToken, refreshToken);

  try {
    // For Google Workspace files (Sheets, Docs, Slides), we need to export them
    if (mimeType && (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('document') ||
      mimeType.includes('presentation')
    )) {
      console.log('📄 Exporting Google Workspace file...');
      // Export Google Sheets as Excel
      const exportMimeType = mimeType.includes('spreadsheet')
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : mimeType.includes('document')
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf';

      const response = await drive.files.export(
        { fileId, mimeType: exportMimeType },
        { responseType: 'arraybuffer' }
      ) as any;

      return Buffer.from(response.data);
    }

    // For regular files, download directly
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    ) as any;

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error(`❌ Download failed for fileId ${fileId}:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Has access token: ${!!accessToken}`);
      console.error(`   Has refresh token: ${!!refreshToken}`);
    }
    throw new Error(`Failed to download file: ${error}`);
  }
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddings.embedQuery(text);
    return result;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

/**
 * Create a rich summary of the dataset including sample data
 */
function createDatasetSummary(parsed: any, fileName: string): string {
  if (parsed.type === 'tabular') {
    const { rowCount, columnCount, columns } = parsed.metadata;

    // Extract sample values from first few rows
    const sampleData = extractSample(parsed.content, 3);
    let sampleText = '';

    if (sampleData && sampleData.length > 0) {
      sampleText = '\n\nSample data:\n';
      sampleData.forEach((row: any, idx: number) => {
        sampleText += `Row ${idx + 1}: `;
        const values = columns?.map((col: string) => `${col}=${row[col]}`).join(', ');
        sampleText += values + '\n';
      });
    }

    // Add statistics if available
    let statsText = '';
    if (columns && columns.length > 0) {
      const stats = calculateStatistics(parsed.content, columns);
      if (stats && Object.keys(stats).length > 0) {
        statsText = '\n\nColumn statistics:\n';
        for (const [col, colStats] of Object.entries(stats)) {
          const s = colStats as any;
          if (s.type === 'numeric' && s.min !== undefined) {
            statsText += `${col}: min=${s.min}, max=${s.max}, avg=${s.avg?.toFixed(2)}\n`;
          } else if (s.type === 'categorical' && s.uniqueCount) {
            statsText += `${col}: ${s.uniqueCount} unique values, most common: ${s.mostCommon}\n`;
          }
        }
      }
    }

    return `${fileName} is a tabular dataset with ${rowCount} rows and ${columnCount} columns.\n\nColumns: ${columns?.join(', ')}${sampleText}${statsText}`;
  } else {
    const { textLength } = parsed.metadata;
    return `${fileName} is a text document with ${textLength} characters`;
  }
}

/**
 * Process a single file
 */
export async function processFile(
  userId: string,
  accessToken: string,
  fileId: string,
  fileName: string,
  mimeType: string,
  refreshToken?: string
): Promise<IngestionJob> {
  const jobId = `job-${Date.now()}-${fileId}`;

  const job: IngestionJob = {
    id: jobId,
    userId,
    fileId,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
  };

  jobs.set(jobId, job);

  // Process asynchronously
  (async () => {
    try {
      // Update status
      job.status = 'processing';
      job.progress = 10;

      // Download file
      console.log(`📥 Downloading file: ${fileName}`);
      const buffer = await downloadFile(accessToken, fileId, refreshToken, mimeType);
      job.progress = 30;

      // Parse file
      console.log(`📝 Parsing file: ${fileName}`);
      const parsed = await parseFile(buffer, mimeType);
      job.progress = 50;

      // Generate summary
      const summary = createDatasetSummary(parsed, fileName);

      // Generate embedding
      console.log(`🧠 Generating embedding for: ${fileName}`);
      const embedding = await generateEmbedding(summary);
      job.progress = 70;

      // Prepare dataset document
      const dataset: any = {
        id: fileId,
        userId,
        name: fileName,
        source: 'google-drive',
        type: parsed.type === 'tabular' ? 'csv' : 'text',
        summary,
        embedding,
        metadata: parsed.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (parsed.type === 'tabular') {
        dataset.rowCount = parsed.metadata.rowCount;
        dataset.columnCount = parsed.metadata.columnCount;
        dataset.columns = parsed.metadata.columns;
        dataset.schema = parsed.metadata.schema;

        // Add sample data
        dataset.sampleRows = extractSample(parsed.content, 5);

        // Add statistics
        if (parsed.metadata.columns) {
          dataset.statistics = calculateStatistics(parsed.content, parsed.metadata.columns);
        }

        // Store aggregated data for visualizations (limit to prevent large documents)
        // Store more data points for better visualizations
        dataset.aggregatedData = extractSample(parsed.content, Math.min(100, parsed.content.length));
      }

      // Index in Elasticsearch
      console.log(`💾 Indexing dataset: ${fileName}`);
      await esClient.index({
        index: INDICES.DATASETS,
        id: fileId,
        document: dataset,
        refresh: true,
      });

      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date();

      console.log(`✅ Successfully processed: ${fileName}`);
    } catch (error: any) {
      console.error(`❌ Error processing file ${fileName}:`, error);
      job.status = 'failed';
      job.error = error.message;
    }
  })();

  return job;
}

/**
 * Process multiple files
 */
export async function processMultipleFiles(
  userId: string,
  accessToken: string,
  files: Array<{ id: string; name: string; mimeType: string }>,
  refreshToken?: string
): Promise<IngestionJob[]> {
  const jobs = await Promise.all(
    files.map(file => processFile(userId, accessToken, file.id, file.name, file.mimeType, refreshToken))
  );

  return jobs;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): IngestionJob | undefined {
  return jobs.get(jobId);
}

/**
 * Get all jobs for a user
 */
export function getUserJobs(userId: string): IngestionJob[] {
  return Array.from(jobs.values()).filter(job => job.userId === userId);
}

/**
 * Auto-process files from Google Drive
 */
export async function autoProcessDriveFiles(
  userId: string,
  accessToken: string,
  refreshToken?: string
): Promise<IngestionJob[]> {
  try {
    const drive = getDriveInstance(accessToken, refreshToken);

    // Get list of files
    const response = await drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType)',
      q: "trashed=false",
    });

    const files = response.data.files || [];

    // Filter supported file types
    const supportedFiles = files.filter((file: any) => {
      const type = file.mimeType;
      return (
        type.includes('csv') ||
        type.includes('spreadsheet') ||
        type.includes('excel') ||
        type.includes('pdf') ||
        type.includes('json') ||
        type.includes('text')
      );
    });

    console.log(`📁 Found ${supportedFiles.length} supported files to process`);

    // Process files
    return await processMultipleFiles(
      userId,
      accessToken,
      supportedFiles.map((f: any) => ({
        id: f.id!,
        name: f.name!,
        mimeType: f.mimeType!,
      })),
      refreshToken
    );
  } catch (error) {
    console.error('Error in auto-process:', error);
    throw error;
  }
}

/**
 * Delete all user data from Elasticsearch
 */
export async function deleteUserData(userId: string): Promise<void> {
  try {
    console.log(`🗑️  Deleting data for user: ${userId}`);

    // Delete from datasets index
    await esClient.deleteByQuery({
      index: INDICES.DATASETS,
      query: {
        match: {
          userId
        }
      },
      refresh: true
    }).catch(err => {
      // Ignore if index doesn't exist or no documents found
      if (err.meta?.body?.error?.type !== 'index_not_found_exception') {
        console.error('Error deleting datasets:', err);
      }
    });

    // Delete from chat history index
    await esClient.deleteByQuery({
      index: INDICES.CHAT_HISTORY,
      query: {
        match: {
          userId
        }
      },
      refresh: true
    }).catch(err => {
      if (err.meta?.body?.error?.type !== 'index_not_found_exception') {
        console.error('Error deleting chat history:', err);
      }
    });

    // Delete from insights index
    await esClient.deleteByQuery({
      index: INDICES.INSIGHTS,
      query: {
        match: {
          userId
        }
      },
      refresh: true
    }).catch(err => {
      if (err.meta?.body?.error?.type !== 'index_not_found_exception') {
        console.error('Error deleting insights:', err);
      }
    });

    console.log(`✅ Successfully deleted data for user: ${userId}`);
  } catch (error) {
    console.error('Error deleting user data:', error);
    throw error;
  }
}
