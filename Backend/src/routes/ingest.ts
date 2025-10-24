import express, { type Request, type Response } from 'express';
import { autoProcessDriveFiles, getJobStatus, getUserJobs, processFile } from '../services/ingestion.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

/**
 * Trigger ingestion for all Google Drive files
 */
router.post('/google-drive/auto', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.session!.user?.id || 'anonymous';
    const accessToken = req.session!.tokens!.access_token!;
    const refreshToken = req.session!.tokens!.refresh_token;

    const jobs = await autoProcessDriveFiles(userId, accessToken, refreshToken);

    res.json({
      message: 'Ingestion started',
      jobCount: jobs.length,
      jobs: jobs.map(j => ({
        id: j.id,
        fileId: j.fileId,
        status: j.status,
      })),
    });
  } catch (error: any) {
    console.error('Error starting ingestion:', error);
    res.status(500).json({
      error: 'Failed to start ingestion',
      details: error.message,
    });
  }
});

/**
 * Process a specific file
 */
router.post('/file/:fileId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { fileName, mimeType } = req.body;

    if (!fileId || !fileName || !mimeType) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const userId = req.session!.user?.id || 'anonymous';
    const accessToken = req.session!.tokens!.access_token!;
    const refreshToken = req.session!.tokens!.refresh_token;

    const job = await processFile(userId, accessToken, fileId, fileName, mimeType, refreshToken);

    res.json({
      message: 'Processing started',
      job: {
        id: job.id,
        fileId: job.fileId,
        status: job.status,
        progress: job.progress,
      },
    });
  } catch (error: any) {
    console.error('Error processing file:', error);
    res.status(500).json({
      error: 'Failed to process file',
      details: error.message,
    });
  }
});

/**
 * Get job status
 */
router.get('/job/:jobId', requireAuth, (req: Request, res: Response) => {
  try {
    const jobId = req.params.jobId;
    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    const job = getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ job });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get job status',
      details: error.message,
    });
  }
});

/**
 * Get all jobs for the current user
 */
router.get('/jobs', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = req.session!.user?.id || 'anonymous';
    const jobs = getUserJobs(userId);

    res.json({ jobs });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get jobs',
      details: error.message,
    });
  }
});

export default router;
