import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  oidcTransactionMap,
  sessionMap,
  type AssuranceLevel,
  type OidcTransactionData,
  type SessionData,
} from 'src/modules/auth/sessionStore';
import { verifyTotpCodeWithSecret } from 'src/modules/auth/totpService';

const SESSION_TTL_MS = 15 * 60 * 1000;
const STEP_UP_TTL_MS = 10 * 60 * 1000;
const OIDC_TX_TTL_MS = 5 * 60 * 1000;

const DEFAULT_TOTP_SECRET_BASE32 = 'JBSWY3DPEHPK3PXP';
const userTotpSecretMap = new Map<string, string>([
  ['ExampleToken', DEFAULT_TOTP_SECRET_BASE32],
  ['ExampleUserId', DEFAULT_TOTP_SECRET_BASE32],
]);

export type SessionView = {
  id: string;
  name: string;
  assuranceLevel: AssuranceLevel;
  methods: string[];
  stepUpAtMs?: number;
  createdAtMs: number;
  expiresAtMs: number;
  stepUpExpiresAtMs?: number;
};

export type CreatedOidcTransaction = {
  state: string;
  nonce: string;
  verifier: string;
  challenge: string;
};

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createPkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());

  return { verifier, challenge };
}

function createSessionData(
  name: string,
  assuranceLevel: AssuranceLevel,
  methods: string[],
  nowMs: number,
): SessionData {
  return {
    name,
    assuranceLevel,
    methods: Array.from(new Set(methods)),
    createdAtMs: nowMs,
    expiresAtMs: nowMs + SESSION_TTL_MS,
  };
}

function loadSession(sessionId: string): SessionData | null {
  const session = sessionMap.get(sessionId);
  if (!session) return null;

  if (session.expiresAtMs <= Date.now()) {
    sessionMap.delete(sessionId);
    return null;
  }

  return session;
}

function toSessionView(id: string, data: SessionData): SessionView {
  return {
    id,
    name: data.name,
    assuranceLevel: data.assuranceLevel,
    methods: data.methods,
    stepUpAtMs: data.stepUpAtMs,
    createdAtMs: data.createdAtMs,
    expiresAtMs: data.expiresAtMs,
    stepUpExpiresAtMs: data.stepUpAtMs ? data.stepUpAtMs + STEP_UP_TTL_MS : undefined,
  };
}

export async function authenticate(email: string, password: string): Promise<boolean> {
  return new Promise((resolve) => {
    resolve(email.endsWith('@example.com') && password === 'test1234');
  });
}

export function createOidcTransaction(): CreatedOidcTransaction {
  const state = randomUUID();
  const nonce = randomUUID();
  const pkce = createPkce();
  const nowMs = Date.now();

  const tx: OidcTransactionData = {
    state,
    nonce,
    verifier: pkce.verifier,
    createdAtMs: nowMs,
    expiresAtMs: nowMs + OIDC_TX_TTL_MS,
  };
  oidcTransactionMap.set(state, tx);

  return { state, nonce, verifier: pkce.verifier, challenge: pkce.challenge };
}

export function consumeOidcTransaction(state: string): OidcTransactionData | null {
  const tx = oidcTransactionMap.get(state);
  if (!tx) return null;

  oidcTransactionMap.delete(state);
  if (tx.expiresAtMs <= Date.now()) return null;

  return tx;
}

export async function issueSession(
  name: string,
  options?: { assuranceLevel?: AssuranceLevel; methods?: string[] },
): Promise<string> {
  const sessionId = randomUUID();
  const nowMs = Date.now();
  const assuranceLevel = options?.assuranceLevel ?? 'base';
  const methods = options?.methods ?? ['oidc'];

  return new Promise((resolve) => {
    sessionMap.set(sessionId, createSessionData(name, assuranceLevel, methods, nowMs));
    resolve(sessionId);
  });
}

export function rotateSessionForStepUp(sessionId: string, method: string): string | null {
  const existing = loadSession(sessionId);
  if (!existing) return null;

  const nowMs = Date.now();
  const nextId = randomUUID();

  sessionMap.delete(sessionId);
  sessionMap.set(nextId, {
    ...createSessionData(existing.name, 'step_up', [...existing.methods, method], nowMs),
    stepUpAtMs: nowMs,
  });

  return nextId;
}

export function readSession(sessionId: string | undefined): SessionView | null {
  if (!sessionId) return null;

  const data = loadSession(sessionId);
  if (!data) return null;

  return toSessionView(sessionId, data);
}

export function isStepUpValid(session: SessionView): boolean {
  if (session.assuranceLevel !== 'step_up') return false;
  if (!session.stepUpAtMs) return false;

  return session.stepUpAtMs + STEP_UP_TTL_MS > Date.now();
}

export function isStepUpRequired(session: SessionView): boolean {
  return !isStepUpValid(session);
}

export function verifyTotpCode(userName: string, code: string, nowMs = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;

  const secret = userTotpSecretMap.get(userName) ?? DEFAULT_TOTP_SECRET_BASE32;

  return verifyTotpCodeWithSecret(secret, code, nowMs);
}

export function verifySession(value: string | undefined): string | null {
  const sessionData = value ? loadSession(value) : null;

  return sessionData ? sessionData.name : null;
}
