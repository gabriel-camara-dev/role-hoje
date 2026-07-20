import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('List public groups (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /groups/public lists a public group with its counts', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC', city: 'Niteroi' });

    const res = await http.get('/groups/public').query({ city: 'Niteroi' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const listed = res.body.find((item: { id: string }) => item.id === group.publicId);

    expect(listed).toBeDefined();
    // The owner's membership is the one active member.
    expect(listed.membersCount).toBe(1);
    expect(listed.todayVotesCount).toBe(0);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/public does not leak private groups', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE', city: 'Niteroi' });

    const res = await http.get('/groups/public').query({ city: 'Niteroi' });

    expect(res.body.some((item: { id: string }) => item.id === group.publicId)).toBe(false);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/public is open to anonymous callers', async () => {
    const res = await http.get('/groups/public');

    expect(res.status).toBe(200);
  });
});
