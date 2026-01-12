import express, { type Request, type Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// Configure multer for CSV uploads
const uploadDir = path.join(__dirname, '../../uploads/tableau');

// Ensure upload directory exists
async function ensureUploadDir() {
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create upload directory:', error);
  }
}

ensureUploadDir();

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Use timestamp + original name to avoid conflicts
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

/**
 * Upload Tableau CSV data
 * POST /api/upload/tableau-csv
 */
router.post('/tableau-csv', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('📤 CSV file uploaded:', req.file.originalname);
    console.log('   Size:', (req.file.size / 1024).toFixed(2), 'KB');
    console.log('   Saved to:', req.file.filename);

    // Parse CSV metadata
    const metadata = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      path: req.file.path || '',
    };

    // Store metadata in session (or database in production)
    if (!req.session) {
      req.session = {} as any;
    }

    if (!req.session.uploadedFiles) {
      req.session.uploadedFiles = [];
    }

    req.session.uploadedFiles.push(metadata);

    // Process the CSV for ingestion
    const { processTableauCSV } = await import('../services/csvProcessor.js');
    const dataset = await processTableauCSV(req.file.path, req.file.originalname);

    console.log('✅ CSV processed successfully');
    console.log(`   Rows: ${dataset.rowCount}`);
    console.log(`   Columns: ${dataset.columns.length}`);

    res.json({
      success: true,
      message: 'CSV uploaded and processed successfully',
      file: {
        name: metadata.originalName,
        size: metadata.size,
        uploadedAt: metadata.uploadedAt,
      },
      dataset: {
        name: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columns.length,
        columns: dataset.columns,
        summary: dataset.summary,
      },
    });
  } catch (error: any) {
    console.error('❌ CSV upload failed:', error);
    res.status(500).json({
      error: 'Failed to process CSV file',
      details: error.message,
    });
  }
});

/**
 * List uploaded CSV files
 * GET /api/upload/tableau-csv
 */
router.get('/tableau-csv', async (req: Request, res: Response) => {
  try {
    const uploadedFiles = req.session?.uploadedFiles || [];

    res.json({
      files: uploadedFiles,
      count: uploadedFiles.length,
    });
  } catch (error: any) {
    console.error('❌ Failed to list uploaded files:', error);
    res.status(500).json({ error: 'Failed to list uploaded files' });
  }
});

/**
 * Delete uploaded CSV file
 * DELETE /api/upload/tableau-csv/:filename
 */
router.delete('/tableau-csv/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join(uploadDir, filename);

    // Delete file
    await fs.unlink(filePath);

    // Remove from session
    if (req.session?.uploadedFiles) {
      req.session.uploadedFiles = req.session.uploadedFiles.filter(
        (f: any) => f.filename !== filename
      );
    }

    console.log('🗑️  Deleted uploaded file:', filename);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Failed to delete file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      details: error.message,
    });
  }
});

export default router;
