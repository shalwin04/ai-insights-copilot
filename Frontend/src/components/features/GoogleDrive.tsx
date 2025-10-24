import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useDrive, type DriveFile } from "../../hooks/useDrive";
import { ingestionApi } from "../../lib/api";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { ScrollArea } from "../ui/scroll-area";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  LogIn,
  LogOut,
  Search,
  Download,
  FolderOpen,
  FileText,
  RefreshCw,
  Database,
  CheckCircle2,
  Loader2,
} from "lucide-react";

export const GoogleDrive = () => {
  const {
    user,
    isAuthenticated,
    isLoading: authLoading,
    login,
    logout,
    isIngesting,
    ingestionStatus,
  } = useAuth();
  const { files, isLoading, error, fetchFiles, searchFiles, downloadFile } =
    useDrive();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [ingestingFiles, setIngestingFiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles();
    }
  }, [isAuthenticated, fetchFiles]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      searchFiles(searchQuery);
    } else {
      fetchFiles();
    }
  };

  const handleDownload = async (file: DriveFile) => {
    try {
      await downloadFile(file.id, file.name);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return "N/A";
    const size = parseInt(bytes);
    if (size < 1024) return size + " B";
    if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
    if (size < 1024 * 1024 * 1024)
      return (size / (1024 * 1024)).toFixed(2) + " MB";
    return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isFileSupported = (mimeType: string) => {
    return (
      mimeType.includes("csv") ||
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      mimeType.includes("pdf") ||
      mimeType.includes("json") ||
      mimeType.includes("text")
    );
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    const supportedFiles = files.filter((f) => isFileSupported(f.mimeType));
    setSelectedFiles(new Set(supportedFiles.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const ingestSelectedFiles = async () => {
    if (selectedFiles.size === 0) {
      alert("Please select files to ingest");
      return;
    }

    const filesToIngest = files.filter((f) => selectedFiles.has(f.id));
    setIngestingFiles(new Set(selectedFiles));

    try {
      // Ingest files one by one
      for (const file of filesToIngest) {
        console.log(`📥 Ingesting: ${file.name}`);
        await ingestionApi.processFile(file.id, file.name, file.mimeType);
      }

      alert(`Successfully queued ${filesToIngest.length} files for ingestion!`);
      setSelectedFiles(new Set());
    } catch (error) {
      console.error("Ingestion failed:", error);
      alert("Failed to ingest files. Check console for details.");
    } finally {
      setIngestingFiles(new Set());
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <FolderOpen className="w-16 h-16 text-gray-400" />
        <h2 className="text-2xl font-semibold">Connect to Google Drive</h2>
        <p className="text-gray-600">
          Sign in with your Google account to access your files
        </p>
        <Button onClick={login} className="flex items-center gap-2">
          <LogIn className="w-4 h-4" />
          Sign in with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {user?.picture && (
            <img
              src={user.picture}
              alt={user.name || "User"}
              className="w-10 h-10 rounded-full"
            />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {user?.name || "Google Drive"}
            </h2>
            <p className="text-sm text-gray-600">{user?.email}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchFiles}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={logout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={isLoading}>
          Search
        </Button>
      </form>

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {/* Ingestion Status */}
      {(isIngesting || ingestionStatus) && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200">
          <div className="flex items-center gap-2">
            {isIngesting && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
            {!isIngesting && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {ingestionStatus || "Ingestion complete"}
            </span>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {searchQuery
              ? `Search Results (${files.length})`
              : `Your Files (${files.length})`}
          </h3>

          {/* Selection Actions */}
          {files.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedFiles.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={isLoading}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedFiles.size === 0}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={ingestSelectedFiles}
                disabled={selectedFiles.size === 0 || ingestingFiles.size > 0}
                className="flex items-center gap-2"
              >
                <Database className="h-4 w-4" />
                Index Selected ({selectedFiles.size})
              </Button>
            </div>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText className="w-12 h-12 mb-2" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const supported = isFileSupported(file.mimeType);
                const isSelected = selectedFiles.has(file.id);
                const isIngesting = ingestingFiles.has(file.id);

                return (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
                      supported
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "opacity-60"
                    } ${isSelected ? "bg-blue-50 border-blue-300" : ""}`}
                    onClick={() => supported && toggleFileSelection(file.id)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Checkbox for supported files */}
                      {supported && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleFileSelection(file.id)}
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      )}

                      {file.iconLink ? (
                        <img src={file.iconLink} alt="" className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6 text-gray-400" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{file.name}</p>
                          {!supported && (
                            <Badge variant="secondary" className="text-xs">
                              Not Supported
                            </Badge>
                          )}
                          {isIngesting && (
                            <Badge variant="default" className="text-xs">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Indexing...
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.size)} •{" "}
                          {formatDate(file.modifiedTime)}
                        </p>
                      </div>
                    </div>
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {file.webViewLink && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            window.open(file.webViewLink, "_blank")
                          }
                        >
                          Open
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(file)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>
    </div>
  );
};
