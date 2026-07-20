import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';
import { waitFor } from '@test/utils/wait-for';

describe('Accept group member (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  /** A private group with a join request waiting on the owner. */
  async function setUpPendingRequest() {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${joiner.token}`).send({});

    return { owner, joiner, group };
  }

  async function cleanUp(group: { id: number }, userIds: number[]) {
    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: userIds } } });
  }

  it('POST /groups/:groupPublicId/members/:username/accept activates the membership', async () => {
    const { owner, joiner, group } = await setUpPendingRequest();

    const res = await http
      .post(`/groups/${group.publicId}/members/${joiner.user.username}/accept`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect([200, 201]).toContain(res.status);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: joiner.user.id },
      select: { status: true },
    });

    expect(membership?.status).toBe('ACTIVE');

    // The OnGroupMemberAccepted subscriber notifies the member out of band.
    await waitFor(async () => {
      const notification = await prismaFrom(app).notification.findFirst({
        where: { userId: joiner.user.id, type: 'GROUP_MEMBER_ACCEPTED' },
      });

      expect(notification).not.toBeNull();
    });

    await cleanUp(group, [owner.user.id, joiner.user.id]);
  });

  it('rejects a plain member trying to accept someone', async () => {
    const { owner, joiner, group } = await setUpPendingRequest();
    const outsider = await createUser(app);

    const res = await http
      .post(`/groups/${group.publicId}/members/${joiner.user.username}/accept`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);

    await cleanUp(group, [owner.user.id, joiner.user.id, outsider.user.id]);
  });

  it('rejects accepting a member whose request is not pending', async () => {
    const { owner, joiner, group } = await setUpPendingRequest();

    await http
      .post(`/groups/${group.publicId}/members/${joiner.user.username}/accept`)
      .set('Authorization', `Bearer ${owner.token}`);

    const again = await http
      .post(`/groups/${group.publicId}/members/${joiner.user.username}/accept`)
      .set('Authorization', `Bearer ${owner.token}`);

    expect(again.status).toBe(409);

    await cleanUp(group, [owner.user.id, joiner.user.id]);
  });
});
