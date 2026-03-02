import type { S3Client } from '@aws-sdk/client-s3';
import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { testEnvs } from 'tests/test-utils/utils';

export async function resetS3Bucket(s3Client: S3Client): Promise<void> {
  const objects = await s3Client.send(new ListObjectsV2Command({ Bucket: testEnvs().S3_BUCKET }));
  const keys = objects.Contents?.map(({ Key }) => ({ Key })) ?? [];

  if (keys.length === 0) return;

  await s3Client.send(
    new DeleteObjectsCommand({ Bucket: testEnvs().S3_BUCKET, Delete: { Objects: keys } }),
  );
}

export async function deleteS3Bucket(s3Client: S3Client): Promise<void> {
  await s3Client.send(new DeleteBucketCommand({ Bucket: testEnvs().S3_BUCKET }));
}
