import axios, { type AxiosInstance } from 'axios';
import {
  tableauConfig,
  buildTableauApiUrl,
  TABLEAU_ENDPOINTS,
} from '../config/tableau.js';
import type {
  TableauAuthCredentials,
  TableauWorkbook,
  TableauView,
  TableauDataSource,
  TableauSignInRequest,
  TableauSignInResponse,
  TableauOAuthTokenRequest,
  TableauOAuthTokenResponse,
  TableauViewData,
} from '../types/tableau.js';

/**
 * Tableau Service - Handles all Tableau REST API interactions
 */
export class TableauService {
  private axiosInstance: AxiosInstance;
  private authToken: string | null = null;
  private siteId: string | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: tableauConfig.serverUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Authenticate with Personal Access Token
   */
  async authenticateWithPAT(): Promise<TableauAuthCredentials> {
    try {
      console.log('🔐 Authenticating with Tableau PAT...');

      const requestBody: TableauSignInRequest = {
        credentials: {
          personalAccessTokenName: tableauConfig.pat.tokenName,
          personalAccessTokenSecret: tableauConfig.pat.tokenSecret,
          site: {
            contentUrl: tableauConfig.siteName,
          },
        },
      };

      const response = await this.axiosInstance.post<TableauSignInResponse>(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.AUTH.SIGNIN),
        requestBody
      );

      const { token, site, user } = response.data.credentials;

      this.authToken = token;
      this.siteId = site.id;

      console.log('✅ Tableau authentication successful');

      return {
        token,
        siteId: site.id,
        userId: user.id,
      };
    } catch (error: any) {
      console.error('❌ Tableau PAT authentication failed:', error.response?.data || error.message);
      throw new Error(`Tableau authentication failed: ${error.message}`);
    }
  }

  /**
   * Exchange OAuth authorization code for access token
   */
  async exchangeOAuthCode(code: string): Promise<TableauAuthCredentials> {
    try {
      console.log('🔐 Exchanging OAuth code for token...');

      const requestBody: TableauOAuthTokenRequest = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: tableauConfig.oauth.redirectUri,
        client_id: tableauConfig.oauth.clientId,
        client_secret: tableauConfig.oauth.clientSecret,
      };

      const response = await this.axiosInstance.post<TableauOAuthTokenResponse>(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.AUTH.OAUTH_TOKEN),
        requestBody
      );

      const { access_token, expires_in } = response.data;

      this.authToken = access_token;

      // Get site and user info with the access token
      const siteInfo = await this.getCurrentUser();

      console.log('✅ OAuth token exchange successful');

      return {
        token: access_token,
        siteId: this.siteId!,
        userId: siteInfo.id,
        expiresAt: new Date(Date.now() + expires_in * 1000),
      };
    } catch (error: any) {
      console.error('❌ OAuth token exchange failed:', error.response?.data || error.message);
      throw new Error(`OAuth token exchange failed: ${error.message}`);
    }
  }

  /**
   * Set authentication token manually
   */
  setAuth(token: string, siteId: string) {
    this.authToken = token;
    this.siteId = siteId;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    const response = await this.axiosInstance.get(
      buildTableauApiUrl(TABLEAU_ENDPOINTS.USERS.GET_CURRENT(this.siteId)),
      {
        headers: {
          'X-Tableau-Auth': this.authToken,
        },
      }
    );

    return response.data.user;
  }

  /**
   * List all workbooks
   */
  async listWorkbooks(): Promise<TableauWorkbook[]> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      console.log('📊 Fetching Tableau workbooks...');

      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.WORKBOOKS.LIST(this.siteId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      const workbooks = response.data.workbooks?.workbook || [];
      console.log(`✅ Found ${workbooks.length} workbooks`);

      return workbooks;
    } catch (error: any) {
      console.error('❌ Failed to fetch workbooks:', error.response?.data || error.message);
      throw new Error(`Failed to fetch workbooks: ${error.message}`);
    }
  }

  /**
   * Get a specific workbook by ID
   */
  async getWorkbook(workbookId: string): Promise<TableauWorkbook> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.WORKBOOKS.GET(this.siteId, workbookId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      return response.data.workbook;
    } catch (error: any) {
      console.error(`❌ Failed to fetch workbook ${workbookId}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch workbook: ${error.message}`);
    }
  }

  /**
   * List views in a workbook
   */
  async getWorkbookViews(workbookId: string): Promise<TableauView[]> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.WORKBOOKS.VIEWS(this.siteId, workbookId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      return response.data.views?.view || [];
    } catch (error: any) {
      console.error(`❌ Failed to fetch views for workbook ${workbookId}:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch workbook views: ${error.message}`);
    }
  }

  /**
   * List all views
   */
  async listViews(): Promise<TableauView[]> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      console.log('📊 Fetching Tableau views...');

      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.VIEWS.LIST(this.siteId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      const views = response.data.views?.view || [];
      console.log(`✅ Found ${views.length} views`);

      return views;
    } catch (error: any) {
      console.error('❌ Failed to fetch views:', error.response?.data || error.message);
      throw new Error(`Failed to fetch views: ${error.message}`);
    }
  }

  /**
   * Get view data (CSV format)
   */
  async getViewData(viewId: string): Promise<TableauViewData> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      console.log(`📈 Fetching data for view ${viewId}...`);

      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.VIEWS.DATA(this.siteId, viewId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
          responseType: 'text',
        }
      );

      // Parse CSV data
      const csvData = response.data;
      const lines = csvData.split('\n').filter((line: string) => line.trim());

      if (lines.length === 0) {
        throw new Error('No data returned from view');
      }

      const columns = lines[0].split(',').map((col: string) => col.trim());
      const data = lines.slice(1).map((line: string) =>
        line.split(',').map((val: string) => val.trim())
      );

      console.log(`✅ Retrieved ${data.length} rows`);

      return {
        viewId,
        columns,
        data,
        totalRowCount: data.length,
      };
    } catch (error: any) {
      console.error(`❌ Failed to fetch view data:`, error.response?.data || error.message);
      throw new Error(`Failed to fetch view data: ${error.message}`);
    }
  }

  /**
   * Get view embed URL
   */
  getViewEmbedUrl(viewId: string, viewUrlName: string): string {
    if (!this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    // Format: https://server/t/site/views/WorkbookName/ViewName
    return `${tableauConfig.serverUrl}/t/${tableauConfig.siteName}/views/${viewUrlName}`;
  }

  /**
   * List all data sources
   */
  async listDataSources(): Promise<TableauDataSource[]> {
    if (!this.authToken || !this.siteId) {
      throw new Error('Not authenticated with Tableau');
    }

    try {
      console.log('💾 Fetching Tableau data sources...');

      const response = await this.axiosInstance.get(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.DATASOURCES.LIST(this.siteId)),
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      const dataSources = response.data.datasources?.datasource || [];
      console.log(`✅ Found ${dataSources.length} data sources`);

      return dataSources;
    } catch (error: any) {
      console.error('❌ Failed to fetch data sources:', error.response?.data || error.message);
      throw new Error(`Failed to fetch data sources: ${error.message}`);
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    if (!this.authToken) {
      return;
    }

    try {
      await this.axiosInstance.post(
        buildTableauApiUrl(TABLEAU_ENDPOINTS.AUTH.SIGNOUT),
        {},
        {
          headers: {
            'X-Tableau-Auth': this.authToken,
          },
        }
      );

      this.authToken = null;
      this.siteId = null;

      console.log('✅ Signed out from Tableau');
    } catch (error: any) {
      console.error('❌ Failed to sign out:', error.message);
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authToken !== null && this.siteId !== null;
  }

  /**
   * Get authentication status
   */
  getAuthStatus() {
    return {
      authenticated: this.isAuthenticated(),
      siteId: this.siteId,
      hasToken: this.authToken !== null,
    };
  }
}

// Singleton instance
export const tableauService = new TableauService();

export default tableauService;
