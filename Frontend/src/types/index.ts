export type DataSourceStatus = 'connected' | 'syncing' | 'error' | 'disconnected';

export interface DataSource {
  id: string;
  name: string;
  type: 'google-drive' | 'onedrive' | 'notion' | 'databricks' | 'local';
  status: DataSourceStatus;
  lastSync?: Date;
  filesCount?: number;
}

export interface Dataset {
  id: string;
  name: string;
  type: 'csv' | 'excel' | 'json' | 'pdf' | 'text' | 'database';
  source: string;
  rows?: number;
  columns?: number;
  size: string;
  lastModified: Date;
  preview?: any[];
}

export interface InsightCard {
  id: string;
  type: 'chart' | 'table' | 'text' | 'metric' | 'filter';
  title: string;
  content: any;
  position: { x: number; y: number };
  size: { width: number; height: number };
  createdAt: Date;
  pinned?: boolean;
  metadata?: {
    source?: string;
    workflowId?: string;
    workflowName?: string;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: InsightCard[];
  suggestions?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  schedule?: string;
  lastRun?: Date;
  nextRun?: Date;
  query: string;
}

export interface ColumnMetadata {
  name: string;
  type: string;
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  min?: number;
  max?: number;
}

export type ViewMode = 'chat' | 'canvas' | 'explorer' | 'drive';
