import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Respond group invite (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  /** A group with a live invite waiting on the invitee. */
  async function setUpInvite() {
    const owner = await createUser(app);
    const invitee = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    await http
      .post(`/groups/${group.publicId}/members/${invitee.user.username}/invite`)
      .set('Authorization', `Bearer ${owner.token}`);

    return { owner, invitee, group };
  }

  async function cleanUp(group: { id: number }, userIds: number[]) {
    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: userIds } } });
  }

  it('POST /groups/:groupPublicId/invitation/accept turns the invite into membership', async () => {
    const { owner, invitee, group } = await setUpInvite();

    const res = await http
      .post(`/groups/${group.publicId}/invitation/accept`)
      .set('Authorization', `Bearer ${invitee.token}`);

    expect([200, 201]).toContain(res.status);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
      select: { status: true },
    });

    expect(membership?.status).toBe('ACTIVE');

    await cleanUp(group, [owner.user.id, invitee.user.id]);
  });

  it('POST /groups/:groupPublicId/invitation/decline drops the membership', async () => {
    const { owner, invitee, group } = await setUpInvite();

    const res = await http
      .post(`/groups/${group.publicId}/invitation/decline`)
      .set('Authorization', `Bearer ${invitee.token}`);

    expect([200, 201, 204]).toContain(res.status);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
    });

    expect(membership).toBeNull();

    await cleanUp(group, [owner.user.id, invitee.user.id]);
  });

  it('rejects responding to an invite that was never sent', async () => {
    const { owner, invitee, group } = await setUpInvite();
    const stranger = await createUser(app);

    const res = await http
      .post(`/groups/${group.publicId}/invitation/accept`)
      .set('Authorization', `Bearer ${stranger.token}`);

    expect(res.status).toBe(409);

    await cleanUp(group, [owner.user.id, invitee.user.id, stranger.user.id]);
  });
});
