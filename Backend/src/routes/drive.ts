import express, { type Request, type Response } from 'express';
import { getDriveInstance } from '../config/googleOAuth.js';

const router = express.Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.session || !req.session.tokens || !req.session.tokens.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
};

// List files from Google Drive
router.get('/files', requireAuth, async (req: Request, res: Response) => {
  try {
    const accessToken = req.session!.tokens!.access_token!;
    const drive = getDriveInstance(accessToken);

    const response = await drive.files.list({
      pageSize: 50,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink)',
      q: "trashed=false",
      orderBy: 'modifiedTime desc',
    });

    res.json({ files: response.data.files });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files', details: error.message });
  }
});

// Get file metadata
router.get('/files/:fileId', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const accessToken = req.session!.tokens!.access_token!;
    const drive = getDriveInstance(accessToken);

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, modifiedTime, size, webViewLink, iconLink, description',
    });

    res.json({ file: response.data });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file', details: error.message });
  }
});

// Download file
router.get('/files/:fileId/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    const accessToken = req.session!.tokens!.access_token!;
    const drive = getDriveInstance(accessToken);

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    ) as any;

    response.data
      .on('end', () => {
        console.log('Download complete');
      })
      .on('error', (err: Error) => {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      })
      .pipe(res);
  } catch (error: any) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file', details: error.message });
  }
});

// Search files
router.get('/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const accessToken = req.session!.tokens!.access_token!;
    const drive = getDriveInstance(accessToken);

    const response = await drive.files.list({
      pageSize: 50,
      fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink)',
      q: `name contains '${query}' and trashed=false`,
      orderBy: 'modifiedTime desc',
    });

    res.json({ files: response.data.files });
  } catch (error: any) {
    console.error('Error searching files:', error);
    res.status(500).json({ error: 'Failed to search files', details: error.message });
  }
});

export default router;
