import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Invite group member (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  async function cleanUp(group: { id: number }, userIds: number[]) {
    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: userIds } } });
  }

  it('POST /groups/:groupPublicId/members/:username/invite leaves the invite pending acceptance', async () => {
    const owner = await createUser(app);
    const invitee = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const res = await http
      .post(`/groups/${group.publicId}/members/${invitee.user.username}/invite`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect([200, 201]).toContain(res.status);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
      select: { status: true },
    });

    // INVITED grants no access on its own.
    expect(membership?.status).toBe('INVITED');

    await cleanUp(group, [owner.user.id, invitee.user.id]);
  });

  it('rejects an invite from someone outside the group', async () => {
    const owner = await createUser(app);
    const outsider = await createUser(app);
    const invitee = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http
      .post(`/groups/${group.publicId}/members/${invitee.user.username}/invite`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);

    await cleanUp(group, [owner.user.id, outsider.user.id, invitee.user.id]);
  });

  it('rejects inviting someone who is already an active member', async () => {
    const owner = await createUser(app);
    const member = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${member.token}`).send({});

    const res = await http
      .post(`/groups/${group.publicId}/members/${member.user.username}/invite`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(409);

    await cleanUp(group, [owner.user.id, member.user.id]);
  });
});
