import { authenticate, issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { createRoute } from './frourio.server';

export const { GET, POST } = createRoute({
  get: async () => {
    return { status: 200, body: { value: 'ok' } };
  },
  post: async ({ body }) => {
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
