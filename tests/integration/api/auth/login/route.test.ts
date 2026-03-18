import { beforeEach, describe, expect, test, vi } from 'vitest';

async function loadGET(): Promise<(req: Request) => Promise<Response>> {
  const route = await import('src/app/api/auth/login/route');
  return route.GET;
}

describe('GET /api/auth/login', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  test('OIDC authorize endpointへ302リダイレクトし、oidc_tx cookieを発行する', async () => {
    const GET = await loadGET();
    const req = new Request('http://localhost:3300/api/auth/login');

    const res = await GET(req);

    expect(res.status).toBe(302);
    const location = res.headers.get('location');
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location!);
    expect(redirectUrl.origin).toBe('http://localhost:5050');
    expect(redirectUrl.searchParams.get('client_id')).toBe('example-client-name');
    expect(redirectUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3300/api/auth/callback',
    );
    expect(redirectUrl.searchParams.get('response_type')).toBe('code');
    expect(redirectUrl.searchParams.get('scope')).toBe('openid email profile');
    expect(redirectUrl.searchParams.get('state')).toBeTruthy();
    expect(redirectUrl.searchParams.get('nonce')).toBeTruthy();
    expect(redirectUrl.searchParams.get('code_challenge')).toBeTruthy();
    expect(redirectUrl.searchParams.get('code_challenge_method')).toBe('S256');

    const setCookie = res.headers.get('set-cookie');
    expect(setCookie).toContain('oidc_tx=');
    expect(setCookie).toContain('Path=/api/auth');
    expect(setCookie).toContain('HttpOnly');
  });
});
