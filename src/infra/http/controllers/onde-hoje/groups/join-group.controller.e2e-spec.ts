import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Join group (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /groups/:groupPublicId/join joins a public group as an active member', async () => {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http
      .post(`/groups/${group.publicId}/join`)
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({});

    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('ACTIVE');

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, joiner.user.id] } } });
  });

  it('POST /groups/join joins by name', async () => {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http
      .post('/groups/join')
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({ name: group.name });

    expect([200, 201]).toContain(res.status);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, joiner.user.id] } } });
  });

  it('POST /groups/:groupPublicId/join leaves a private-group request pending', async () => {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const res = await http
      .post(`/groups/${group.publicId}/join`)
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({});

    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('PENDING');

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, joiner.user.id] } } });
  });

  it('POST /groups/:groupPublicId/join requires authentication', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.post(`/groups/${group.publicId}/join`).send({});

    expect(res.status).toBe(401);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });
});
