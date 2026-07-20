import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Leave group (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('DELETE /groups/:groupPublicId/members/me lets a member leave', async () => {
    const owner = await createUser(app);
    const member = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });
    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${member.token}`).send({});

    const res = await http
      .delete(`/groups/${group.publicId}/members/me`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(res.status).toBe(204);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: member.user.id },
    });

    expect(membership).toBeNull();

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, member.user.id] } } });
  });

  it('hands the group over to the remaining member when the owner leaves', async () => {
    const owner = await createUser(app);
    const successor = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });
    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${successor.token}`).send({});

    const res = await http.delete(`/groups/${group.publicId}/members/me`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(204);

    const remaining = await prismaFrom(app).groupMember.findMany({ where: { groupId: group.id } });
    const stillThere = await prismaFrom(app).group.findUnique({
      where: { id: group.id },
      select: { createdById: true },
    });

    expect(remaining).toEqual([expect.objectContaining({ userId: successor.user.id, role: 'OWNER' })]);
    // The denormalised owner column has to follow the membership.
    expect(stillThere?.createdById).toBe(successor.user.id);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, successor.user.id] } } });
  });

  it('deletes the group when its last member leaves', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.delete(`/groups/${group.publicId}/members/me`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(204);
    expect(await prismaFrom(app).group.findUnique({ where: { id: group.id } })).toBeNull();

    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });
});
