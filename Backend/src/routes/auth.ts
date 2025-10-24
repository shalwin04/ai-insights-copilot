import express, { type Request, type Response } from 'express';
import { getAuthUrl, getTokensFromCode, getUserInfo } from '../config/googleOAuth.js';
import { deleteUserData } from '../services/ingestion.js';

const router = express.Router();

// Initiate OAuth flow
router.get('/google', (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.json({ authUrl: url });
});

// OAuth callback endpoint
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Authorization code is required' });
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token!);

    // Store tokens in session or send to frontend
    if (req.session) {
      req.session.tokens = {
        ...(tokens.access_token && { access_token: tokens.access_token }),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        ...(tokens.scope && { scope: tokens.scope }),
        ...(tokens.token_type && { token_type: tokens.token_type }),
        ...(tokens.expiry_date && { expiry_date: tokens.expiry_date }),
      };
      req.session.user = {
        ...(userInfo.id && { id: userInfo.id }),
        ...(userInfo.email && { email: userInfo.email }),
        ...(userInfo.verified_email !== undefined && userInfo.verified_email !== null && { verified_email: userInfo.verified_email }),
        ...(userInfo.name && { name: userInfo.name }),
        ...(userInfo.given_name && { given_name: userInfo.given_name }),
        ...(userInfo.family_name && { family_name: userInfo.family_name }),
        ...(userInfo.picture && { picture: userInfo.picture }),
        ...(userInfo.locale && { locale: userInfo.locale }),
      };
    }

    // Send HTML to close the popup window
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .success {
              font-size: 60px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✓</div>
            <h1>Authentication Successful!</h1>
            <p>This window will close automatically...</p>
          </div>
          <script>
            setTimeout(() => {
              window.close();
            }, 1500);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during OAuth callback:', error);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .error {
              font-size: 60px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin-bottom: 10px;
            }
            p {
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="error">✗</div>
            <h1>Authentication Failed</h1>
            <p>Please close this window and try again.</p>
          </div>
          <script>
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }
});

// Get current user info
router.get('/user', (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    // Check if user has the required scope
    const scope = req.session.tokens?.scope || '';
    const hasRequiredScope = scope.includes('drive.readonly') || scope.includes('drive');

    if (!hasRequiredScope) {
      // Old tokens without proper scope - force logout
      console.log('⚠️  User has insufficient OAuth scopes - forcing re-authentication');
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
      return res.json({
        authenticated: false,
        message: 'Please re-authenticate with updated permissions'
      });
    }

    res.json({ user: req.session.user, authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/logout', async (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;

    // Delete user data from Elasticsearch
    if (userId) {
      try {
        await deleteUserData(userId);
      } catch (error) {
        console.error('Error deleting user data during logout:', error);
        // Continue with logout even if cleanup fails
      }
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  } else {
    res.json({ message: 'No active session' });
  }
});

export default router;
