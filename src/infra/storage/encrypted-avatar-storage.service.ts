import { randomUUID, createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EnvService } from '../env/env.service';

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxAvatarSizeInBytes = 2 * 1024 * 1024;
const avatarFetchTimeoutInMs = 5_000;

export interface StoredEncryptedAvatar {
  encryptedPath: string;
  iv: string;
  authTag: string;
  mimeType: string;
  originalName: string;
}

export interface DecryptedAvatar {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

@Injectable()
export class EncryptedAvatarStorageService {
  constructor(@Inject(EnvService) private env: EnvService) {}

  async store(file: Express.Multer.File): Promise<StoredEncryptedAvatar> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    return this.storeBuffer({
      buffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  async storeFromUrl(url: string, originalName = 'google-avatar'): Promise<StoredEncryptedAvatar> {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== 'https:') {
      throw new BadRequestException('Avatar URL must use HTTPS');
    }

    if (!isAllowedAvatarHost(parsedUrl.hostname)) {
      throw new BadRequestException('Avatar URL host is not allowed');
    }

    const response = await fetch(parsedUrl, {
      signal: AbortSignal.timeout(avatarFetchTimeoutInMs),
    }).catch(() => {
      throw new BadRequestException('Could not fetch avatar image');
    });

    if (!response.ok) {
      throw new BadRequestException('Could not fetch avatar image');
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);

    if (contentLength > maxAvatarSizeInBytes) {
      throw new BadRequestException('Avatar image is too large');
    }

    const buffer = await readLimitedResponse(response);
    const mimeType = detectImageMimeType(buffer);

    if (!mimeType) {
      throw new BadRequestException('Avatar must be a JPEG, PNG or WEBP image');
    }

    return this.storeBuffer({
      buffer,
      mimeType,
      originalName: `${originalName}${extensionFromMimeType(mimeType)}`,
    });
  }

  private async storeBuffer(params: {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<StoredEncryptedAvatar> {
    const detectedMimeType = detectImageMimeType(params.buffer);

    if (!detectedMimeType || !allowedImageMimeTypes.has(detectedMimeType)) {
      throw new BadRequestException('Avatar must be a JPEG, PNG or WEBP image');
    }

    if (params.buffer.byteLength > maxAvatarSizeInBytes) {
      throw new BadRequestException('Avatar image is too large');
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(params.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const storageDir = this.getStorageDir();
    const filename = `${randomUUID()}${extname(params.originalName) || '.img'}.enc`;
    const encryptedPath = join(storageDir, filename);

    await mkdir(storageDir, { recursive: true });
    await writeFile(encryptedPath, encrypted);

    return {
      encryptedPath,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      mimeType: detectedMimeType,
      originalName: params.originalName,
    };
  }

  async read(params: {
    encryptedPath: string;
    iv: string;
    authTag: string;
    mimeType: string;
    originalName: string;
  }): Promise<DecryptedAvatar> {
    const encryptedPath = resolve(params.encryptedPath);
    const storageDir = this.getStorageDir();

    const relativePath = relative(storageDir, encryptedPath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid avatar path');
    }

    const encrypted = await readFile(encryptedPath);
    const decipher = createDecipheriv('aes-256-gcm', this.getEncryptionKey(), Buffer.from(params.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(params.authTag, 'base64'));

    return {
      buffer: Buffer.concat([decipher.update(encrypted), decipher.final()]),
      mimeType: params.mimeType,
      originalName: params.originalName,
    };
  }

  async delete(encryptedPath: string): Promise<void> {
    const resolvedEncryptedPath = resolve(encryptedPath);
    const storageDir = this.getStorageDir();
    const relativePath = relative(storageDir, resolvedEncryptedPath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid avatar path');
    }

    try {
      await unlink(resolvedEncryptedPath);
    } catch {
      return;
    }
  }

  private getEncryptionKey() {
    const secret = this.env.get('AVATAR_ENCRYPTION_SECRET') ?? this.env.get('JWT_SECRET');

    if (!secret) {
      throw new Error('AVATAR_ENCRYPTION_SECRET or JWT_SECRET must be provided to encrypt avatars');
    }

    return createHash('sha256').update(secret).digest();
  }

  private getStorageDir() {
    const storageDir = this.env.get('AVATAR_STORAGE_DIR');

    return resolve(isAbsolute(storageDir) ? storageDir : join(process.cwd(), storageDir));
  }
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return '.jpg';
  }

  if (mimeType === 'image/png') {
    return '.png';
  }

  if (mimeType === 'image/webp') {
    return '.webp';
  }

  return '.img';
}

function isAllowedAvatarHost(hostname: string) {
  return hostname === 'googleusercontent.com' || hostname.endsWith('.googleusercontent.com');
}

async function readLimitedResponse(response: Response) {
  if (!response.body) {
    throw new BadRequestException('Could not fetch avatar image');
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    totalBytes += value.byteLength;

    if (totalBytes > maxAvatarSizeInBytes) {
      await reader.cancel();
      throw new BadRequestException('Avatar image is too large');
    }

    chunks.push(Buffer.from(value));
  }

  return Buffer.concat(chunks);
}

function detectImageMimeType(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  if (buffer.length >= pngSignature.length && buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    return 'image/png';
  }

  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  return null;
}
