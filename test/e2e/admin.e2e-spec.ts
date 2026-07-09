import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom } from '../utils/e2e';

const ADMIN_ROUTES = [
  '/admin/onde-hoje/dashboard',
  '/admin/onde-hoje/overview',
  '/admin/onde-hoje/abuse',
  '/admin/onde-hoje/auth-activity',
];

describe('Admin dashboard routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects anonymous and non-admin users', async () => {
    const { user, token } = await createUser(app);
    for (const route of ADMIN_ROUTES) {
      expect((await http.get(route)).status).toBe(401);
      expect((await http.get(route).set('Authorization', `Bearer ${token}`)).status).toBe(403);
    }
    await prismaFrom(app).user.delete({ where: { id: user.id } });
  });

  it('allows admins on every dashboard route', async () => {
    const admin = await createUser(app, { role: 'ADMIN' });
    for (const route of ADMIN_ROUTES) {
      const res = await http.get(route).set('Authorization', `Bearer ${admin.token}`);
      expect(res.status).toBe(200);
    }
    await prismaFrom(app).user.delete({ where: { id: admin.user.id } });
  });

  it('GET /admin/onde-hoje/users/:publicId/history returns a user history for admins', async () => {
    const admin = await createUser(app, { role: 'ADMIN' });
    const target = await createUser(app);

    const res = await http
      .get(`/admin/onde-hoje/users/${target.user.publicId}/history`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);

    await prismaFrom(app).user.deleteMany({ where: { id: { in: [admin.user.id, target.user.id] } } });
  });
});
