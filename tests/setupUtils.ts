import type { S3Client } from '@aws-sdk/client-s3';
import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ObjectIdentifier,
} from '@aws-sdk/client-s3';
import { testEnvs } from 'tests/test-utils/utils';

export async function resetS3Bucket(s3Client: S3Client): Promise<void> {
  const bucket = testEnvs().S3_BUCKET;

  if (!bucket) return;

  const keys = await listObjectKeys(s3Client, bucket);

  if (keys.length === 0) return;

  await ignoreNoSuchBucketError(async () => {
    await s3Client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }));
  });
}

export async function deleteS3Bucket(s3Client: S3Client): Promise<void> {
  const bucket = testEnvs().S3_BUCKET;

  if (!bucket) return;

  try {
    await s3Client.send(new DeleteBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (isNoSuchBucketError(error)) return;
    throw error;
  }
}

async function listObjectKeys(s3Client: S3Client, bucket: string): Promise<ObjectIdentifier[]> {
  return await ignoreNoSuchBucketError(async () => {
    const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: bucket }));
    return (
      objects.Contents?.map(({ Key }) => Key).filter(
        (key): key is string => typeof key === 'string',
      ) ?? []
    ).map((Key) => ({ Key }));
  }, [] satisfies ObjectIdentifier[]);
}

async function ignoreNoSuchBucketError(fn: () => Promise<void>): Promise<void>;
async function ignoreNoSuchBucketError<T>(fn: () => Promise<T>, fallback: T): Promise<T>;
async function ignoreNoSuchBucketError<T>(fn: () => Promise<T>, fallback?: T): Promise<T | void> {
  try {
    return await fn();
  } catch (error) {
    if (!isNoSuchBucketError(error)) throw error;
    return fallback;
  }
}

function isNoSuchBucketError(error: unknown): boolean {
  const maybeError = (error ?? {}) as { name?: string; Code?: string; message?: string };
  const values = [maybeError.name, maybeError.Code, maybeError.message].filter(
    (value): value is string => typeof value === 'string',
  );

  return values.some((value) => value.includes('NoSuchBucket'));
}
