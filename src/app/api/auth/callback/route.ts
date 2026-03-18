import { NextResponse } from 'next/server';
import {
  APP_BASE_URL,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SAMESITE,
  SESSION_COOKIE_SECURE,
} from 'server/utils/serverEnvs';
import { consumeOidcTransaction, issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { createRoute } from './frourio.server';

function createInvalidQueryResponse(message: string | undefined): NextResponse {
  return NextResponse.json({ message: message || 'Invalid callback query' }, { status: 401 });
}

function createRedirectWithSession(sessionId: string): NextResponse {
  const res = NextResponse.redirect(new URL('/', APP_BASE_URL), { status: 302 });
  res.headers.set(
    'Set-Cookie',
    serializeSetCookie(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: SESSION_COOKIE_SAMESITE,
      secure: SESSION_COOKIE_SECURE,
    }),
  );

  // Cleanup stale login transaction cookie after successful callback.
  res.headers.append(
    'Set-Cookie',
    serializeSetCookie('oidc_tx', '', {
      httpOnly: true,
      path: '/api/auth',
      sameSite: SESSION_COOKIE_SAMESITE,
      secure: SESSION_COOKIE_SECURE,
      maxAge: 0,
    }),
  );

  return res;
}

export const { GET } = createRoute({
  get: async ({ query }) => {
    if (query.error) return createInvalidQueryResponse(query.error);
    if (!query.code) return createInvalidQueryResponse('Missing code');
    if (!query.state) return createInvalidQueryResponse('Missing state');

    const tx = consumeOidcTransaction(query.state);
    if (!tx) return createInvalidQueryResponse('Invalid state');

    const sessionId = await issueSession('ExampleToken', {
      assuranceLevel: 'base',
      methods: ['oidc'],
    });

    return createRedirectWithSession(sessionId);
  },
});
