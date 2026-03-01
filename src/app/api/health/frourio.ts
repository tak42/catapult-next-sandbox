import { z } from 'zod';

export const frourioSpec = {
  get: { res: { 200: { body: z.literal('ok') } } },
};
