import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGroup, createPlace, createTestApp, createUser, prismaFrom } from '@test/utils/e2e';

describe('Get public group (E2E)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /groups/:groupPublicId returns a public group', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.get(`/groups/${group.publicId}`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(group.publicId);
    expect(res.body.membersCount).toBe(1);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/:groupPublicId shows members to a signed-in viewer', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.get(`/groups/${group.publicId}`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.body.members).toEqual([
      expect.objectContaining({ user: expect.objectContaining({ publicId: owner.user.publicId }) }),
    ]);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('GET /groups/:groupPublicId hides members from an anonymous viewer', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });

    const res = await http.get(`/groups/${group.publicId}`);

    expect(res.status).toBe(200);
    expect(res.body.members).toEqual([]);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });

  it('counts a member public vote in todayVotesCount, but not an outsider one', async () => {
    const owner = await createUser(app);
    const outsider = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PUBLIC' });
    const place = await createPlace(app);
    const today = new Date().toISOString().slice(0, 10);

    // Public votes (no groupPublicId): the member's counts as group activity.
    for (const voter of [owner, outsider]) {
      const vote = await http
        .post(`/places/${place.publicId}/votes`)
        .set('Authorization', `Bearer ${voter.token}`)
        .send({ day: today, going: true });

      expect(vote.status).toBe(201);
    }

    const res = await http.get(`/groups/${group.publicId}`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(200);
    expect(res.body.todayVotesCount).toBe(1);

    await prismaFrom(app).placeVote.deleteMany({ where: { placeId: place.id } });
    await prismaFrom(app).place.delete({ where: { id: place.id } });
    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.deleteMany({ where: { id: { in: [owner.user.id, outsider.user.id] } } });
  });

  it('GET /groups/:groupPublicId does not expose a private group', async () => {
    const owner = await createUser(app);
    const group = await createGroup(app, owner.user.id, { privacy: 'PRIVATE' });

    const res = await http.get(`/groups/${group.publicId}`).set('Authorization', `Bearer ${owner.token}`);

    expect(res.status).toBe(404);

    await prismaFrom(app).group.delete({ where: { id: group.id } });
    await prismaFrom(app).user.delete({ where: { id: owner.user.id } });
  });
});
