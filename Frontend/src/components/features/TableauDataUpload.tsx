import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, FileText, CheckCircle, XCircle, Loader2, Info } from 'lucide-react';
import { api } from '../../lib/api';

interface UploadedFile {
  name: string;
  size: number;
  uploadedAt: string;
  dataset: {
    name: string;
    rowCount: number;
    columnCount: number;
    columns: string[];
  };
}

export function TableauDataUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/api/upload/tableau-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ File uploaded successfully:', response.data);

      setUploadedFile({
        name: response.data.file.name,
        size: response.data.file.size,
        uploadedAt: response.data.file.uploadedAt,
        dataset: response.data.dataset,
      });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('❌ Upload failed:', err);
      setError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Tableau Data (CSV)
        </CardTitle>
        <CardDescription>
          Download CSV from Tableau Cloud, then upload it here for AI-powered analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Instructions */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">How to export from Tableau Cloud:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open your workbook in Tableau Cloud</li>
                <li>Click on any view (e.g., "Health Indicators")</li>
                <li>Click Download → Data → CSV</li>
                <li>Upload the CSV file here</li>
              </ol>
            </div>
          </AlertDescription>
        </Alert>

        {/* Upload Button */}
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-primary/50 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />

          {uploading ? (
            <div className="text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading and processing...</p>
            </div>
          ) : (
            <>
              <FileText className="h-12 w-12 mb-4 text-muted-foreground" />
              <Button onClick={handleButtonClick} variant="default" size="lg">
                <Upload className="mr-2 h-4 w-4" />
                Select CSV File
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Maximum file size: 50MB
              </p>
            </>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {uploadedFile && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-green-900 dark:text-green-100">
                  File uploaded successfully!
                </p>
                <div className="text-sm space-y-1">
                  <p><strong>File:</strong> {uploadedFile.name}</p>
                  <p><strong>Size:</strong> {formatFileSize(uploadedFile.size)}</p>
                  <p><strong>Rows:</strong> {uploadedFile.dataset.rowCount.toLocaleString()}</p>
                  <p><strong>Columns:</strong> {uploadedFile.dataset.columnCount}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sample columns: {uploadedFile.dataset.columns.slice(0, 5).join(', ')}
                    {uploadedFile.dataset.columns.length > 5 && '...'}
                  </p>
                </div>
                <p className="text-sm text-green-800 dark:text-green-200 mt-3">
                  ✅ Ready for analysis! Ask questions about this data in the chat.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Example */}
        {uploadedFile && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Try asking in chat:</p>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>"Compare Ethiopia and Uganda health indicators"</li>
                <li>"Show me the top 5 countries by life expectancy"</li>
                <li>"Create a chart comparing healthcare spending"</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
