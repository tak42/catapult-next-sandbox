import { z } from 'zod';

export const SetCookieHeaderValueSchema = z.string().brand<'SetCookieHeaderValue'>();
export type SetCookieHeaderValue = z.infer<typeof SetCookieHeaderValueSchema>;

export type SameSite = 'Strict' | 'Lax' | 'None';

type BaseCookieOptions = {
  domain?: string;
  expires?: Date;
  maxAge?: number;
};

export type CookieOptions = BaseCookieOptions & {
  path: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSite;
};

export type CookieOptionsInput = BaseCookieOptions & {
  path?: string;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: SameSite;
};

export function normalizeCookieOptions(options: CookieOptionsInput): CookieOptions {
  const normalized: CookieOptions = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    ...options,
  };

  if (normalized.sameSite === 'None' && !normalized.secure) {
    throw new Error('Cookie option "secure" must be true when SameSite is "None"');
  }

  return normalized;
}

export function serializeSetCookie(
  name: string,
  value: string,
  options: CookieOptionsInput = {},
): SetCookieHeaderValue {
  const normalized = normalizeCookieOptions(options);

  return SetCookieHeaderValueSchema.parse(buildSetCookieString(name, value, normalized));
}

function pushIf(parts: string[], condition: boolean, part: string): void {
  if (condition) parts.push(part);
}

function buildSetCookieString(name: string, value: string, options: CookieOptions): string {
  const parts: string[] = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
  ];

  pushIf(parts, typeof options.domain === 'string', `Domain=${options.domain}`);
  pushIf(parts, options.httpOnly, 'HttpOnly');
  pushIf(parts, options.secure, 'Secure');

  return parts.join('; ');
}
