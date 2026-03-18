import { cookies } from 'next/headers';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SAMESITE,
  SESSION_COOKIE_SECURE,
} from 'server/utils/serverEnvs';
import { readSession, rotateSessionForStepUp, verifyTotpCode } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { createRoute } from './frourio.server';

type AuthorizedSession = {
  sessionId: string;
  name: string;
};

async function resolveAuthorizedSession(): Promise<AuthorizedSession | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) return null;

  const session = readSession(sessionId);
  if (!session) return null;

  return { sessionId, name: session.name };
}

export const { POST } = createRoute({
  post: async ({ body }) => {
    const authorized = await resolveAuthorizedSession();
    if (!authorized) {
      return { status: 401, body: { message: 'Unauthorized' } };
    }

    if (!verifyTotpCode(authorized.name, body.code)) {
      return { status: 401, body: { message: 'Invalid TOTP code' } };
    }

    const nextSessionId = rotateSessionForStepUp(authorized.sessionId, 'totp');
    if (!nextSessionId) {
      return { status: 401, body: { message: 'Unauthorized' } };
    }

    return {
      status: 200,
      headers: {
        'Set-Cookie': serializeSetCookie(SESSION_COOKIE_NAME, nextSessionId, {
          httpOnly: true,
          path: '/',
          sameSite: SESSION_COOKIE_SAMESITE,
          secure: SESSION_COOKIE_SECURE,
        }),
      },
      body: {
        name: authorized.name,
        assuranceLevel: 'step_up',
      },
    };
  },
});
