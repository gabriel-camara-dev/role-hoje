import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom } from '../utils/e2e';

describe('smoke / bootstrap', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /map/today is public and returns a list', async () => {
    const res = await request(app.getHttpServer()).get('/map/today');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('protected route rejects without a token', async () => {
    const res = await request(app.getHttpServer()).get('/friends');
    expect(res.status).toBe(401);
  });

  it('createUser helper mints a working token', async () => {
    const { user, token } = await createUser(app);
    const res = await request(app.getHttpServer()).get('/friends').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    await prismaFrom(app).user.delete({ where: { id: user.id } });
  });
});
