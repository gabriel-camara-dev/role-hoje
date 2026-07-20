import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom } from '../utils/e2e';

describe('Friendship routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /friends requires auth', async () => {
    expect((await http.get('/friends')).status).toBe(401);
  });

  it('request -> accept -> list flow', async () => {
    const a = await createUser(app);
    const b = await createUser(app);

    const req = await http.post(`/friends/${b.user.username}/request`).set('Authorization', `Bearer ${a.token}`);
    expect([200, 201]).toContain(req.status);

    // b sees a as a received pending request
    const received = await http.get('/friends').set('Authorization', `Bearer ${b.token}`);
    expect(received.status).toBe(200);
    expect(received.body.some((f: { status: string }) => f.status === 'PENDING')).toBe(true);

    const accept = await http.post(`/friends/${a.user.username}/accept`).set('Authorization', `Bearer ${b.token}`);
    expect([200, 201]).toContain(accept.status);

    const friends = await http.get('/friends').set('Authorization', `Bearer ${a.token}`);
    expect(friends.body.some((f: { status: string }) => f.status === 'ACCEPTED')).toBe(true);

    await prismaFrom(app).user.deleteMany({ where: { id: { in: [a.user.id, b.user.id] } } });
  });

  it('DELETE /friends/:username removes a friendship', async () => {
    const a = await createUser(app);
    const b = await createUser(app);
    await http.post(`/friends/${b.user.username}/request`).set('Authorization', `Bearer ${a.token}`);
    await http.post(`/friends/${a.user.username}/accept`).set('Authorization', `Bearer ${b.token}`);

    const res = await http.delete(`/friends/${b.user.username}`).set('Authorization', `Bearer ${a.token}`);
    expect(res.status).toBe(204);

    const remaining = await prismaFrom(app).friendship.count({
      where: { OR: [{ requesterId: a.user.id }, { addresseeId: a.user.id }] },
    });
    expect(remaining).toBe(0);

    await prismaFrom(app).user.deleteMany({ where: { id: { in: [a.user.id, b.user.id] } } });
  });

  it('POST /friends/:username/reject rejects a received request', async () => {
    const a = await createUser(app);
    const b = await createUser(app);
    await http.post(`/friends/${b.user.username}/request`).set('Authorization', `Bearer ${a.token}`);

    const res = await http.post(`/friends/${a.user.username}/reject`).set('Authorization', `Bearer ${b.token}`);
    expect([200, 201, 204]).toContain(res.status);

    await prismaFrom(app).user.deleteMany({ where: { id: { in: [a.user.id, b.user.id] } } });
  });
});
