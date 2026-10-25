import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PRESIGN_EXPIRES_SECONDS, type PresignedUpload, type StorageDriver } from "./storage.types";

// Any S3-compatible store.

export interface S3Settings {
  endpoint?: string;
  region?: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
  forcePathStyle?: boolean;
}

export class S3StorageDriver implements StorageDriver {
  readonly kind = "s3";
  private readonly client: S3Client;
  private readonly publicUrl: string;

  constructor(private readonly settings: S3Settings) {
    this.client = new S3Client({
      region: settings.region || "auto",
      endpoint: settings.endpoint || undefined,
      forcePathStyle: !!settings.forcePathStyle,
      credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
      // The SDK defaults to signing a flexible-checksum header on every request.
      // For a presigned URL that's computed against an empty body (the real
      // bytes don't exist yet at sign time), so the client's actual PUT never
      // matches it and R2 rejects the upload with 403. PutObject doesn't need
      // this, so only compute a checksum when an API explicitly requires one.
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
    this.publicUrl = settings.publicUrl.replace(/\/$/, "");
  }

  async createUpload(key: string, mimeType: string): Promise<PresignedUpload> {
    const command = new PutObjectCommand({ Bucket: this.settings.bucket, Key: key, ContentType: mimeType });
    // signableHeaders forces content-type into the signature (it isn't
    // signed by default — only x-amz-* headers are) — without this, the
    // store accepts a PUT with any Content-Type, silently ignoring ours.
    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: PRESIGN_EXPIRES_SECONDS,
      signableHeaders: new Set(["content-type"]),
    });
    return { uploadUrl, fileUrl: `${this.publicUrl}/${key}`, key };
  }

  async write(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.settings.bucket, Key: key, Body: body, ContentType: mimeType }));
  }

  async read(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.settings.bucket, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.settings.bucket, Key: key }));
  }

  keyFromUrl(url: string): string | null {
    const prefix = `${this.publicUrl}/`;
    return url.startsWith(prefix) ? url.slice(prefix.length) : null;
  }
}

export const createS3Driver = (settings: S3Settings): StorageDriver => new S3StorageDriver(settings);
