import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export const getAuthUrl = () => {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
};

export const getTokensFromCode = async (code: string) => {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  return tokens;
};

export const getDriveInstance = (accessToken: string, refreshToken?: string) => {
  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  authClient.setCredentials({
    access_token: accessToken,
    ...(refreshToken && { refresh_token: refreshToken })
  });

  return google.drive({ version: 'v3', auth: authClient });
};

export const getUserInfo = async (accessToken: string) => {
  const authClient = new google.auth.OAuth2();
  authClient.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
  const { data } = await oauth2.userinfo.get();
  return data;
};
