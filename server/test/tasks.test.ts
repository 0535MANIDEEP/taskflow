import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { app, bearer, resetDatabase, signUp, type Session } from './helpers.js';

let admin: Session;
let member: Session;
let stranger: Session;

let projectId: number;

const createTask = async (session: Session, title: string, assigneeId?: number) => {
  const response = await request(app)
    .post(`/api/projects/${projectId}/tasks`)
    .set(...bearer(session))
    .send({ title, description: 'What has to be done', assigneeId })
    .expect(201);
  return response.body.task as {
    id: number;
    title: string;
    status: string;
    assigneeId: number | null;
  };
};

describe('tasks', () => {
  beforeEach(async () => {
    await resetDatabase();
    admin = await signUp('Avery Admin', 'admin@taskflow.test');
    member = await signUp('Rowan Member', 'member@taskflow.test');
    stranger = await signUp('Sam Stranger', 'stranger@taskflow.test');

    const project = await request(app)
      .post('/api/projects')
      .set(...bearer(admin))
      .send({ name: 'The project the tasks live in' })
      .expect(201);

    projectId = project.body.project.id as number;
  });

  it('adds a task to a project', async () => {
    const task = await createTask(admin, 'Write the migration');

    expect(task.title).toBe('Write the migration');
    expect(task.status).toBe('todo');
  });

  it('refuses a task with no usable title, and says which field', async () => {
    const response = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(...bearer(admin))
      .send({ title: 'no' });

    expect(response.status).toBe(400);
    expect(response.body.fields.title).toMatch(/3 characters/);
  });

  it('lists the tasks in a project', async () => {
    await createTask(admin, 'A first task');
    await createTask(admin, 'A second task');

    const response = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set(...bearer(admin));

    expect(response.status).toBe(200);
    expect(response.body.tasks.length).toBeGreaterThanOrEqual(2);
  });

  it('counts the tasks on the project', async () => {
    const before = await request(app)
      .get(`/api/projects/${projectId}`)
      .set(...bearer(admin));

    await createTask(admin, 'A task that will be counted');

    const after = await request(app)
      .get(`/api/projects/${projectId}`)
      .set(...bearer(admin));

    expect(after.body.project.taskCount).toBe(before.body.project.taskCount + 1);
  });

  it('moves a task along', async () => {
    const task = await createTask(admin, 'A task to move');

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(...bearer(admin))
      .send({ status: 'in_progress' });

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('in_progress');
  });

  it('refuses a status that is not one of the three', async () => {
    const task = await createTask(admin, 'A task with a bad status');

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(...bearer(admin))
      .send({ status: 'nearly_done' });

    expect(response.status).toBe(400);
  });

  it('lets the person the task is assigned to move it', async () => {
    const task = await createTask(admin, 'A task for the member', member.user.id);

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(...bearer(member))
      .send({ status: 'done' });

    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('done');
  });

  it('refuses somebody with no part in the task moving it', async () => {
    const task = await createTask(admin, 'A task with nothing to do with the stranger');

    const response = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set(...bearer(stranger))
      .send({ status: 'done' });

    expect(response.status).toBe(403);
  });

  it('refuses a member adding a task to a project they cannot open', async () => {
    const elsewhere = await request(app)
      .post('/api/projects')
      .set(...bearer(stranger))
      .send({ name: 'A project of the stranger' })
      .expect(201);

    const response = await request(app)
      .post(`/api/projects/${elsewhere.body.project.id}/tasks`)
      .set(...bearer(member))
      .send({ title: 'A task that should not be here' });

    expect(response.status).toBe(403);
  });

  it('deletes a task', async () => {
    const task = await createTask(admin, 'A task to delete');

    const deleted = await request(app)
      .delete(`/api/tasks/${task.id}`)
      .set(...bearer(admin));

    expect(deleted.status).toBe(200);

    const after = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set(...bearer(admin));

    const ids = (after.body.tasks as { id: number }[]).map((t) => t.id);
    expect(ids).not.toContain(task.id);
  });

  it('answers 404 for a task that does not exist', async () => {
    const response = await request(app)
      .patch('/api/tasks/999999')
      .set(...bearer(admin))
      .send({ status: 'done' });

    expect(response.status).toBe(404);
  });

  it('answers 401 for a task request with no token', async () => {
    const response = await request(app).get(`/api/projects/${projectId}/tasks`);

    expect(response.status).toBe(401);
  });
});
