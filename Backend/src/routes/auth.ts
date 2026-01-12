import express, { type Request, type Response } from "express";
import {
  getAuthUrl,
  getTokensFromCode,
  getUserInfo,
} from "../config/googleOAuth.js";
import { deleteUserData } from "../services/ingestion.js";

const router = express.Router();

// Initiate OAuth flow
router.get("/google", (req: Request, res: Response) => {
  const url = getAuthUrl();
  res.json({ authUrl: url });
});

// OAuth callback endpoint
router.get("/google/callback", async (req: Request, res: Response) => {
  const { code } = req.query;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Authorization code is required" });
  }

  try {
    const tokens = await getTokensFromCode(code);

    // Get user info
    const userInfo = await getUserInfo(tokens.access_token!);

    // Store tokens in session or send to frontend
    if (req.session) {
      req.session.tokens = {
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      } as any;
      req.session.user = {
        id: userInfo.id || 'unknown',
        email: userInfo.email,
        name: userInfo.name,
      } as any;
    }

    // Send HTML that posts a message to the opener (frontend) and then closes.
    // Using postMessage avoids polling `window.closed` from the opener which can be blocked
    // by Cross-Origin-Opener-Policy on some browsers.
    const FRONTEND_URL = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Authentication Successful</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
            .center { display:flex; align-items:center; justify-content:center; height:100vh; }
            .card { text-align:center; background:#fff; padding:24px; border-radius:8px; box-shadow:0 6px 24px rgba(0,0,0,0.08); }
          </style>
        </head>
        <body>
          <div class="center">
            <div class="card">
              <h2>Authentication Successful</h2>
              <p>You can close this window — the application will continue automatically.</p>
            </div>
          </div>
          <script>
            (function(){
              try {
                // Use wildcard targetOrigin here; the frontend will validate the
                // sender origin (the backend API origin) before acting. This
                // avoids mismatches between configured FRONTEND_URL and the
                // actual caller origin in dev vs prod.
                const payload = { type: 'oauth', success: true };
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(payload, '*');
                }
              } catch (e) {
                // ignore
              }
              setTimeout(() => { try { window.close(); } catch(e){} }, 700);
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    const FRONTEND_URL = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/+$/, "");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Authentication Failed</title>
          <style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}.center{display:flex;align-items:center;justify-content:center;height:100vh}.card{background:#fff;padding:24px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,0.08);text-align:center}</style>
        </head>
        <body>
          <div class="center"><div class="card"><h2>Authentication Failed</h2><p>Please close this window and try again.</p></div></div>
          <script>
            (function(){
              try {
                const payload = { type: 'oauth', success: false };
                if (window.opener && !window.opener.closed) {
                  window.opener.postMessage(payload, '*');
                }
              } catch (e) {}
              setTimeout(() => { try { window.close(); } catch(e){} }, 1200);
            })();
          </script>
        </body>
      </html>
    `);
  }
});

// Get current user info
router.get("/user", (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    // Check if user has access token (simplified scope check)
    const hasRequiredScope = !!req.session.tokens?.access_token;

    if (!hasRequiredScope) {
      // Old tokens without proper scope - force logout
      console.log(
        "⚠️  User has insufficient OAuth scopes - forcing re-authentication"
      );
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
      });
      return res.json({
        authenticated: false,
        message: "Please re-authenticate with updated permissions",
      });
    }

    res.json({ user: req.session.user, authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Logout
router.post("/logout", async (req: Request, res: Response) => {
  if (req.session && req.session.user) {
    const userId = req.session.user.id;

    // Delete user data from Elasticsearch
    if (userId) {
      try {
        await deleteUserData(userId);
      } catch (error) {
        console.error("Error deleting user data during logout:", error);
        // Continue with logout even if cleanup fails
      }
    }

    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  } else {
    res.json({ message: "No active session" });
  }
});

export default router;
