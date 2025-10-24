import 'express-session';

declare module 'express-session' {
  interface SessionData {
    tokens?: {
      access_token?: string | undefined;
      refresh_token?: string | undefined;
      scope?: string | undefined;
      token_type?: string | undefined;
      expiry_date?: number | undefined;
    };
    user?: {
      id?: string | undefined;
      email?: string | undefined;
      verified_email?: boolean | undefined;
      name?: string | undefined;
      given_name?: string | undefined;
      family_name?: string | undefined;
      picture?: string | undefined;
      locale?: string | undefined;
    };
  }
}
