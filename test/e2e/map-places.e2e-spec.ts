import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, createGroup, createPlace, createTestApp, createUser, prismaFrom } from '../utils/e2e';

/** `YYYY-MM-DD`, `offset` days from today. */
function dayOffset(offset: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);

  return date.toISOString().slice(0, 10);
}

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

    // The group "next 7 days" dialog is built on this: /map/history is documented
    // as a *past* votes view, but its range is date-agnostic, and the frontend
    // points it at a future window. Narrowing that range would break the dialog.
    it('serves a future date range grouped by day, scoped to a group', async () => {
      const owner = await createUser(app);
      const group = await createGroup(app, owner.user.id);
      const place = await createPlace(app);

      const from = dayOffset(0);
      const votedDay = dayOffset(3);

      const vote = await http
        .post(`/places/${place.publicId}/votes`)
        .set(...bearer(owner.token))
        .send({ day: votedDay, going: true, groupPublicId: group.publicId });

      expect(vote.status).toBe(201);

      const res = await http
        .get('/map/history')
        .set(...bearer(owner.token))
        .query({ groupPublicId: group.publicId, from, to: dayOffset(6) });

      expect(res.status).toBe(200);

      const day = res.body.find((entry: { day: string }) => entry.day.slice(0, 10) === votedDay);

      expect(day).toBeDefined();
      expect(day.places).toHaveLength(1);
      expect(day.places[0].id).toBe(place.publicId);
      expect(day.places[0].voteCount).toBe(1);
      // Who voted only comes back for an authenticated request — the dialog renders
      // these as avatars, so calling this route without a token silently empties it.
      expect(day.places[0].voters).toHaveLength(1);
      expect(day.places[0].voters[0].publicId).toBe(owner.user.publicId);

      const anonymous = await http.get('/map/history').query({ groupPublicId: group.publicId, from, to: dayOffset(6) });

      const anonymousDay = anonymous.body.find((entry: { day: string }) => entry.day.slice(0, 10) === votedDay);

      expect(anonymousDay.places[0].voters).toHaveLength(0);
    });

    it('memberVotes widens a group range to the public votes of its members only', async () => {
      const owner = await createUser(app);
      const outsider = await createUser(app);
      const group = await createGroup(app, owner.user.id);
      const memberPlace = await createPlace(app);
      const outsiderPlace = await createPlace(app);

      const from = dayOffset(0);
      const votedDay = dayOffset(2);

      // Both are public votes (no groupPublicId) — only the member's should surface.
      for (const [voter, place] of [
        [owner, memberPlace],
        [outsider, outsiderPlace],
      ] as const) {
        const vote = await http
          .post(`/places/${place.publicId}/votes`)
          .set(...bearer(voter.token))
          .send({ day: votedDay, going: true });

        expect(vote.status).toBe(201);
      }

      const scoped = await http
        .get('/map/history')
        .set(...bearer(owner.token))
        .query({ groupPublicId: group.publicId, from, to: dayOffset(6) });

      // Without the flag a public vote is out of scope, member or not.
      expect(scoped.body).toHaveLength(0);

      const widened = await http
        .get('/map/history')
        .set(...bearer(owner.token))
        .query({ groupPublicId: group.publicId, from, to: dayOffset(6), memberVotes: '1' });

      const day = widened.body.find((entry: { day: string }) => entry.day.slice(0, 10) === votedDay);
      const placeIds = day.places.map((place: { id: string }) => place.id);

      expect(placeIds).toContain(memberPlace.publicId);
      expect(placeIds).not.toContain(outsiderPlace.publicId);
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
