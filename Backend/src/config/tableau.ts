import dotenv from 'dotenv';

dotenv.config();

/**
 * Tableau Configuration
 */
export const tableauConfig = {
  serverUrl: process.env.TABLEAU_SERVER_URL || 'https://prod-useast-a.online.tableau.com',
  siteName: process.env.TABLEAU_SITE_NAME || '',
  apiVersion: process.env.TABLEAU_API_VERSION || '3.22',

  // OAuth Configuration
  oauth: {
    clientId: process.env.TABLEAU_CLIENT_ID || '',
    clientSecret: process.env.TABLEAU_CLIENT_SECRET || '',
    redirectUri: process.env.TABLEAU_REDIRECT_URI || 'http://localhost:3000/api/tableau/callback',
    scope: 'tableau:content:read tableau:workbooks:read tableau:datasources:read tableau:views:read',
  },

  // Personal Access Token (for testing)
  pat: {
    tokenName: process.env.TABLEAU_TOKEN_NAME || '',
    tokenSecret: process.env.TABLEAU_TOKEN_SECRET || '',
  },

  // Site Details
  siteId: process.env.TABLEAU_SITE_ID || '',
};

/**
 * Validate Tableau configuration
 */
export function validateTableauConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!tableauConfig.serverUrl) missing.push('TABLEAU_SERVER_URL');
  if (!tableauConfig.siteName) missing.push('TABLEAU_SITE_NAME');

  // Check OAuth OR PAT is configured
  const hasOAuth = tableauConfig.oauth.clientId && tableauConfig.oauth.clientSecret;
  const hasPAT = tableauConfig.pat.tokenName && tableauConfig.pat.tokenSecret;

  if (!hasOAuth && !hasPAT) {
    missing.push('TABLEAU_CLIENT_ID & TABLEAU_CLIENT_SECRET (OAuth) OR TABLEAU_TOKEN_NAME & TABLEAU_TOKEN_SECRET (PAT)');
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Build Tableau API URL
 */
export function buildTableauApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${tableauConfig.serverUrl}/api/${tableauConfig.apiVersion}${cleanPath}`;
}

/**
 * Build Tableau OAuth URL
 */
export function buildTableauOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: tableauConfig.oauth.clientId,
    response_type: 'code',
    redirect_uri: tableauConfig.oauth.redirectUri,
    scope: tableauConfig.oauth.scope,
    state: generateRandomState(),
  });

  return `${tableauConfig.serverUrl}/oauth/authorize?${params.toString()}`;
}

/**
 * Generate random state for OAuth
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15);
}

/**
 * Tableau API endpoints
 */
export const TABLEAU_ENDPOINTS = {
  AUTH: {
    SIGNIN: '/auth/signin',
    SIGNOUT: '/auth/signout',
    OAUTH_TOKEN: '/oauth/token',
  },
  WORKBOOKS: {
    LIST: (siteId: string) => `/sites/${siteId}/workbooks`,
    GET: (siteId: string, workbookId: string) => `/sites/${siteId}/workbooks/${workbookId}`,
    VIEWS: (siteId: string, workbookId: string) => `/sites/${siteId}/workbooks/${workbookId}/views`,
  },
  VIEWS: {
    LIST: (siteId: string) => `/sites/${siteId}/views`,
    GET: (siteId: string, viewId: string) => `/sites/${siteId}/views/${viewId}`,
    DATA: (siteId: string, viewId: string) => `/sites/${siteId}/views/${viewId}/data`,
    IMAGE: (siteId: string, viewId: string) => `/sites/${siteId}/views/${viewId}/image`,
  },
  DATASOURCES: {
    LIST: (siteId: string) => `/sites/${siteId}/datasources`,
    GET: (siteId: string, datasourceId: string) => `/sites/${siteId}/datasources/${datasourceId}`,
    CONNECTIONS: (siteId: string, datasourceId: string) => `/sites/${siteId}/datasources/${datasourceId}/connections`,
  },
  USERS: {
    GET_CURRENT: (siteId: string) => `/sites/${siteId}/users/current`,
  },
};

export default tableauConfig;
