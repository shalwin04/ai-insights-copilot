import { useState, useEffect } from 'react';
import {
  Home, Database, FolderOpen, Workflow, Settings,
  Plus, Circle, CheckCircle2,
  XCircle, Loader2, Cloud, HardDrive, MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useDrive } from '@/hooks/useDrive';
import { ConnectionModal } from '../features/ConnectionModal';
import { WorkflowList } from '../features/WorkflowList';
import { WorkflowBuilder } from '../features/WorkflowBuilder';
import { ingestionApi } from '@/lib/api';
import type { DataSource, Dataset } from '@/types';

interface SidebarProps {
  className?: string;
  onNavigateToChat?: () => void;
}

// Removed mockWorkflows - now using real workflow data from WorkflowList component

const dataSourceIcons = {
  'google-drive': Cloud,
  'onedrive': Cloud,
  'notion': Database,
  'databricks': Database,
  'local': HardDrive,
};

const statusIcons = {
  connected: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  syncing: <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />,
  error: <XCircle className="h-3 w-3 text-red-500" />,
  disconnected: <Circle className="h-3 w-3 text-gray-400" />,
};

export function Sidebar({ className, onNavigateToChat }: SidebarProps) {
  const [activeSection, setActiveSection] = useState<'home' | 'sources' | 'datasets' | 'workflows' | 'settings'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const { isAuthenticated, user, login, isIngesting, ingestionStatus, triggerIngestion } = useAuth();
  const { files, fetchFiles } = useDrive();

  const handleChatWithData = async () => {
    // Trigger ingestion before navigating to chat
    await triggerIngestion();
    if (onNavigateToChat) {
      onNavigateToChat();
    }
  };

  const handleChatWithFile = async (fileId: string, fileName: string, mimeType: string) => {
    try {
      console.log(`📥 Ingesting file: ${fileName}`);
      await ingestionApi.processFile(fileId, fileName, mimeType);

      // Navigate to chat after ingestion starts
      if (onNavigateToChat) {
        onNavigateToChat();
      }
    } catch (error) {
      console.error('Error ingesting file:', error);
      alert('Failed to ingest file. Please try again.');
    }
  };

  // Build data sources list based on actual connections
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    // Update data sources based on authentication status
    const sources: DataSource[] = [];

    if (isAuthenticated) {
      sources.push({
        id: 'gdrive-1',
        name: 'Google Drive',
        type: 'google-drive',
        status: 'connected',
        lastSync: new Date(),
        filesCount: files.length,
      });

      // Fetch files when authenticated
      fetchFiles();
    } else {
      sources.push({
        id: 'gdrive-1',
        name: 'Google Drive',
        type: 'google-drive',
        status: 'disconnected',
      });
    }

    // Add other potential sources (not yet connected)
    sources.push(
      {
        id: 'onedrive-1',
        name: 'OneDrive',
        type: 'onedrive',
        status: 'disconnected',
      },
      {
        id: 'notion-1',
        name: 'Notion Workspace',
        type: 'notion',
        status: 'disconnected',
      }
    );

    setDataSources(sources);
  }, [isAuthenticated, files.length, fetchFiles]);

  useEffect(() => {
    // Convert Google Drive files to datasets
    if (files.length > 0) {
      const driveDatasets: Dataset[] = files
        .filter(file => {
          const type = file.mimeType;
          return type.includes('spreadsheet') ||
                 type.includes('csv') ||
                 type.includes('excel') ||
                 type.includes('pdf') ||
                 type.includes('text');
        })
        .map(file => {
          let datasetType: Dataset['type'] = 'text';
          if (file.mimeType.includes('spreadsheet') || file.mimeType.includes('excel')) {
            datasetType = 'excel';
          } else if (file.mimeType.includes('csv')) {
            datasetType = 'csv';
          } else if (file.mimeType.includes('pdf')) {
            datasetType = 'pdf';
          } else if (file.mimeType.includes('json')) {
            datasetType = 'json';
          }

          return {
            id: file.id,
            name: file.name,
            type: datasetType,
            source: 'Google Drive',
            size: file.size ? `${(parseInt(file.size) / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
            lastModified: new Date(file.modifiedTime),
            mimeType: file.mimeType, // Keep mimeType for ingestion
          };
        });

      setDatasets(driveDatasets);
    }
  }, [files]);

  const NavItem = ({
    icon: Icon,
    label,
    section,
    badge
  }: {
    icon: any;
    label: string;
    section: typeof activeSection;
    badge?: number
  }) => (
    <button
      onClick={() => setActiveSection(section)}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        activeSection === section
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <Badge variant="secondary" className="ml-auto">
          {badge}
        </Badge>
      )}
    </button>
  );

  return (
    <div className={cn("w-64 border-r bg-muted/30 flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          AI Copilot
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Data Analytics Platform</p>
      </div>

      {/* Navigation */}
      <div className="p-3 space-y-1">
        <NavItem icon={Home} label="Dashboard" section="home" />
        <NavItem icon={Database} label="Data Sources" section="sources" badge={dataSources.length} />
        <NavItem icon={FolderOpen} label="Datasets" section="datasets" badge={datasets.length} />
        <NavItem icon={Workflow} label="Workflows" section="workflows" />
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-4 pb-4">
          {activeSection === 'home' && (
            <div className="space-y-3">
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Recent Insights
                </h3>
                <div className="space-y-2">
                  {['Revenue Growth Analysis', 'Customer Churn Report', 'Sales Forecast'].map((insight, i) => (
                    <div key={i} className="p-2 rounded-md hover:bg-accent cursor-pointer text-sm">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Suggested Queries
                </h3>
                <div className="space-y-2">
                  {['Show trending products', 'Compare Q3 vs Q4', 'Detect anomalies'].map((query, i) => (
                    <Button key={i} variant="outline" size="sm" className="w-full justify-start text-xs">
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sources' && (
            <div className="space-y-3">
              <Button
                className="w-full"
                size="sm"
                onClick={() => setShowConnectionModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Data Source
              </Button>

              {/* Ingestion Status Indicator */}
              {isIngesting && ingestionStatus && (
                <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                    <span className="text-xs font-medium text-blue-900 dark:text-blue-100">
                      {ingestionStatus}
                    </span>
                  </div>
                </div>
              )}

              {!isIngesting && ingestionStatus && (
                <div className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-900 dark:text-amber-100">
                      {ingestionStatus}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {dataSources.map((source) => {
                  const SourceIcon = dataSourceIcons[source.type] || Database;
                  const isGoogleDrive = source.type === 'google-drive';

                  return (
                    <div
                      key={source.id}
                      className="p-3 rounded-lg border bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <SourceIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{source.name}</span>
                        </div>
                        {statusIcons[source.status]}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1 mb-2">
                        {source.filesCount !== undefined && <div>{source.filesCount} files</div>}
                        {source.lastSync && (
                          <div>Synced {source.lastSync.toLocaleTimeString()}</div>
                        )}
                      </div>
                      {isGoogleDrive && source.status === 'disconnected' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={login}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      )}
                      {isGoogleDrive && source.status === 'connected' && user && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {user.picture && (
                              <img src={user.picture} alt="" className="w-4 h-4 rounded-full" />
                            )}
                            <span className="truncate">{user.email}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="default"
                            className="w-full text-xs"
                            onClick={handleChatWithData}
                            disabled={isIngesting}
                          >
                            {isIngesting ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Indexing...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Chat with Data
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {!isGoogleDrive && (
                        <Badge variant="secondary" className="text-xs">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === 'datasets' && (
            <div className="space-y-3">
              <Input
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8"
              />
              {datasets.length === 0 && (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No datasets found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Connect a data source to get started
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {datasets
                  .filter(dataset =>
                    dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((dataset) => (
                    <div
                      key={dataset.id}
                      className="p-3 rounded-lg border bg-card transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm truncate">{dataset.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{dataset.type.toUpperCase()}</Badge>
                          <span>{dataset.size}</span>
                        </div>
                        <div className="text-xs">
                          {dataset.source}
                        </div>
                        {dataset.rows && (
                          <div>{dataset.rows.toLocaleString()} rows × {dataset.columns} cols</div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs"
                        onClick={() => handleChatWithFile(dataset.id, dataset.name, (dataset as any).mimeType || 'application/octet-stream')}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Ask about this dataset
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeSection === 'workflows' && (
            <div className="space-y-3">
              <Button
                className="w-full"
                size="sm"
                onClick={() => setShowWorkflowBuilder(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Workflow
              </Button>
              <WorkflowList />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => setActiveSection('settings')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        open={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
      />

      {/* Workflow Builder Modal */}
      <WorkflowBuilder
        open={showWorkflowBuilder}
        onClose={() => setShowWorkflowBuilder(false)}
      />
    </div>
  );
}
