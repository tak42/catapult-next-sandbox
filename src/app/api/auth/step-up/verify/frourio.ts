import type { FrourioSpec } from '@frourio/next';
import { SetCookieHeaderValueSchema } from 'src/shared/http/cookie';
import { z } from 'zod';

export const StepUpVerifyRequestSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
});

export const frourioSpec = {
  post: {
    body: StepUpVerifyRequestSchema,
    res: {
      200: {
        headers: z.object({
          'Set-Cookie': SetCookieHeaderValueSchema,
        }),
        body: z.object({
          name: z.string(),
          assuranceLevel: z.literal('step_up'),
        }),
      },
      401: {
        body: z.object({ message: z.string() }),
      },
    },
  },
} satisfies FrourioSpec;
