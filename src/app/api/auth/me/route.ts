import { cookies } from 'next/headers';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async () => {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');

    if (session?.value !== 'user-123') return { status: 401, body: { message: `Unauthorized` } };

    return { status: 200, body: { id: '1', email: 'user@example.com', user: 'Example User' } };
  },
});
