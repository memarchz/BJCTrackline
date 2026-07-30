import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from '../middleware/errorHandler';

function config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new HttpError(
      500,
      'File storage is not configured — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME',
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let client: S3Client | undefined;
function r2Client(cfg: ReturnType<typeof config>) {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
  }
  return client;
}

// Uploads to a private bucket — nothing here is publicly reachable. Reads go
// through getAttachmentDownloadUrl() as a short-lived signed URL instead.
export async function uploadAttachment(key: string, body: Buffer, contentType?: string): Promise<void> {
  const cfg = config();
  await r2Client(cfg).send(
    new PutObjectCommand({ Bucket: cfg.bucket, Key: key, Body: body, ContentType: contentType }),
  );
}

export async function deleteAttachment(key: string): Promise<void> {
  const cfg = config();
  await r2Client(cfg).send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
}

export async function getAttachmentDownloadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  const cfg = config();
  const command = new GetObjectCommand({ Bucket: cfg.bucket, Key: key });
  return getSignedUrl(r2Client(cfg), command, { expiresIn: expiresInSeconds });
}
