import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

type UploadUrlInput = {
  widgetId: string;
  fileName: string;
  mimeType: string;
};

@Injectable()
export class StorageService {
  private readonly bucket = process.env.S3_BUCKET || 'triage-uploads';
  private readonly client = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    forcePathStyle: this.bool(process.env.S3_FORCE_PATH_STYLE, true),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
  });

  async createUploadUrl(input: UploadUrlInput) {
    const storageKey = this.makeStorageKey(input.widgetId, input.fileName);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ContentType: input.mimeType,
    });
    const url = await getSignedUrl(this.client, command, { expiresIn: 300 });
    return {
      url,
      storageKey,
      headers: {
        'Content-Type': input.mimeType,
      },
      expiresIn: 300,
    };
  }

  async headObject(storageKey: string) {
    return this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      }),
    );
  }

  async createDownloadUrl(storageKey: string, fileName?: string | null) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: storageKey,
      ResponseContentDisposition: fileName
        ? `inline; filename="${fileName.replace(/"/g, '')}"`
        : 'inline',
    });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  private makeStorageKey(widgetId: string, fileName: string) {
    const safeName = fileName
      .trim()
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, '-')
      .slice(0, 120);
    const month = new Date().toISOString().slice(0, 7);
    return `widgets/${widgetId}/${month}/${randomUUID()}-${safeName || 'image'}`;
  }

  private bool(value: string | undefined, fallback: boolean) {
    if (!value) return fallback;
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  }
}
