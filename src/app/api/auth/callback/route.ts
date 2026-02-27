import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SESSION_COOKIE_SECURE } from 'server/utils/serverEnvs';
import { issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const parsed = parseAuthCallbackParams(req);
  if (!parsed.ok) return parsed.res;

  const { code, state } = parsed.params;
  console.log({ code, state });

  const txResult = await parseOidcTxFromCookies();
  if (!txResult.ok) return txResult.res;
  if (txResult.tx.state !== state)
    return NextResponse.json({ message: 'Invalid state' }, { status: 401 });

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

type AuthCallbackParams = {
  code: string;
  state: string;
  error?: string;
};

type ParseAuthCallbackParamsResult =
  | { ok: true; params: AuthCallbackParams }
  | { ok: false; res: NextResponse };

function parseAuthCallbackParams(req: NextRequest): ParseAuthCallbackParamsResult {
  const searchParams = req.nextUrl.searchParams;

  const error = searchParams.get('error');
  if (error) {
    return { ok: false, res: NextResponse.json({ message: error }, { status: 401 }) };
  }

  const code = searchParams.get('code');
  if (!code) {
    return { ok: false, res: NextResponse.json({ message: 'Missing code' }, { status: 400 }) };
  }

  const state = searchParams.get('state');
  if (!state) {
    return { ok: false, res: NextResponse.json({ message: 'Missing state' }, { status: 400 }) };
  }

  return { ok: true, params: { code, state } };
}

type OidcTx = {
  state: string;
  verifier: string;
};

type ParseOidcTxFromCookiesResult = { ok: true; tx: OidcTx } | { ok: false; res: NextResponse };

async function parseOidcTxFromCookies(): Promise<ParseOidcTxFromCookiesResult> {
  const cookieStore = await cookies();
  const oidcTxCookie = cookieStore.get('oidc_tx');
  if (!oidcTxCookie) {
    return {
      ok: false,
      res: NextResponse.json({ message: 'Missing oidc_tx cookie' }, { status: 401 }),
    };
  }

  const parsed = parseJsonUnknown(oidcTxCookie.value);
  if (!parsed.ok) {
    return { ok: false, res: NextResponse.json({ message: 'Parse failed' }, { status: 401 }) };
  }

  if (!isOidcTx(parsed.value)) {
    return {
      ok: false,
      res: NextResponse.json({ message: 'Invalid oidc_tx cookie' }, { status: 401 }),
    };
  }

  return { ok: true, tx: parsed.value };
}

function parseJsonUnknown(json: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(json) as unknown };
  } catch {
    return { ok: false };
  }
}

function isOidcTx(value: unknown): value is OidcTx {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.state === 'string' && typeof record.verifier === 'string';
}
