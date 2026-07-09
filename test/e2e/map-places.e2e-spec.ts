import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPlace, createTestApp, createUser, prismaFrom } from '../utils/e2e';

describe('Map & Places routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  describe('public map reads', () => {
    it('GET /map/today', async () => {
      const res = await http.get('/map/today');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /map/top-places', async () => {
      const res = await http.get('/map/top-places').query({ limit: 5 });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /map/global-ranking', async () => {
      const res = await http.get('/map/global-ranking');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /map/history', async () => {
      const res = await http.get('/map/history');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /map/places/:placePublicId', () => {
    it('returns the place card', async () => {
      const place = await createPlace(app);
      const res = await http.get(`/map/places/${place.publicId}`);
      expect(res.status).toBe(200);
      expect(res.body.voteCount).toBe(0);
      await prismaFrom(app).place.delete({ where: { id: place.id } });
    });

    it('404 for an unknown place', async () => {
      const res = await http.get('/map/places/019f0000-0000-7000-8000-000000000000');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /places (list)', () => {
    it('is reachable', async () => {
      const res = await http.get('/places').query({ q: 'zzz-none' });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /places (create)', () => {
    it('requires auth', async () => {
      const res = await http.post('/places').send({});
      expect(res.status).toBe(401);
    });

    it('creates a place when authenticated', async () => {
      const { user, token } = await createUser(app);
      const res = await http
        .post('/places')
        .set('Authorization', `Bearer ${token}`)
        .send({
          googlePlaceId: `e2e-${Date.now()}`,
          name: 'E2E Bar',
          formattedAddress: 'Rua E2E, 1',
          latitude: -22.9,
          longitude: -43.1,
          city: 'Niteroi',
          state: 'RJ',
        });
      expect([200, 201]).toContain(res.status);
      expect(res.body.name).toBe('E2E Bar');
      await prismaFrom(app).place.deleteMany({ where: { publicId: res.body.id } });
      await prismaFrom(app).user.delete({ where: { id: user.id } });
    });
  });

  describe('GET /places/:placePublicId/attendance/estimate', () => {
    it('returns an estimate', async () => {
      const place = await createPlace(app);
      const res = await http
        .get(`/places/${place.publicId}/attendance/estimate`)
        .query({ scheduledAt: new Date().toISOString(), radiusKm: 5 });
      expect(res.status).toBe(200);
      expect(typeof res.body.attendeeCount).toBe('number');
      await prismaFrom(app).place.delete({ where: { id: place.id } });
    });
  });
});
