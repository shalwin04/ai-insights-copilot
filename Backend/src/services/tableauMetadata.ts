import axios, { type AxiosInstance } from 'axios';
import { tableauConfig } from '../config/tableau.js';

/**
 * Tableau Metadata API (GraphQL)
 *
 * The Metadata API provides rich semantic information about Tableau content:
 * - Workbooks, dashboards, and sheets
 * - Data sources and their fields
 * - Lineage and relationships
 * - Descriptions and tags
 */

export interface TableauMetadataField {
  id: string;
  name: string;
  description?: string;
  dataType: string;
  role: string; // dimension, measure
  isHidden: boolean;
}

export interface TableauMetadataView {
  id: string;
  name: string;
  description?: string;
  viewUrlName: string;
  fields: TableauMetadataField[];
}

export interface TableauMetadataWorkbook {
  id: string;
  luid: string;
  name: string;
  description?: string;
  projectName: string;
  dashboards: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  sheets: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  upstreamDatabases: Array<{
    id: string;
    name: string;
    connectionType: string;
  }>;
  upstreamTables: Array<{
    id: string;
    name: string;
    schema?: string;
    fullName: string;
  }>;
  fields: TableauMetadataField[];
}

export class TableauMetadataService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: `${tableauConfig.serverUrl}/api/metadata/graphql`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Set authentication token
   */
  setAuth(token: string) {
    this.authToken = token;
  }

  /**
   * Execute GraphQL query
   */
  private async query<T>(query: string, variables?: any): Promise<T> {
    if (!this.authToken) {
      throw new Error('Not authenticated with Tableau');
    }

    const response = await this.axiosInstance.post(
      '',
      {
        query,
        variables,
      },
      {
        headers: {
          'X-Tableau-Auth': this.authToken,
        },
      }
    );

    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.data;
  }

  /**
   * Get detailed workbook metadata including fields and lineage
   */
  async getWorkbookMetadata(workbookLuid: string): Promise<TableauMetadataWorkbook> {
    const query = `
      query GetWorkbookMetadata($luid: String!) {
        workbook(luid: $luid) {
          id
          luid
          name
          description
          projectName

          # Dashboards in this workbook
          dashboards {
            id
            name
            path
          }

          # Sheets in this workbook
          sheets {
            id
            name
            path
          }

          # Upstream databases (data sources)
          upstreamDatabases {
            id
            name
            connectionType
          }

          # Upstream tables
          upstreamTables {
            id
            name
            schema
            fullName
          }

          # Fields used in this workbook
          fields {
            id
            name
            description
            dataType
            role
            isHidden
          }
        }
      }
    `;

    const result = await this.query<{ workbook: TableauMetadataWorkbook }>(query, {
      luid: workbookLuid,
    });

    return result.workbook;
  }

  /**
   * Search workbooks by name or description
   */
  async searchWorkbooks(searchTerm: string): Promise<TableauMetadataWorkbook[]> {
    const query = `
      query SearchWorkbooks {
        workbooks {
          id
          luid
          name
          description
          projectName

          dashboards {
            id
            name
            path
          }

          sheets {
            id
            name
            path
          }
        }
      }
    `;

    const result = await this.query<{ workbooks: TableauMetadataWorkbook[] }>(query);

    // Filter workbooks based on search term
    const searchLower = searchTerm.toLowerCase();
    return result.workbooks.filter((wb) => {
      const nameMatch = wb.name.toLowerCase().includes(searchLower);
      const descMatch = wb.description?.toLowerCase().includes(searchLower);
      const projectMatch = wb.projectName?.toLowerCase().includes(searchLower);
      return nameMatch || descMatch || projectMatch;
    });
  }

  /**
   * Get all workbooks with metadata
   */
  async getAllWorkbooks(): Promise<TableauMetadataWorkbook[]> {
    const query = `
      query GetAllWorkbooks {
        workbooks {
          id
          luid
          name
          description
          projectName

          dashboards {
            id
            name
            path
          }

          sheets {
            id
            name
            path
          }

          upstreamDatabases {
            id
            name
            connectionType
          }
        }
      }
    `;

    const result = await this.query<{ workbooks: TableauMetadataWorkbook[] }>(query);
    return result.workbooks;
  }

  /**
   * Get database metadata (data sources)
   */
  async getDatabaseMetadata(databaseId: string) {
    const query = `
      query GetDatabaseMetadata($id: ID!) {
        database(id: $id) {
          id
          name
          description
          connectionType
          isEmbedded
          isCertified

          tables {
            id
            name
            schema
            fullName
            description

            columns {
              id
              name
              description
              remoteType
            }
          }
        }
      }
    `;

    const result = await this.query<{ database: any }>(query, { id: databaseId });
    return result.database;
  }

  /**
   * Get fields (columns) for a workbook with detailed metadata
   */
  async getWorkbookFields(workbookLuid: string): Promise<TableauMetadataField[]> {
    const query = `
      query GetWorkbookFields($luid: String!) {
        workbook(luid: $luid) {
          fields {
            id
            name
            description
            dataType
            role
            isHidden

            upstreamColumns {
              id
              name
              remoteType
            }
          }
        }
      }
    `;

    const result = await this.query<{ workbook: { fields: TableauMetadataField[] } }>(query, {
      luid: workbookLuid,
    });

    return result.workbook.fields.filter((field) => !field.isHidden);
  }

  /**
   * Build semantic index for AI search
   * Returns workbook metadata formatted for semantic search
   */
  async buildSemanticIndex(): Promise<
    Array<{
      id: string;
      name: string;
      type: 'workbook' | 'dashboard' | 'sheet';
      description: string;
      keywords: string[];
      metadata: any;
    }>
  > {
    const workbooks = await this.getAllWorkbooks();
    const items: Array<{
      id: string;
      name: string;
      type: 'workbook' | 'dashboard' | 'sheet';
      description: string;
      keywords: string[];
      metadata: any;
    }> = [];

    for (const wb of workbooks) {
      // Index workbook
      items.push({
        id: wb.luid,
        name: wb.name,
        type: 'workbook',
        description: wb.description || `${wb.name} workbook in ${wb.projectName} project`,
        keywords: [
          wb.name,
          wb.projectName,
          ...(wb.upstreamDatabases?.map((db) => db.name) || []),
          ...(wb.upstreamTables?.map((t) => t.name) || []),
        ],
        metadata: {
          projectName: wb.projectName,
          dashboardCount: wb.dashboards?.length || 0,
          sheetCount: wb.sheets?.length || 0,
          databases: wb.upstreamDatabases,
        },
      });

      // Index dashboards
      if (wb.dashboards) {
        for (const dashboard of wb.dashboards) {
          items.push({
            id: dashboard.id,
            name: dashboard.name,
            type: 'dashboard',
            description: `${dashboard.name} dashboard in ${wb.name}`,
            keywords: [dashboard.name, wb.name, wb.projectName],
            metadata: {
              workbookName: wb.name,
              workbookLuid: wb.luid,
              path: dashboard.path,
            },
          });
        }
      }

      // Index sheets
      if (wb.sheets) {
        for (const sheet of wb.sheets) {
          items.push({
            id: sheet.id,
            name: sheet.name,
            type: 'sheet',
            description: `${sheet.name} sheet in ${wb.name}`,
            keywords: [sheet.name, wb.name, wb.projectName],
            metadata: {
              workbookName: wb.name,
              workbookLuid: wb.luid,
              path: sheet.path,
            },
          });
        }
      }
    }

    return items;
  }
}

// Export singleton instance
export const tableauMetadataService = new TableauMetadataService();
