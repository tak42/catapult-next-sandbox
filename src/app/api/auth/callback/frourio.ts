import { SetCookieHeaderValueSchema } from 'src/shared/http/cookie';
import { z } from 'zod';

export const AuthCallbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: z.string().optional(),
    error: z.string().optional(),
  })
  .superRefine((query, ctx) => {
    if (query.error) return;

    if (!query.code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing code',
        path: ['code'],
      });
    }

    if (!query.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Missing state',
        path: ['state'],
      });
    }
  });

export const frourioSpec = {
  get: {
    query: AuthCallbackQuerySchema,
    res: {
      302: {
        headers: z.object({
          'Set-Cookie': SetCookieHeaderValueSchema,
          Location: z.string(),
        }),
      },
      401: { body: z.object({ message: z.string() }) },
    },
  },
};
