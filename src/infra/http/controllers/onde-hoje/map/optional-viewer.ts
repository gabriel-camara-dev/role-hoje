import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class OptionalViewerResolver {
  constructor(@Inject(JwtService) private jwtService: JwtService) {}

  async getPublicId(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub?: string }>(authorization.slice('Bearer '.length));

      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
