import type { FrourioSpec } from '@frourio/next';
import { SetCookieHeaderValueSchema } from 'src/shared/http/cookie';
import { LoginRequestSchema, UserPublicSchema } from 'src/shared/schema/user';
import { z } from 'zod';

export const frourioSpec = {
  get: {},
  post: {
    body: LoginRequestSchema,
    res: {
      201: {
        body: UserPublicSchema,
        headers: z.object({
          'Set-Cookie': SetCookieHeaderValueSchema,
        }),
      },
      401: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
