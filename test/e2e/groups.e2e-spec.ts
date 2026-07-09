import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createTestApp, createUser, prismaFrom } from '../utils/e2e';

describe('Group routes', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /groups creates a group (auth required)', async () => {
    const anon = await http.post('/groups').send({ name: 'X', privacy: 'PUBLIC' });
    expect(anon.status).toBe(401);

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

  it('GET /groups/public and GET /groups/my', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const pub = await http.get('/groups/public').query({ city: 'Niteroi' });
    expect(pub.status).toBe(200);
    expect(Array.isArray(pub.body)).toBe(true);

    const mine = await http.get('/groups/my').set('Authorization', `Bearer ${owner.token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.some((g: { id: string }) => g.id === group.publicId)).toBe(true);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/:groupPublicId returns a public group', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.get(`/groups/${group.publicId}`).set('Authorization', `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(group.publicId);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('POST /groups/:groupPublicId/join joins a public group', async () => {
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

  it('invite flow: member invites -> invitee accepts', async () => {
    const owner = await createUser(app);
    const invitee = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const invite = await http
      .post(`/groups/${group.publicId}/members/${invitee.user.username}/invite`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect([200, 201]).toContain(invite.status);

    const invitedMembership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
      select: { status: true },
    });
    expect(invitedMembership?.status).toBe('INVITED');

    const accept = await http
      .post(`/groups/${group.publicId}/invitation/accept`)
      .set('Authorization', `Bearer ${invitee.token}`);
    expect([200, 201]).toContain(accept.status);

    const activeMembership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
      select: { status: true },
    });
    expect(activeMembership?.status).toBe('ACTIVE');

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, invitee.user.id] } } });
  });

  it('POST /groups/join joins by name', async () => {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });
    const groupName = (await prismaFrom(app).group.findUnique({ where: { id: group.id }, select: { name: true } }))!
      .name;

    const res = await http
      .post('/groups/join')
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({ name: groupName });
    expect([200, 201]).toContain(res.status);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, joiner.user.id] } } });
  });

  it('private-group join stays PENDING until the owner accepts', async () => {
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const join = await http
      .post(`/groups/${group.publicId}/join`)
      .set('Authorization', `Bearer ${joiner.token}`)
      .send({});
    expect([200, 201]).toContain(join.status);
    expect(join.body.status).toBe('PENDING');

    const accept = await http
      .post(`/groups/${group.publicId}/members/${joiner.user.username}/accept`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect([200, 201]).toContain(accept.status);

    const membership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: joiner.user.id },
      select: { status: true },
    });
    expect(membership?.status).toBe('ACTIVE');

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, joiner.user.id] } } });
  });

  it('owner removes a member, and an invitee can decline', async () => {
    const owner = await createUser(app);
    const member = await createUser(app);
    const invitee = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });
    await http.post(`/groups/${group.publicId}/join`).set('Authorization', `Bearer ${member.token}`).send({});

    const remove = await http
      .delete(`/groups/${group.publicId}/members/${member.user.username}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(remove.status).toBe(204);

    await http
      .post(`/groups/${group.publicId}/members/${invitee.user.username}/invite`)
      .set('Authorization', `Bearer ${owner.token}`);
    const decline = await http
      .post(`/groups/${group.publicId}/invitation/decline`)
      .set('Authorization', `Bearer ${invitee.token}`);
    expect([200, 201, 204]).toContain(decline.status);

    const inviteeMembership = await prismaFrom(app).groupMember.findFirst({
      where: { groupId: group.id, userId: invitee.user.id },
    });
    expect(inviteeMembership).toBeNull();

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({
      where: { id: { in: [owner.user.id, member.user.id, invitee.user.id] } },
    });
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

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, member.user.id] } } });
  });
});
