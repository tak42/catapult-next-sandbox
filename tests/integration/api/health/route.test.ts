import { $fc } from 'src/app/api/health/frourio.client';
import { expect, test } from 'vitest';

test('GET /api/health', async () => {
  const res = await $fc().$get();

  expect(res).toEqual('ok');
});
