import { NextResponse } from 'next/server';
import { SESSION_COOKIE_SECURE } from 'server/utils/serverEnvs';
import { issueSession } from 'src/modules/auth/authService';
import { serializeSetCookie } from 'src/shared/http/cookie';
import { AuthCallbackQuerySchema } from './frourio';

type OidcTx = {
  state: string;
  verifier: string;
};

type ParsedCallbackQueryResult =
  | {
      ok: true;
      query: { code?: string; state?: string; error?: string };
    }
  | { ok: false; res: NextResponse };

function parseCallbackQuery(req: Request): ParsedCallbackQueryResult {
  const result = AuthCallbackQuerySchema.safeParse({
    code: getSearchParam(req, 'code'),
    state: getSearchParam(req, 'state'),
    error: getSearchParam(req, 'error'),
  });

  return result.success
    ? { ok: true, query: result.data }
    : { ok: false, res: createInvalidQueryResponse(result.error.issues[0]?.message) };
}

function getSearchParam(req: Request, key: string): string | undefined {
  const value = new URL(req.url).searchParams.get(key);
  return value === null ? undefined : value;
}

function createInvalidQueryResponse(message: string | undefined): NextResponse {
  return NextResponse.json({ message: message || 'Invalid callback query' }, { status: 401 });
}

function createRedirectWithSession(req: Request, sessionId: string): NextResponse {
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

export async function GET(req: Request): Promise<NextResponse> {
  const parsed = parseCallbackQuery(req);
  if (!parsed.ok) return parsed.res;

  const authError = await validateAuthCallback(req, parsed.query.error, parsed.query.state);
  if (authError) return NextResponse.json({ message: authError }, { status: 401 });

  const sessionId = await issueSession('ExampleToken');
  return createRedirectWithSession(req, sessionId);
}

async function validateAuthCallback(
  req: Request,
  error: string | undefined,
  state: string | undefined,
): Promise<string | null> {
  if (error) return error;

  const oidcTx = loadOidcTxFromCookie(req);
  if (!oidcTx) return 'Invalid oidc_tx cookie';
  if (oidcTx.state !== state) return 'Invalid state';

  return null;
}

function loadOidcTxFromCookie(req: Request): OidcTx | null {
  const oidcTxCookie = getCookieValue(req, 'oidc_tx');
  if (!oidcTxCookie) return null;

  const parsed = parseJsonUnknown(oidcTxCookie);
  if (!parsed.ok || !isOidcTx(parsed.value)) return null;

  return parsed.value;
}

function getCookieValue(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const target = `${name}=`;
  const found = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(target));

  return found ? decodeURIComponent(found.slice(target.length)) : null;
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
