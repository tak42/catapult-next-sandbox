import type { FrourioSpec } from '@frourio/next';
import { UserPublicSchema } from 'src/shared/schema/user';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    res: {
      200: { body: UserPublicSchema.pick({ name: true }) },
      401: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
