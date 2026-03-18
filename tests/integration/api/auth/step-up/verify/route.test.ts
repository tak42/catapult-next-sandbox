import { beforeEach, describe, expect, test, vi } from 'vitest';

const { cookiesMock, readSessionMock, verifyTotpCodeMock, rotateSessionForStepUpMock } = vi.hoisted(
  () => ({
    cookiesMock: vi.fn(),
    readSessionMock: vi.fn(),
    verifyTotpCodeMock: vi.fn(),
    rotateSessionForStepUpMock: vi.fn(),
  }),
);

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('src/modules/auth/authService', () => ({
  readSession: readSessionMock,
  verifyTotpCode: verifyTotpCodeMock,
  rotateSessionForStepUp: rotateSessionForStepUpMock,
}));

async function loadPOST(): Promise<(req: Request) => Promise<Response>> {
  const route = await import('src/app/api/auth/step-up/verify/route');
  return route.POST;
}

describe('POST /api/auth/step-up/verify', () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    readSessionMock.mockReset();
    verifyTotpCodeMock.mockReset();
    rotateSessionForStepUpMock.mockReset();
  });

  test('認証セッションがなければ401', async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
    readSessionMock.mockReturnValue(null);

    const POST = await loadPOST();
    const res = await POST(
      new Request('http://localhost:3300/api/auth/step-up/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      }),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Unauthorized' });
  });

  test('TOTP検証に失敗したら401', async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'session-id' }),
    });
    readSessionMock.mockReturnValue({
      id: 'session-id',
      name: 'ExampleToken',
      assuranceLevel: 'base',
      methods: ['oidc'],
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 1000,
    });
    verifyTotpCodeMock.mockReturnValue(false);

    const POST = await loadPOST();
    const res = await POST(
      new Request('http://localhost:3300/api/auth/step-up/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      }),
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Invalid TOTP code' });
  });

  test('TOTP成功時はsessionを更新して200', async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue({ value: 'session-id' }),
    });
    readSessionMock.mockReturnValue({
      id: 'session-id',
      name: 'ExampleToken',
      assuranceLevel: 'base',
      methods: ['oidc'],
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 1000,
    });
    verifyTotpCodeMock.mockReturnValue(true);
    rotateSessionForStepUpMock.mockReturnValue('stepup-session-id');

    const POST = await loadPOST();
    const res = await POST(
      new Request('http://localhost:3300/api/auth/step-up/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: '123456' }),
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('set-cookie')).toContain('session=stepup-session-id');
    await expect(res.json()).resolves.toEqual({
      name: 'ExampleToken',
      assuranceLevel: 'step_up',
    });
  });
});
