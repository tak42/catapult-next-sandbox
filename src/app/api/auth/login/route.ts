import { NextResponse } from 'next/server';
import {
  OIDC_AUTHORIZATION_ENDPOINT,
  OIDC_CLIENT_ID,
  OIDC_REDIRECT_URI,
  OIDC_SCOPE,
  SESSION_COOKIE_SECURE,
} from 'server/utils/serverEnvs';
import { createOidcTransaction } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async () => {
    const tx = createOidcTransaction();
    const url = new URL(OIDC_AUTHORIZATION_ENDPOINT);

    url.searchParams.set('client_id', OIDC_CLIENT_ID);
    url.searchParams.set('redirect_uri', OIDC_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', OIDC_SCOPE);
    url.searchParams.set('state', tx.state);
    url.searchParams.set('nonce', tx.nonce);
    url.searchParams.set('code_challenge', tx.challenge);
    url.searchParams.set('code_challenge_method', 'S256');

    const res = NextResponse.redirect(url.toString(), { status: 302 });
    res.headers.set(
      'Set-Cookie',
      serializeSetCookie(
        'oidc_tx',
        JSON.stringify({
          state: tx.state,
          nonce: tx.nonce,
          verifier: tx.verifier,
        }),
        {
          httpOnly: true,
          sameSite: 'Lax',
          path: '/api/auth',
          maxAge: 300,
          secure: SESSION_COOKIE_SECURE,
        },
      ),
    );
    return res;
  },
});
