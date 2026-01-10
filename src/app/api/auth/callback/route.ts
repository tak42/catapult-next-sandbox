// src/app/api/auth/callback/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_SECURE } from 'server/utils/serverEnvs';
import { issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const all = req.nextUrl.searchParams.getAll('code', 'state', 'error');

  if (error || !code || !state) {
    // 失敗時はまず可視化しやすい形で返す（後で /login?error= にredirectでもOK）
    return NextResponse.json({ message: error }, { status: 401 });
  }

  console.log({ code, state });

  // const oidcTx = (await cookies()).get(code);

  // const tx = oidcTx?.value;

  // if (!tx || tx !== state) return NextResponse.json({ message: 'Invalid state' }, { status: 401 });

  const sessionId = await issueSession('ExampleToken');

  const res = NextResponse.redirect(new URL('/', req.url), { status: 302 });
  res.headers.set(
    'Set-Cookie',
    serializeSetCookie('session', sessionId, {
      httpOnly: true,
      path: '/',
      sameSite: 'Lax',
      secure: SESSION_COOKIE_SECURE,
    }),
  );
  return res;
}
