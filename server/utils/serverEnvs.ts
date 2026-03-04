import { z } from 'zod';

import { getLoadedEnvFile, loadEnv, resolveAppEnv } from './loadEnv';

loadEnv();

export const APP_ENV = resolveAppEnv();
export const LOADED_ENV_FILE = getLoadedEnvFile();

const NODE_ENV = z
  .enum(['test', 'development', 'production', 'cli'])
  .default('cli')
  .parse(process.env.NODE_ENV);

const S3_ENDPOINT = z.string().default('').parse(process.env.S3_ENDPOINT);
const S3_BUCKET = z.string().default('').parse(process.env.S3_BUCKET);
const S3_PUBLIC_ENDPOINT = z
  .string()
  .url()
  .default(`${S3_ENDPOINT}/${S3_BUCKET}`)
  .parse(process.env.S3_PUBLIC_ENDPOINT);
const S3_ACCESS_KEY = z.string().default('').parse(process.env.S3_ACCESS_KEY);
const S3_SECRET_KEY = z.string().default('').parse(process.env.S3_SECRET_KEY);
const S3_REGION = z.string().default('').parse(process.env.S3_REGION);

export {
  NODE_ENV,
  S3_ACCESS_KEY,
  S3_BUCKET,
  S3_ENDPOINT,
  S3_PUBLIC_ENDPOINT,
  S3_REGION,
  S3_SECRET_KEY,
};

const AuthProvider = z.enum(['magnito', 'cognito']);

const env = z
  .object({
    AUTH_PROVIDER: AuthProvider.default('magnito'),

    OIDC_ISSUER: z.string().url(),
    OIDC_AUTHORIZATION_ENDPOINT: z.string().url(),
    OIDC_TOKEN_ENDPOINT: z.string().url(),
    OIDC_JWKS_URI: z.string().url(),

    OIDC_CLIENT_ID: z.string().min(1),
    OIDC_CLIENT_SECRET: z.string().optional(),

    OIDC_REDIRECT_URI: z.string().url(),
    OIDC_SCOPE: z.string(),
    APP_BASE_URL: z.string().url(),

    SESSION_COOKIE_NAME: z.string().min(1).default('session'),
    SESSION_COOKIE_SECURE: z.string().transform((v) => v === 'true'),
    SESSION_COOKIE_SAMESITE: z.enum(['Lax', 'Strict', 'None']).default('Lax'),
  })
  .parse(process.env);

export const AUTH_PROVIDER = env.AUTH_PROVIDER;

export const OIDC_ISSUER = env.OIDC_ISSUER;
export const OIDC_AUTHORIZATION_ENDPOINT = env.OIDC_AUTHORIZATION_ENDPOINT;
export const OIDC_TOKEN_ENDPOINT = env.OIDC_TOKEN_ENDPOINT;
export const OIDC_JWKS_URI = env.OIDC_JWKS_URI;

export const OIDC_CLIENT_ID = env.OIDC_CLIENT_ID;
export const OIDC_CLIENT_SECRET = env.OIDC_CLIENT_SECRET;

export const OIDC_REDIRECT_URI = env.OIDC_REDIRECT_URI;

export const OIDC_SCOPE = env.OIDC_SCOPE;

export const APP_BASE_URL = env.APP_BASE_URL;

export const SESSION_COOKIE_NAME = env.SESSION_COOKIE_NAME;
export const SESSION_COOKIE_SECURE = env.SESSION_COOKIE_SECURE;
export const SESSION_COOKIE_SAMESITE = env.SESSION_COOKIE_SAMESITE;
