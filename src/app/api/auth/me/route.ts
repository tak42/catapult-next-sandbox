import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from 'server/utils/serverEnvs';
import { isStepUpRequired, readSession } from 'src/modules/auth/authService';
import { createRoute } from './frourio.server';

export const { GET } = createRoute({
  get: async () => {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const session = readSession(sessionCookie);

    if (!session) return { status: 401, body: { message: 'Unauthorized' } };

    return {
      status: 200,
      body: {
        name: session.name,
        assuranceLevel: session.assuranceLevel,
        stepUpRequired: isStepUpRequired(session),
      },
    };
  },
});
