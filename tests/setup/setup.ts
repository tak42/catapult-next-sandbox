import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { spawn } from 'child_process';
import type { SetupServerApi } from 'msw/lib/node';
import type * as routerMock from 'next-router-mock';
import type * as nextNavigation from 'next/navigation';
import { ulid } from 'ulid';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { setupMsw } from './setupMsw';
import { patchFilePrototype } from './setupMswHandlers';
import { deleteS3Bucket, resetS3Bucket } from './setupUtils';

function applyTestEnvDefaults(): void {
  const defaults: Record<string, string> = {
    S3_ENDPOINT: 'http://localhost:9010',
    S3_BUCKET: 'app',
    S3_ACCESS_KEY: 'minio',
    S3_SECRET_KEY: 'password',
    S3_REGION: 'ap-northeast-1',
    AUTH_PROVIDER: 'magnito',
    OIDC_ISSUER: 'http://localhost:5050/ap-northeast-1_example',
    OIDC_AUTHORIZATION_ENDPOINT: 'http://localhost:5050/oauth2/authorize',
    OIDC_TOKEN_ENDPOINT: 'http://localhost:5050/oauth2/token',
    OIDC_JWKS_URI: 'http://localhost:5050/ap-northeast-1_example/.well-known/jwks.json',
    OIDC_CLIENT_ID: 'example-client-name',
    OIDC_REDIRECT_URI: 'http://localhost:3300/api/auth/callback',
    OIDC_SCOPE: 'openid email profile',
    APP_BASE_URL: 'http://localhost:3300',
    SESSION_COOKIE_NAME: 'session',
    SESSION_COOKIE_SECURE: 'false',
    SESSION_COOKIE_SAMESITE: 'Lax',
  };

  Object.entries(defaults).forEach(([key, value]) => {
    process.env[key] ??= value;
  });
}

applyTestEnvDefaults();

function createPrismaClient(): PrismaClient {
  return new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
}

vi.mock('server/service/prismaClient', async () => {
  process.env.DATABASE_URL = process.env.DATABASE_URL!.replace(/[^/]+$/, `test-${ulid()}`);

  return { prismaClient: createPrismaClient() };
});

vi.mock('server/utils/serverEnvs', async () => {
  const { S3_BUCKET } = await setupS3();

  process.env.S3_BUCKET = S3_BUCKET;

  return {
    NODE_ENV: 'test',
    S3_ENDPOINT: process.env.S3_ENDPOINT!,
    S3_BUCKET,
    S3_PUBLIC_ENDPOINT: process.env.S3_PUBLIC_ENDPOINT || `${process.env.S3_ENDPOINT}/${S3_BUCKET}`,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY!,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY!,
    S3_REGION: process.env.S3_REGION!,
    AUTH_PROVIDER: process.env.AUTH_PROVIDER!,
    OIDC_ISSUER: process.env.OIDC_ISSUER!,
    OIDC_AUTHORIZATION_ENDPOINT: process.env.OIDC_AUTHORIZATION_ENDPOINT!,
    OIDC_TOKEN_ENDPOINT: process.env.OIDC_TOKEN_ENDPOINT!,
    OIDC_JWKS_URI: process.env.OIDC_JWKS_URI!,
    OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID!,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET,
    OIDC_REDIRECT_URI: process.env.OIDC_REDIRECT_URI!,
    OIDC_SCOPE: process.env.OIDC_SCOPE!,
    APP_BASE_URL: process.env.APP_BASE_URL!,
    SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME!,
    SESSION_COOKIE_SECURE: process.env.SESSION_COOKIE_SECURE === 'true',
    SESSION_COOKIE_SAMESITE: process.env.SESSION_COOKIE_SAMESITE as 'Lax' | 'Strict' | 'None',
  };
});

// https://github.com/vercel/next.js/discussions/63100#discussioncomment-8737391
vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof nextNavigation>();
  const { useRouter } = await vi.importActual<typeof routerMock>('next-router-mock');
  const usePathname = vi.fn().mockImplementation(() => {
    const router = useRouter();
    return router.pathname;
  });
  const useSearchParams = vi.fn().mockImplementation(() => {
    const router = useRouter();

    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    return new URLSearchParams(router.query.toString());
  });

  return {
    ...actual,
    useRouter: (): { replace: (_href: string) => Promise<void> } => ({
      replace: (_href: string) => Promise.resolve(),
    }),
    usePathname,
    useSearchParams,
  };
});

let server: SetupServerApi;

beforeAll(() => {
  server = setupMsw();
  global.alert = (message: string): void => console.error(message);

  patchFilePrototype();
});

beforeEach(async () => {
  await new Promise((resolve, reject) => {
    const proc = spawn('npx', ['prisma', 'migrate', 'reset', '--force'], {
      // stdio: 'inherit',
    });

    proc.once('close', resolve);
    proc.once('error', reject);
  });
}, 20000);

afterEach(async () => {
  await resetS3Bucket(createS3Client());
  await createPrismaClient().$disconnect();

  cleanup();
  vi.clearAllMocks();

  if ('document' in global) {
    localStorage.clear();
    document.cookie.split(';').forEach((cookie) => {
      document.cookie = `${cookie.split('=')[0].trim()}=; Max-Age=0; path=/`;
    });
  }
});

afterAll(async () => {
  server.close();

  await deleteS3Bucket(createS3Client());
});

function createS3Client(): S3Client {
  return new S3Client({
    forcePathStyle: true,
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9010',
    region: process.env.S3_REGION || 'ap-northeast-1',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || 'minio',
      secretAccessKey: process.env.S3_SECRET_KEY || 'password',
    },
  });
}

async function setupS3(): Promise<{ S3_BUCKET: string }> {
  const S3_BUCKET = `test-${ulid().toLowerCase()}`;

  await createS3Client().send(new CreateBucketCommand({ Bucket: S3_BUCKET }));

  return { S3_BUCKET };
}
