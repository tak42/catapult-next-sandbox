import { sessionMap } from 'src/modules/auth/sessionStore';

export async function authenticate(email: string, password: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolve(email.endsWith('@example.com') && password === 'test1234');
  });
}

export async function issueSession(name: string): Promise<string> {
  const sessionId = crypto.randomUUID();

  return new Promise((resolve) => {
    sessionMap.set(sessionId, { name });
    resolve(sessionId);
  });
}

export function verifySession(value: string | undefined): string | null {
  if (!value) return null;

  const sessionData = sessionMap.get(value);

  return sessionData ? sessionData.name : null;
}
