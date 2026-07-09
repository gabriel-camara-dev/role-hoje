import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom } from '../utils/e2e';

describe('Notification routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /notifications requires auth and returns the paginated shape', async () => {
    expect((await http.get('/notifications')).status).toBe(401);

    const { user, token } = await createUser(app);
    const res = await http.get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('unreadCount');
    expect(res.body).toHaveProperty('hasMore');
    expect(Array.isArray(res.body.notifications)).toBe(true);
    await prismaFrom(app).user.delete({ where: { id: user.id } });
  });

  it('a friend request produces a notification that can be marked read', async () => {
    const a = await createUser(app);
    const b = await createUser(app);

    // a -> b friend request dispatches a FRIEND_REQUEST notification to b.
    await http.post(`/friends/${b.user.username}/request`).set('Authorization', `Bearer ${a.token}`);

    const list = await http.get('/notifications').set('Authorization', `Bearer ${b.token}`);
    expect(list.status).toBe(200);
    expect(list.body.notifications.length).toBeGreaterThanOrEqual(1);
    expect(list.body.unreadCount).toBeGreaterThanOrEqual(1);

    const id = list.body.notifications[0].id;
    const read = await http
      .post(`/notifications/${id}/read`)
      .set('Authorization', `Bearer ${b.token}`);
    expect([200, 201, 204]).toContain(read.status);

    const readAll = await http.post('/notifications/read-all').set('Authorization', `Bearer ${b.token}`);
    expect([200, 201, 204]).toContain(readAll.status);

    const after = await http.get('/notifications').set('Authorization', `Bearer ${b.token}`);
    expect(after.body.unreadCount).toBe(0);

    await prismaFrom(app).user.deleteMany({ where: { id: { in: [a.user.id, b.user.id] } } });
  });
});
