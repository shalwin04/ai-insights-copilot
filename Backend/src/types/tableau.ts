/**
 * Tableau API Type Definitions
 */

export interface TableauAuthCredentials {
  token: string;
  siteId: string;
  userId: string;
  expiresAt?: Date;
}

export interface TableauWorkbook {
  id: string;
  name: string;
  description?: string;
  contentUrl: string;
  webpageUrl: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
  };
  tags?: Array<{
    label: string;
  }>;
  views?: TableauView[];
}

export interface TableauView {
  id: string;
  name: string;
  contentUrl: string;
  viewUrlName: string;
  createdAt: string;
  updatedAt: string;
  workbook?: {
    id: string;
  };
  owner?: {
    id: string;
  };
  tags?: Array<{
    label: string;
  }>;
  fields?: TableauField[];
}

export interface TableauDataSource {
  id: string;
  name: string;
  type: string;
  contentUrl: string;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
  };
  owner: {
    id: string;
  };
  certificationNote?: string;
  isCertified?: boolean;
  fields?: TableauField[];
}

export interface TableauField {
  name: string;
  description?: string;
  dataType: 'string' | 'integer' | 'real' | 'boolean' | 'date' | 'datetime';
  role: 'dimension' | 'measure' | 'unknown';
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';
}

export interface TableauConnection {
  id: string;
  type: string;
  serverAddress?: string;
  serverPort?: string;
  userName?: string;
}

export interface TableauUser {
  id: string;
  name: string;
  email?: string;
  siteRole: string;
  authSetting: string;
}

export interface TableauProject {
  id: string;
  name: string;
  description?: string;
  parentProjectId?: string;
}

export interface TableauViewData {
  viewId: string;
  data: any[][];
  columns: string[];
  totalRowCount: number;
}

/**
 * Metadata API Types (GraphQL)
 */

export interface TableauMetadataWorkbook {
  luid: string;
  name: string;
  description?: string;
  projectName?: string;
  uri?: string;
  sheets: TableauMetadataSheet[];
  upstreamDatasources: TableauMetadataDatasource[];
}

export interface TableauMetadataSheet {
  id: string;
  name: string;
  path?: string;
  fields: TableauMetadataField[];
}

export interface TableauMetadataDatasource {
  id: string;
  name: string;
  description?: string;
  fields: TableauMetadataField[];
  upstreamTables?: TableauMetadataTable[];
}

export interface TableauMetadataField {
  id: string;
  name: string;
  description?: string;
  dataType: string;
  role?: string;
  upstreamColumns?: TableauMetadataColumn[];
}

export interface TableauMetadataTable {
  id: string;
  name: string;
  schema?: string;
  fullName?: string;
  columns: TableauMetadataColumn[];
}

export interface TableauMetadataColumn {
  id: string;
  name: string;
  dataType?: string;
}

/**
 * Our internal representations for ChromaDB indexing
 */

export interface TableauWorkbookIndex {
  id: string;
  name: string;
  description: string;
  projectName: string;
  fields: string[];
  viewNames: string[];
  dataSourceIds: string[];
  tags: string[];
  createdAt: string;
  webpageUrl: string;
  // For semantic search
  searchText: string;
}

/**
 * Request/Response types
 */

export interface TableauSignInRequest {
  credentials: {
    name?: string;
    password?: string;
    personalAccessTokenName?: string;
    personalAccessTokenSecret?: string;
    site: {
      contentUrl: string;
    };
  };
}

export interface TableauSignInResponse {
  credentials: {
    token: string;
    site: {
      id: string;
      contentUrl: string;
    };
    user: {
      id: string;
    };
  };
}

export interface TableauOAuthTokenRequest {
  grant_type: 'authorization_code' | 'refresh_token';
  code?: string;
  redirect_uri?: string;
  refresh_token?: string;
  client_id: string;
  client_secret: string;
}

export interface TableauOAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

/**
 * Agent State Extensions for Tableau
 */

export interface TableauAgentContext {
  workbooks: TableauWorkbook[];
  selectedWorkbook?: TableauWorkbook;
  selectedView?: TableauView;
  dataSources: TableauDataSource[];
  queryResults?: TableauViewData;
  embedUrl?: string;
}
