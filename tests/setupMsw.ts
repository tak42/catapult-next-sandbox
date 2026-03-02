import { http, passthrough } from 'msw';
import { setupServer, type SetupServerApi } from 'msw/node';
import { TEST_BASE_URL, testEnvs } from 'tests/test-utils/utils';
import { setupMswHandlers } from './setupMswHandlers';

export function setupMsw(): SetupServerApi {
  const server = setupServer(
    http.all(`${testEnvs().S3_ENDPOINT}/*`, passthrough),
    http.all(`${testEnvs().INBUCKET_URL}/*`, passthrough),
    ...setupMswHandlers(),
    ...setupMswHandlers({ baseURL: TEST_BASE_URL }),
  );

  server.listen({ onUnhandledRequest: 'error' });

  return server;
}
