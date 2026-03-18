import { beforeEach, describe, expect, test, vi } from 'vitest';

const { issueSessionMock, consumeOidcTransactionMock } = vi.hoisted(() => ({
  issueSessionMock: vi.fn(),
  consumeOidcTransactionMock: vi.fn(),
}));

vi.mock('src/modules/auth/authService', () => ({
  issueSession: issueSessionMock,
  consumeOidcTransaction: consumeOidcTransactionMock,
}));

async function loadGET(): Promise<(req: Request) => Promise<Response>> {
  const route = await import('src/app/api/auth/callback/route');
  return route.GET;
}

describe('GET /api/auth/callback', () => {
  beforeEach(() => {
    vi.resetModules();
    issueSessionMock.mockReset();
    consumeOidcTransactionMock.mockReset();
  });

  test('queryが不正なら401を返す', async () => {
    const GET = await loadGET();
    const req = new Request('http://localhost:3300/api/auth/callback?state=only-state');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Missing code' });
  });

  test('error付きコールバックは401を返す', async () => {
    const GET = await loadGET();
    const req = new Request('http://localhost:3300/api/auth/callback?error=access_denied');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'access_denied' });
  });

  test('stateに対応するトランザクションがなければ401を返す', async () => {
    const GET = await loadGET();
    consumeOidcTransactionMock.mockReturnValue(null);
    const req = new Request('http://localhost:3300/api/auth/callback?code=abc&state=s1');

    const res = await GET(req);

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Invalid state' });
  });

  test('stateが一致すればsession cookie付きで302リダイレクト', async () => {
    const GET = await loadGET();
    issueSessionMock.mockResolvedValue('issued-session-id');
    consumeOidcTransactionMock.mockReturnValue({
      state: 's1',
      nonce: 'n1',
      verifier: 'v1',
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 1000,
    });
    const req = new Request('http://localhost:3300/api/auth/callback?code=abc&state=s1');

    const res = await GET(req);

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3300/');
    expect(res.headers.get('set-cookie')).toContain('session=issued-session-id');
    expect(issueSessionMock).toHaveBeenCalledWith('ExampleToken', {
      assuranceLevel: 'base',
      methods: ['oidc'],
    });
  });
});
