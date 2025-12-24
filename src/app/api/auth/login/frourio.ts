import type { FrourioSpec } from '@frourio/next';
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string(),
  user: z.string(),
});

export const frourioSpec = {
  get: {
    res: { 200: { body: z.object({ value: z.string() }) } },
  },
  post: {
    body: UserSchema.pick({ email: true, password: true }),
    res: {
      200: { body: UserSchema.omit({ password: true }) },
      401: { body: z.object({ message: z.string() }) },
    },
  },
} satisfies FrourioSpec;
