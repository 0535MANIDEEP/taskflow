import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app, bearer, resetDatabase, signUp, type Session } from './helpers.js';

let admin: Session;
let member: Session;

const createProject = async (session: Session, name: string) => {
  const response = await request(app)
    .post('/api/projects')
    .set(...bearer(session))
    .send({ name, description: 'A description' })
    .expect(201);
  return response.body.project as { id: number; name: string; createdBy: number };
};

describe('projects', () => {
  beforeEach(async () => {
    await resetDatabase();
    // The first account to exist is the admin, so the order matters here.
    admin = await signUp('Avery Admin', 'admin@taskflow.test');
    member = await signUp('Rowan Member', 'member@taskflow.test');
  });

  it('creates a project and records who owns it', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set(...bearer(member))
      .send({ name: 'Website rebuild', description: 'The one that matters' });

    expect(response.status).toBe(201);
    expect(response.body.project.name).toBe('Website rebuild');
    expect(response.body.project.createdBy).toBe(member.user.id);
    expect(response.body.project.taskCount).toBe(0);
  });

  it('refuses a project with no usable name, and says which field', async () => {
    const response = await request(app)
      .post('/api/projects')
      .set(...bearer(member))
      .send({ name: 'ab' });

    expect(response.status).toBe(400);
    expect(response.body.fields.name).toMatch(/3 characters/);
  });

  it('shows a member the projects they created', async () => {
    const mine = await createProject(member, 'A project of mine');

    const response = await request(app).get('/api/projects').set(...bearer(member));
    const ids = (response.body.projects as { id: number }[]).map((p) => p.id);

    expect(ids).toContain(mine.id);
  });

  it('hides from a member the projects they had nothing to do with', async () => {
    const theirs = await createProject(admin, 'Somebody else project');

    const response = await request(app).get('/api/projects').set(...bearer(member));
    const ids = (response.body.projects as { id: number }[]).map((p) => p.id);

    expect(ids).not.toContain(theirs.id);
  });

  it('shows a member the project they have a task assigned in', async () => {
    const shared = await createProject(admin, 'A shared project');

    await request(app)
      .post(`/api/projects/${shared.id}/tasks`)
      .set(...bearer(admin))
      .send({ title: 'A task for the member', assigneeId: member.user.id })
      .expect(201);

    // An assignment has to be visible, or the task cannot be worked on.
    const list = await request(app).get('/api/projects').set(...bearer(member));
    const ids = (list.body.projects as { id: number }[]).map((p) => p.id);
    expect(ids).toContain(shared.id);

    const open = await request(app)
      .get(`/api/projects/${shared.id}`)
      .set(...bearer(member));
    expect(open.status).toBe(200);
  });

  it('refuses a member opening a project that is not theirs', async () => {
    const theirs = await createProject(admin, 'Not for the member');

    const response = await request(app)
      .get(`/api/projects/${theirs.id}`)
      .set(...bearer(member));

    expect(response.status).toBe(403);
  });

  it('lets a member rename their own project', async () => {
    const mine = await createProject(member, 'Before the rename');

    const response = await request(app)
      .patch(`/api/projects/${mine.id}`)
      .set(...bearer(member))
      .send({ name: 'After the rename' });

    expect(response.status).toBe(200);
    expect(response.body.project.name).toBe('After the rename');
  });

  it('refuses a member renaming a project they do not own', async () => {
    const theirs = await createProject(admin, 'Not for the member to rename');

    const response = await request(app)
      .patch(`/api/projects/${theirs.id}`)
      .set(...bearer(member))
      .send({ name: 'Renamed anyway' });

    expect(response.status).toBe(403);
  });

  it('lets an admin delete a project, and takes its tasks with it', async () => {
    const doomed = await createProject(admin, 'A doomed project');

    await request(app)
      .post(`/api/projects/${doomed.id}/tasks`)
      .set(...bearer(admin))
      .send({ title: 'A task inside it' })
      .expect(201);

    const deleted = await request(app)
      .delete(`/api/projects/${doomed.id}`)
      .set(...bearer(admin));

    expect(deleted.status).toBe(200);

    // The tasks went with it. The foreign key is ON DELETE CASCADE, and a
    // task pointing at a project that does not exist would be a hole.
    const tasks = await request(app)
      .get(`/api/projects/${doomed.id}/tasks`)
      .set(...bearer(admin));

    expect(tasks.status).toBe(404);
  });

  it('refuses a member deleting a project', async () => {
    const theirs = await createProject(admin, 'Still not the member project');

    const response = await request(app)
      .delete(`/api/projects/${theirs.id}`)
      .set(...bearer(member));

    expect(response.status).toBe(403);
  });

  it('answers 404 for a project that does not exist', async () => {
    const response = await request(app).get('/api/projects/999999').set(...bearer(admin));

    expect(response.status).toBe(404);
  });

  it('answers 401 for a project request with no token', async () => {
    const response = await request(app).get('/api/projects');

    expect(response.status).toBe(401);
  });
});
