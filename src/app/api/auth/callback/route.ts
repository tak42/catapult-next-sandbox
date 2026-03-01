import { cookies } from 'next/headers';
import { SESSION_COOKIE_SECURE } from 'server/utils/serverEnvs';
import { issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { createRoute } from './frourio.server';

type OidcTx = {
  state: string;
  verifier: string;
};

export const { GET } = createRoute({
  get: async ({ query }) => {
    const authError = await validateAuthCallback(query.error, query.state);
    if (authError) return { status: 401, body: { message: authError } };

    const sessionId = await issueSession('ExampleToken');

    return {
      status: 302,
      headers: {
        'Set-Cookie': serializeSetCookie('session', sessionId, {
          httpOnly: true,
          path: '/',
          sameSite: 'Lax',
          secure: SESSION_COOKIE_SECURE,
        }),
        Location: '/',
      },
    };
  },
});

async function validateAuthCallback(
  error: string | undefined,
  state: string | undefined,
): Promise<string | null> {
  if (error) return error;

  const oidcTx = await loadOidcTxFromCookie();
  if (!oidcTx) return 'Invalid oidc_tx cookie';
  if (oidcTx.state !== state) return 'Invalid state';

  return null;
}

async function loadOidcTxFromCookie(): Promise<OidcTx | null> {
  const cookieStore = await cookies();
  const oidcTxCookie = cookieStore.get('oidc_tx');
  if (!oidcTxCookie) return null;

  const parsed = parseJsonUnknown(oidcTxCookie.value);
  if (!parsed.ok || !isOidcTx(parsed.value)) return null;

  return parsed.value;
}

function parseJsonUnknown(json: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch {
    return { ok: false };
  }
}

function isOidcTx(value: unknown): value is OidcTx {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.state === 'string' && typeof record.verifier === 'string';
}
