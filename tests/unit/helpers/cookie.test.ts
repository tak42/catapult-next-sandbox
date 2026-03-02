import { normalizeCookieOptions, serializeSetCookie } from 'src/shared/http/cookie';
import { describe, expect, test } from 'vitest';

describe('normalizeCookieOptions', () => {
  test('デフォルト値を補完する', () => {
    expect(normalizeCookieOptions({})).toEqual({
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
    });
  });

  test('SameSite=None かつ secure=false はエラー', () => {
    expect(() => normalizeCookieOptions({ sameSite: 'None', secure: false })).toThrow(
      'Cookie option "secure" must be true when SameSite is "None"',
    );
  });
});

describe('serializeSetCookie', () => {
  test('セッションCookieをSet-Cookieヘッダ形式で組み立てる', () => {
    expect(
      serializeSetCookie('session', 'token value', {
        path: '/',
        sameSite: 'Lax',
        httpOnly: true,
        secure: false,
      }),
    ).toBe('session=token%20value; Path=/; SameSite=Lax; HttpOnly');
  });

  test('domain を含むOIDCトランザクションCookieを発行できる', () => {
    expect(
      serializeSetCookie('oidc_tx', '{"state":"abc"}', {
        path: '/api/auth',
        sameSite: 'Lax',
        httpOnly: true,
        secure: true,
        domain: 'example.com',
      }),
    ).toContain('Domain=example.com');
  });
});
