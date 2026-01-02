import { cookies } from 'next/headers';
import { verifySession } from 'src/modules/auth/authService';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async () => {
    const cookieStore = await cookies();
    const session = cookieStore.get('session');
    const userName = verifySession(session?.value);

    if (!userName) return { status: 401, body: { message: `Unauthorized` } };

    return { status: 200, body: { name: userName } };
  },
});
