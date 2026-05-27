import type { StorageAdapter } from "./adapter";

// S3-compatible adapter — activates when AWS_REGION + S3_BUCKET are set
// Uses @aws-sdk/client-s3 for production, falls back to local adapter if not configured

function isS3Configured(): boolean {
  return !!(process.env.AWS_REGION && process.env.S3_BUCKET);
}

export function createS3Adapter(): StorageAdapter {
  // Dynamic import to avoid bundling S3 SDK when running in local-only mode
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } = require("@aws-sdk/client-s3");

  const region = process.env.AWS_REGION || "us-east-1";
  const bucket = process.env.S3_BUCKET || "vtu-operasional";
  const endpoint = process.env.S3_ENDPOINT; // opsional untuk S3-compatible (MinIO, etc.)

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
      : undefined,
  });

  async function streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
    return Buffer.concat(chunks);
  }

  return {
    async upload(p: string, buffer: Buffer, contentType: string): Promise<string> {
      await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: p,
        Body: buffer,
        ContentType: contentType,
      }));
      return `${bucket}/${p}`;
    },

    async download(p: string): Promise<Buffer> {
      const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: p }));
      return streamToBuffer(result.Body);
    },

    async delete(p: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: p }));
    },

    async exists(p: string): Promise<boolean> {
      try {
        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: p }));
        return true;
      } catch { return false; }
    },

    async getUrl(p: string): Promise<string> {
      if (endpoint) return `${endpoint}/${bucket}/${p}`;
      return `https://${bucket}.s3.${region}.amazonaws.com/${p}`;
    },

    async list(prefix: string): Promise<{ path: string; size: number; modifiedAt: Date }[]> {
      const result = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }));
      return (result.Contents || []).map((obj: any) => ({
        path: obj.Key!,
        size: obj.Size ?? 0,
        modifiedAt: obj.LastModified ?? new Date(),
      }));
    },
  };
}

export { isS3Configured };
