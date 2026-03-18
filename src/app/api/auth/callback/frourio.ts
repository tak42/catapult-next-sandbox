import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const AuthCallbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const frourioSpec = {
  get: {
    query: AuthCallbackQuerySchema,
  },
} satisfies FrourioSpec;
