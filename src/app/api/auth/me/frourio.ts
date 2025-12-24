import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';
import { UserSchema } from '../login/frourio';

export const frourioSpec = {
  get: {
    res: {
      200: { body: UserSchema.pick({ id: true, email: true, user: true }) },
      401: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
