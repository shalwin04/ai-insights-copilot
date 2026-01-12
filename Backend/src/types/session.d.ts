import 'express-session';

declare module 'express-session' {
  interface SessionData {
    user?: {
      id: string;
      email?: string;
      name?: string;
    };
    tokens?: {
      access_token: string;
      refresh_token?: string;
      expiry_date?: number;
    };
    tableauAuth?: {
      token: string;
      siteId: string;
      userId: string;
      expiresAt?: string;
    };
    uploadedFiles?: Array<{
      originalName: string;
      filename: string;
      size: number;
      uploadedAt: string;
      path: string;
    }>;
  }
}
