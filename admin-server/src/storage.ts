import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Config } from './config.js';
import { randomUUID } from './security.js';

const allowedMimeTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export class ProductImageStorage {
  private readonly client: S3Client;

  constructor(private readonly config: Config) {
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });
  }

  async upload(buffer: Buffer, mimeType: string) {
    const extension = allowedMimeTypes.get(mimeType);
    if (!extension) throw new Error('Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.');
    if (buffer.byteLength > 5 * 1024 * 1024) throw new Error('Görsel en fazla 5 MB olabilir.');

    const key = `products/${randomUUID()}.${extension}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    return {
      key,
      url: `${this.config.S3_PUBLIC_BASE_URL.replace(/\/$/, '')}/${key}`,
    };
  }

  async remove(key: string) {
    if (!key.startsWith('products/')) throw new Error('Geçersiz görsel anahtarı.');
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }));
  }
}
