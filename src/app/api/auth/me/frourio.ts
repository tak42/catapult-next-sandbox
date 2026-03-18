import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const frourioSpec = {
  get: {
    res: {
      200: {
        body: z.object({
          name: z.string(),
          assuranceLevel: z.enum(['base', 'step_up']),
          stepUpRequired: z.boolean(),
        }),
      },
      401: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
