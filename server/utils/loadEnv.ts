import { config } from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

export type AppEnv = 'local' | 'develop' | 'production';

let loaded = false;
let loadedEnvFile: string | null = null;

function normalizeAppEnv(value: string | undefined): AppEnv | null {
  if (!value) return null;
  if (value === 'local' || value === 'develop' || value === 'production') return value;
  return null;
}

export function resolveAppEnv(): AppEnv {
  const fromAppEnv = normalizeAppEnv(process.env.APP_ENV);
  if (fromAppEnv) return fromAppEnv;

  return process.env.NODE_ENV === 'production' ? 'production' : 'local';
}

function envCandidates(appEnv: AppEnv): string[] {
  switch (appEnv) {
    case 'local':
      return ['.env.local', '.env'];
    case 'develop':
      return [
        '.env.develop.local',
        '.env.development.local',
        '.env.develop',
        '.env.development',
        '.env',
      ];
    case 'production':
      return ['.env.production.local', '.env.production', '.env'];
  }
}

function pickExistingEnvFile(candidates: string[]): string | null {
  const root = process.cwd();

  for (const rel of candidates) {
    const abs = path.resolve(root, rel);
    if (fs.existsSync(abs)) return abs;
  }

  return null;
}

export function loadEnv(): { appEnv: AppEnv; loadedEnvFile: string | null } {
  if (loaded) return { appEnv: resolveAppEnv(), loadedEnvFile };

  // Keep tests hermetic; they stub process.env themselves.
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) {
    loaded = true;
    return { appEnv: resolveAppEnv(), loadedEnvFile };
  }

  const appEnv = resolveAppEnv();
  const picked = pickExistingEnvFile(envCandidates(appEnv));

  if (picked) {
    // For local/develop we intentionally override values already loaded by Next.js
    // (e.g. .env.production during `next build`).
    const override = appEnv !== 'production';
    config({ path: picked, override });
    loadedEnvFile = picked;
  } else {
    loadedEnvFile = null;
  }

  loaded = true;
  return { appEnv, loadedEnvFile };
}

export function getLoadedEnvFile(): string | null {
  return loadedEnvFile;
}
