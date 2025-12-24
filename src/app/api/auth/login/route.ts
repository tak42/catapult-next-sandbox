import { cookies } from 'next/headers';
import { createRoute } from './frourio.server';

export const { GET, POST } = createRoute({
  get: async () => {
    return { status: 200, body: { value: 'ok' } };
  },
  post: async ({ body }) => {
    if (!body.email.endsWith('@example.com') || body.password !== 'test1234')
      return { status: 401, body: { message: 'Invalid email or password' } };

    const cookieStore = await cookies();
    cookieStore.set('session', 'user-123', { path: '/' });

    return {
      status: 200,
      body: { id: '1', email: 'user@example.com', user: 'Example User' },
    };
  },
});
