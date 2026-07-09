import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom, randomSuffix, TEST_PASSWORD } from '../utils/e2e';

describe('Users & Auth routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /users (register)', () => {
    it('creates a user with valid data', async () => {
      const suffix = randomSuffix();
      const res = await http.post('/users').send({
        name: 'Valid Name',
        username: `reg_${suffix}`,
        email: `reg_${suffix}@test.dev`,
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(201);
      expect(res.body.username).toBe(`reg_${suffix}`);
      await prismaFrom(app).user.deleteMany({ where: { username: `reg_${suffix}` } });
    });

    it('rejects a duplicate email', async () => {
      const { user } = await createUser(app);
      const res = await http.post('/users').send({
        name: 'Other Name',
        username: `dup_${randomSuffix()}`,
        email: user.email,
        password: TEST_PASSWORD,
      });
      expect(res.status).toBe(409);
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });

    it('rejects an invalid payload (weak password / bad username)', async () => {
      const res = await http.post('/users').send({
        name: 'Valid Name',
        username: 'Bad Upper',
        email: `x_${randomSuffix()}@test.dev`,
        password: 'weak',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /sessions (login)', () => {
    it('returns a token for valid credentials', async () => {
      const { user } = await createUser(app);
      const res = await http.post('/sessions').send({ login: user.email, password: TEST_PASSWORD });
      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.email).toBe(user.email);
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });

    it('rejects a wrong password', async () => {
      const { user } = await createUser(app);
      const res = await http.post('/sessions').send({ login: user.email, password: 'Wr0ng!Pass' });
      expect(res.status).toBe(401);
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('GET /users/:publicId (profile)', () => {
    it('requires authentication', async () => {
      const { user } = await createUser(app);
      const anon = await http.get(`/users/${user.publicId}`);
      expect(anon.status).toBe(401);

      const { token } = await createUser(app);
      const authed = await http.get(`/users/${user.publicId}`).set('Authorization', `Bearer ${token}`);
      expect(authed.status).toBe(200);
      expect(authed.body.username).toBe(user.username);
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('GET /users (list, admin only)', () => {
    it('forbids non-admins and allows admins', async () => {
      const normal = await createUser(app);
      const admin = await createUser(app, { role: 'ADMIN' });

      const denied = await http.get('/users').set('Authorization', `Bearer ${normal.token}`);
      expect(denied.status).toBeGreaterThanOrEqual(400);

      const ok = await http.get('/users').set('Authorization', `Bearer ${admin.token}`);
      expect(ok.status).toBe(200);
      expect(Array.isArray(ok.body.data)).toBe(true);

      await prismaFrom(app).user.deleteMany({ where: { id: { in: [normal.user.id, admin.user.id] } } });
    });
  });

  describe('PATCH /users/:publicId', () => {
    it('lets the owner update their name', async () => {
      const { user, token } = await createUser(app);
      const res = await http
        .patch(`/users/${user.publicId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('DELETE /users/:publicId', () => {
    it('deletes the account even with login-audit rows (FK SET NULL)', async () => {
      const { user, token } = await createUser(app);
      // Login once so an authentication_audit row referencing the user exists.
      await http.post('/sessions').send({ login: user.email, password: TEST_PASSWORD });

      const res = await http.delete(`/users/${user.publicId}`).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(204);

      const stillThere = await prismaFrom(app).user.findUnique({ where: { id: user.id } });
      expect(stillThere).toBeNull();
    });
  });

  describe('email confirmation routes', () => {
    it('POST /users/email/confirmation is public', async () => {
      const res = await http.post('/users/email/confirmation').send({ email: `nobody_${randomSuffix()}@test.dev` });
      expect(res.status).toBeLessThan(500);
    });

    it('GET /users/email/confirm redirects (invalid token -> frontend)', async () => {
      const res = await http.get('/users/email/confirm').query({ token: 'invalid-token' }).redirects(0);
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('emailConfirmed=invalid');
    });
  });

  describe('GET /users/:publicId/avatar', () => {
    it('returns 404 when the user has no avatar', async () => {
      const { user } = await createUser(app);
      const res = await http.get(`/users/${user.publicId}/avatar`);
      expect(res.status).toBe(404);
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });
});
