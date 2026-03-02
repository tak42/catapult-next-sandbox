import { beforeEach, describe, expect, test, vi } from 'vitest';

const { issueSessionMock, getCookieMock } = vi.hoisted(() => ({
  issueSessionMock: vi.fn(),
  getCookieMock: vi.fn(),
}));

vi.mock('src/modules/auth/authService', () => ({
  issueSession: issueSessionMock,
}));

vi.mock('next/headers', () => ({
  cookies: async (): Promise<{ get: typeof getCookieMock }> => ({
    get: getCookieMock,
  }),
}));

import { GET } from 'src/app/api/auth/callback/route';

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    issueSessionMock.mockReset();
    getCookieMock.mockReset();
  });

  test('queryが不正なら401を返す', async () => {
    const req = new Request('http://localhost:3300/api/auth/callback?state=only-state');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Missing code' });
  });

  test('error付きコールバックは401を返す', async () => {
    const req = new Request('http://localhost:3300/api/auth/callback?error=access_denied');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'access_denied' });
  });

  test('oidc_tx cookieがない場合は401を返す', async () => {
    getCookieMock.mockReturnValue(undefined);
    const req = new Request('http://localhost:3300/api/auth/callback?code=abc&state=s1');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Invalid oidc_tx cookie' });
  });

  test('stateが一致すればsession cookie付きで302リダイレクト', async () => {
    getCookieMock.mockReturnValue({ value: JSON.stringify({ state: 's1', verifier: 'v1' }) });
    issueSessionMock.mockResolvedValue('issued-session-id');
    const req = new Request('http://localhost:3300/api/auth/callback?code=abc&state=s1');

    const res = await GET(req);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3300/');
    expect(res.headers.get('set-cookie')).toContain('session=issued-session-id');
    expect(issueSessionMock).toHaveBeenCalledWith('ExampleToken');
  });
});
