import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  OIDC_AUTHORIZATION_ENDPOINT,
  OIDC_CLIENT_ID,
  OIDC_REDIRECT_URI,
  OIDC_SCOPE,
  SESSION_COOKIE_SECURE,
} from 'server/utils/serverEnvs';
import { authenticate, issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import type { LoginRequest } from 'src/shared/schema/user';
import { createRoute } from './frourio.server';

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32)); // 43〜128 chars くらいになればOK
  const challenge = base64url(createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

export const { GET, POST } = createRoute({
  get: async () => {
    const pkce = createPkce();
    const state = randomUUID();
    const tx = JSON.stringify({ state, verifier: pkce.verifier });
    const url = new URL(OIDC_AUTHORIZATION_ENDPOINT);

    url.searchParams.set('client_id', OIDC_CLIENT_ID);
    url.searchParams.set('redirect_uri', OIDC_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', OIDC_SCOPE);
    url.searchParams.set('state', state);
    url.searchParams.set('code_challenge', pkce.challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    return {
      status: 302,
      headers: {
        'Set-Cookie': serializeSetCookie('oidc_tx', tx, {
          httpOnly: true,
          sameSite: 'Lax',
          path: '/api/auth',
          maxAge: 300,
          secure: SESSION_COOKIE_SECURE,
        }),
        Location: url.toString(),
      },
    };
  },
  post: async ({ body }: { body: LoginRequest }) => {
    const canAuth = await authenticate(body.email, body.password);
    if (!canAuth) return { status: 401, body: { message: 'Invalid email or password' } };

    const sessionId = await issueSession('ExampleUserId');
    return {
      status: 201,
      headers: {
        'Set-Cookie': serializeSetCookie('session', sessionId, {
          httpOnly: true,
          path: '/',
          sameSite: 'Lax',
          secure: true,
        }),
      },
      body: { id: '1', email: 'user@example.com', name: 'ExampleUserId' },
    };
  },
});
