import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('List my groups (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /groups/my lists the caller’s group with their standing in it', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.get('/groups/my').set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);

    const mine = res.body.find((item: { id: string }) => item.id === group.publicId);

    expect(mine).toBeDefined();
    expect(mine.myRole).toBe('OWNER');
    expect(mine.myStatus).toBe('ACTIVE');
    expect(mine.members).toEqual([
      expect.objectContaining({
        role: 'OWNER',
        status: 'ACTIVE',
        user: expect.objectContaining({ publicId: owner.user.publicId }),
      }),
    ]);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/my never exposes the group password hash', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const res = await http.get('/groups/my').set('Authorization', `Bearer ${owner.token}`);
    const mine = res.body.find((item: { id: string }) => item.id === group.publicId);

    expect(mine).not.toHaveProperty('passwordHash');
    expect(mine).not.toHaveProperty('publicId');

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/my requires authentication', async () => {
    const res = await http.get('/groups/my');

    expect(res.status).toBe(401);
  });
});
