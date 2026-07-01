import { randomUUID, createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { EnvService } from '../env/env.service';

const allowedImageMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

    if (!allowedImageMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Avatar must be a JPEG, PNG or WEBP image');
    }

    const storageDir = this.getStorageDir();
    await mkdir(storageDir, { recursive: true });

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const filename = `${randomUUID()}${extname(file.originalname) || '.img'}.enc`;
    const encryptedPath = join(storageDir, filename);

    await writeFile(encryptedPath, encrypted);

    return {
      encryptedPath,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      mimeType: file.mimetype,
      originalName: file.originalname,
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
