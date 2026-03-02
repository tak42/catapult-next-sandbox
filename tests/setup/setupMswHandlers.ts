import type { HttpHandler } from 'msw';

export function setupMswHandlers(_options?: { baseURL?: string }): HttpHandler[] {
  return [];
}

export function patchFilePrototype(): void {
  // no-op: 現状のテストでは File.prototype の追加パッチは不要
}
