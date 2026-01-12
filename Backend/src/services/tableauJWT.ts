import jwt from 'jsonwebtoken';
import axios from 'axios';
import { tableauConfig, buildTableauApiUrl, TABLEAU_ENDPOINTS } from '../config/tableau.js';
import type { TableauAuthCredentials } from '../types/tableau.js';

/**
 * Tableau Direct Trust (JWT) Authentication
 *
 * Direct Trust uses JWT tokens signed with a Connected App secret
 * to authenticate without user interaction.
 */

interface JWTAuthConfig {
  clientId: string;
  secretId: string;
  secretValue: string;
  username: string;
  scopes: string[];
}

/**
 * Generate JWT token for Tableau Direct Trust
 */
export function generateTableauJWT(config: JWTAuthConfig): string {
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: config.clientId,          // Connected App Client ID
    sub: config.username,           // Tableau username
    aud: 'tableau',                 // Always 'tableau'
    exp: now + 300,                 // Expires in 5 minutes
    jti: generateJTI(),             // Unique token ID
    scp: config.scopes,             // Requested scopes
  };

  // Sign with the secret value
  const token = jwt.sign(payload, config.secretValue, {
    algorithm: 'HS256',
    header: {
      kid: config.secretId,         // Secret ID from Connected App
      typ: 'JWT',
      alg: 'HS256',
    } as any,
  });

  return token;
}

/**
 * Generate unique JTI (JWT ID)
 */
function generateJTI(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate JWT token specifically for embedding visualizations
 * This token is used by the browser to authenticate embedded content
 */
export function generateEmbeddingJWT(username?: string): string {
  const now = Math.floor(Date.now() / 1000);

  // For embedding, we need Connected App credentials
  const connectedAppClientId = process.env.TABLEAU_CONNECTED_APP_CLIENT_ID || process.env.TABLEAU_CLIENT_ID!;
  const connectedAppSecretId = process.env.TABLEAU_CONNECTED_APP_SECRET_ID || process.env.TABLEAU_SECRET_ID!;
  const connectedAppSecretValue = process.env.TABLEAU_CONNECTED_APP_SECRET_VALUE || process.env.TABLEAU_CLIENT_SECRET!;
  const tableauUsername = username || process.env.TABLEAU_USERNAME || 'default';

  console.log('🔐 Generating embedding JWT token...');
  console.log(`   Client ID: ${connectedAppClientId?.substring(0, 20)}...`);
  console.log(`   Secret ID: ${connectedAppSecretId?.substring(0, 20)}...`);
  console.log(`   Username: ${tableauUsername}`);

  const config: JWTAuthConfig = {
    clientId: connectedAppClientId,
    secretId: connectedAppSecretId,
    secretValue: connectedAppSecretValue,
    username: tableauUsername,
    scopes: ['tableau:views:embed', 'tableau:views:embed_authoring'],
  };

  const payload = {
    iss: config.clientId,
    sub: config.username,
    aud: 'tableau',
    exp: now + 600, // 10 minutes for embedding
    jti: generateJTI(),
    scp: config.scopes,
  };

  const token = jwt.sign(payload, config.secretValue, {
    algorithm: 'HS256',
    header: {
      kid: config.secretId,
      typ: 'JWT',
      alg: 'HS256',
    } as any,
  });

  console.log('✅ Embedding JWT token generated successfully');
  return token;
}

/**
 * Authenticate with Tableau using JWT (Direct Trust)
 */
export async function authenticateWithJWT(
  username: string,
  secretId: string,
  secretValue?: string,
  clientId?: string
): Promise<TableauAuthCredentials> {
  try {
    console.log('🔐 Authenticating with Tableau Direct Trust (JWT)...');

    const jwtConfig: JWTAuthConfig = {
      clientId: clientId || tableauConfig.oauth.clientId,
      secretId: secretId,
      secretValue: secretValue || tableauConfig.oauth.clientSecret,
      username: username,
      scopes: [
        'tableau:content:read',
        'tableau:workbooks:read',
        'tableau:datasources:read',
        'tableau:views:read',
      ],
    };

    // Generate JWT token
    const jwtToken = generateTableauJWT(jwtConfig);
    console.log('✅ JWT token generated');

    // Exchange JWT for Tableau session token
    const response = await axios.post(
      buildTableauApiUrl(TABLEAU_ENDPOINTS.AUTH.SIGNIN),
      {
        credentials: {
          jwt: jwtToken,
          site: {
            contentUrl: tableauConfig.siteName,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      }
    );

    const { token, site, user } = response.data.credentials;

    console.log('✅ Tableau authentication successful');
    console.log(`   Site ID: ${site.id}`);
    console.log(`   User ID: ${user.id}`);

    return {
      token,
      siteId: site.id,
      userId: user.id,
    };
  } catch (error: any) {
    console.error('❌ JWT authentication failed:', error.response?.data || error.message);
    throw new Error(
      `Tableau JWT authentication failed: ${
        error.response?.data?.error?.summary || error.message
      }`
    );
  }
}
