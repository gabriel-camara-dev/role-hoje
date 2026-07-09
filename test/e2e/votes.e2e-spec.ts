import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPlace, createTestApp, createUser, prismaFrom } from '../utils/e2e';

const today = new Date().toISOString().slice(0, 10);

describe('Vote routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /places/:placePublicId/votes', () => {
    it('requires auth', async () => {
      const place = await createPlace(app);
      const res = await http.post(`/places/${place.publicId}/votes`).send({ day: today });
      expect(res.status).toBe(401);
      await prismaFrom(app).place.delete({ where: { id: place.id } });
    });

    it('records a going vote', async () => {
      const { user, token } = await createUser(app);
      const place = await createPlace(app);
      const res = await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day: today, voteType: 'GENERAL', going: true, voteTime: '20:00' });
      expect([200, 201]).toContain(res.status);

      const map = await http.get(`/map/places/${place.publicId}`).query({ day: today });
      expect(map.body.voteCount).toBe(1);

      await prismaFrom(app).place.delete({ where: { id: place.id } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('weekly vote limit (6/week)', () => {
    it('blocks the 7th going vote in a week', async () => {
      const { user, token } = await createUser(app);
      const places = await Promise.all(Array.from({ length: 7 }, () => createPlace(app)));

      const statuses: number[] = [];
      for (const place of places) {
        const res = await http
          .post(`/places/${place.publicId}/votes`)
          .set('Authorization', `Bearer ${token}`)
          .send({ day: today, going: true });
        statuses.push(res.status);
      }

      expect(statuses.slice(0, 6).every((s) => s === 200 || s === 201)).toBe(true);
      expect(statuses[6]).toBe(409);

      await prismaFrom(app).place.deleteMany({ where: { id: { in: places.map((p) => p.id) } } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('"nao vou" (decline) rules', () => {
    it('rejects a decline on a place with no votes', async () => {
      const { user, token } = await createUser(app);
      const place = await createPlace(app);
      const res = await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day: today, going: false });
      expect(res.status).toBe(409);
      await prismaFrom(app).place.delete({ where: { id: place.id } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });

    it('allows a decline once someone is going', async () => {
      const goer = await createUser(app);
      const decliner = await createUser(app);
      const place = await createPlace(app);

      await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${goer.token}`)
        .send({ day: today, going: true });

      const res = await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${decliner.token}`)
        .send({ day: today, going: false });
      expect([200, 201]).toContain(res.status);

      await prismaFrom(app).place.delete({ where: { id: place.id } });
      await prismaFrom(app).user.deleteMany({ where: { id: { in: [goer.user.id, decliner.user.id] } } });
    });
  });

  describe('DELETE /places/:placePublicId/votes (cancel)', () => {
    it('cancels an existing vote', async () => {
      const { user, token } = await createUser(app);
      const place = await createPlace(app);
      await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day: today, going: true });

      const res = await http
        .delete(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${token}`)
        .send({ day: today });
      expect(res.status).toBe(200);

      await prismaFrom(app).place.delete({ where: { id: place.id } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('POST /places/:placePublicId/votes/today (legacy) & GET /me/votes', () => {
    it('votes for today and lists my votes', async () => {
      const { user, token } = await createUser(app);
      const place = await createPlace(app);

      const vote = await http
        .post(`/places/${place.publicId}/votes/today`)
        .set('Authorization', `Bearer ${token}`)
        .send({ going: true });
      expect([200, 201]).toContain(vote.status);

      const mine = await http.get('/me/votes').set('Authorization', `Bearer ${token}`);
      expect(mine.status).toBe(200);
      expect(Array.isArray(mine.body)).toBe(true);
      expect(mine.body.length).toBeGreaterThanOrEqual(1);

      await prismaFrom(app).place.delete({ where: { id: place.id } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });
});
