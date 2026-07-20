import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Create group (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /groups creates a group', async () => {
    const { user, token } = await createUser(app);

    const res = await http
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'E2E Group', privacy: 'PUBLIC' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.name).toBe('E2E Group');

    await prismaFrom(app).group.deleteMany({ where: { publicId: res.body.id } });
    await prismaFrom(app).user.delete({ where: { id: user.id } });
  });

  it('POST /groups enrols the creator as the active owner', async () => {
    const { user, token } = await createUser(app);

    const res = await http
      .post('/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Owned Group', privacy: 'PUBLIC' });

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { group: { publicId: res.body.id }, userId: user.id },
      select: { role: true, status: true },
    });

    expect(membership).toEqual({ role: 'OWNER', status: 'ACTIVE' });

    await prismaFrom(app).group.deleteMany({ where: { publicId: res.body.id } });
    await prismaFrom(app).user.delete({ where: { id: user.id } });
  });

  it('POST /groups requires authentication', async () => {
    const res = await http.post('/groups').send({ name: 'X', privacy: 'PUBLIC' });

    expect(res.status).toBe(401);
  });
});
