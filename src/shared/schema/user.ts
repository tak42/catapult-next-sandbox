import { z } from 'zod';

const UserBaseSchema = z.object({
  id: z.string(),
  email: z.string(),
  password: z.string(),
  name: z.string(),
});

export const UserPublicSchema = UserBaseSchema.pick({ id: true, email: true, name: true });

export const LoginRequestSchema = z.object({
  email: z.string(),
  password: z.string(),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
