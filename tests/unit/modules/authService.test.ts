import { authenticate, issueSession, verifySession } from 'src/modules/auth/authService';
import { sessionMap } from 'src/modules/auth/sessionStore';
import { beforeEach, describe, expect, test } from 'vitest';

describe('authService', () => {
  beforeEach(() => {
    sessionMap.clear();
  });

  test('example.comドメインと固定パスワードのみ認証成功', async () => {
    await expect(authenticate('user@example.com', 'test1234')).resolves.toBe(true);
    await expect(authenticate('user@invalid.com', 'test1234')).resolves.toBe(false);
    await expect(authenticate('user@example.com', 'wrong')).resolves.toBe(false);
  });

  test('issueSessionで発行したIDをverifySessionで検証できる', async () => {
    const sessionId = await issueSession('ExampleUser');

    expect(sessionMap.has(sessionId)).toBe(true);
    expect(verifySession(sessionId)).toBe('ExampleUser');
  });

  test('存在しないセッション、未指定セッションはnull', () => {
    expect(verifySession(undefined)).toBeNull();
    expect(verifySession('unknown')).toBeNull();
  });
});
