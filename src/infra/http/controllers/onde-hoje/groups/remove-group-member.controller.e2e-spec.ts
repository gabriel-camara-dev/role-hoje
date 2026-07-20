import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Remove group member (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  /** A public group the member has already joined. */
  async function setUpGroupWithMember() {
    const owner = await createUser(app);
    const member = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${member.token}`).send({});

    return { owner, member, group };
  }

  async function cleanUp(group: { id: number }, userIds: number[]) {
    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: userIds } } });
  }

  it('DELETE /groups/:groupPublicId/members/:username lets the owner remove a member', async () => {
    const { owner, member, group } = await setUpGroupWithMember();

    const res = await http
      .delete(`/groups/${group.publicId}/members/${member.user.username}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(204);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: member.user.id },
    });

    expect(membership).toBeNull();

    await cleanUp(group, [owner.user.id, member.user.id]);
  });

  it('rejects a plain member removing someone', async () => {
    const { owner, member, group } = await setUpGroupWithMember();

    const res = await http
      .delete(`/groups/${group.publicId}/members/${owner.user.username}`)
      .set('Authorization', `Bearer ${member.token}`);

    expect(res.status).toBe(403);

    await cleanUp(group, [owner.user.id, member.user.id]);
  });

  it('rejects the owner removing themselves', async () => {
    const { owner, member, group } = await setUpGroupWithMember();

    const res = await http
      .delete(`/groups/${group.publicId}/members/${owner.user.username}`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(403);

    await cleanUp(group, [owner.user.id, member.user.id]);
  });
});
