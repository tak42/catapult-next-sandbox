import { render } from '@testing-library/react';
import { InbucketAPIClient } from 'inbucket-js-client';
import { SWRConfig } from 'swr';

export const TEST_BASE_URL = 'http://localhost:3000';

export const TEST_SIGN_IN_NAME_PREFIX = 'test-username-prefix';

export const inbucketClient = new InbucketAPIClient(process.env.INBUCKET_URL!);

const TEST_ENV_NAMES = ['INBUCKET_URL', 'S3_ENDPOINT', 'S3_BUCKET'] as const;

type TestEnvs = Record<(typeof TEST_ENV_NAMES)[number], string | undefined>;

export function testEnvs(): TestEnvs {
  return TEST_ENV_NAMES.reduce(
    (dict, name) => ({ ...dict, [name]: process.env[name] }),
    {} as TestEnvs,
  );
}

export async function fetchMailBodyAndTrash(email: string): Promise<string> {
  const mailbox = await inbucketClient.mailbox(email);
  const message = await inbucketClient.message(email, mailbox[0].id);

  await inbucketClient.deleteMessage(email, mailbox[0].id);

  return message.body.text.trim();
}

export async function fetchSignUpCode(email: string): Promise<string> {
  return await fetchMailBodyAndTrash(email).then((message) => message.split(' ').at(-1)!);
}

export function renderWithSWR(ui: React.ReactNode): ReturnType<typeof render> {
  return render(<SWRConfig value={{ provider: () => new Map() }}>{ui}</SWRConfig>);
}
