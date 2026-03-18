export type AssuranceLevel = 'base' | 'step_up';

export type SessionData = {
  name: string;
  assuranceLevel: AssuranceLevel;
  methods: string[];
  createdAtMs: number;
  expiresAtMs: number;
  stepUpAtMs?: number;
};

export type OidcTransactionData = {
  state: string;
  nonce: string;
  verifier: string;
  createdAtMs: number;
  expiresAtMs: number;
};

export const sessionMap = new Map<string, SessionData>();
export const oidcTransactionMap = new Map<string, OidcTransactionData>();
