import { useState, useCallback } from 'react';
import { driveApi } from '../lib/api';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
}

export const useDrive = () => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await driveApi.getFiles();
      setFiles(response.data.files || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch files');
      console.error('Error fetching files:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchFiles = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await driveApi.searchFiles(query);
      setFiles(response.data.files || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search files');
      console.error('Error searching files:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadFile = useCallback(async (fileId: string, fileName: string) => {
    try {
      const response = await driveApi.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error downloading file:', err);
      throw err;
    }
  }, []);

  return {
    files,
    isLoading,
    error,
    fetchFiles,
    searchFiles,
    downloadFile,
  };
};
