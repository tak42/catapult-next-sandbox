import { beforeEach, describe, expect, test, vi } from 'vitest';

const { cookiesMock, readSessionMock, isStepUpRequiredMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  readSessionMock: vi.fn(),
  isStepUpRequiredMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
}));

vi.mock('src/modules/auth/authService', () => ({
  readSession: readSessionMock,
  isStepUpRequired: isStepUpRequiredMock,
}));

async function loadGET(): Promise<(req: Request) => Promise<Response>> {
  const route = await import('src/app/api/auth/me/route');
  return route.GET;
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.resetModules();
    cookiesMock.mockReset();
    readSessionMock.mockReset();
    isStepUpRequiredMock.mockReset();
  });

  test('sessionがなければ401を返す', async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    });
    readSessionMock.mockReturnValue(null);

    const GET = await loadGET();
    const res = await GET(new Request('http://localhost:3300/api/auth/me'));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ message: 'Unauthorized' });
  });

  test('sessionがあれば認証状態とassuranceを返す', async () => {
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
    isStepUpRequiredMock.mockReturnValue(true);

    const GET = await loadGET();
    const res = await GET(new Request('http://localhost:3300/api/auth/me'));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      name: 'ExampleToken',
      assuranceLevel: 'base',
      stepUpRequired: true,
    });
  });
});
