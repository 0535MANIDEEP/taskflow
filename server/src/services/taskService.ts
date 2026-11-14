import { forbidden, notFound } from '../lib/httpError.js';
import {
  createTask as createTaskRow,
  findById,
  listByProject,
  removeTask,
  updateTask as updateTaskRow,
} from '../repositories/taskRepository.js';
import { canAccessProject, getProject } from './projectService.js';
import type { Role, Task, TaskStatus } from '../types.js';

/**
 * The task service.
 *
 * A task is reachable by three kinds of user: the admin, whoever created the
 * project it sits in, and whoever the task is assigned to. That last one
 * matters: a task assigned to somebody is their work, and they have to be
 * able to move it along without being an administrator.
 */
export async function listTasks(
  userId: number,
  role: Role,
  projectId: number,
): Promise<Task[]> {
  // The project is fetched first so that a request for the tasks of a
  // project that does not exist answers 404 rather than an empty list. An
  // empty list for a project that is not there reads as "nothing to do here",
  // which is a different answer.
  await getProject(userId, role, projectId);
  return listByProject(projectId);
}

export async function createTask(
  userId: number,
  role: Role,
  projectId: number,
  input: { title: string; description: string; assigneeId?: number | null },
): Promise<Task> {
  await getProject(userId, role, projectId);

  return createTaskRow({
    projectId,
    title: input.title,
    description: input.description,
    assigneeId: input.assigneeId ?? null,
    createdBy: userId,
  });
}

/**
 * True when the user may change the task.
 */
async function canChangeTask(userId: number, role: Role, task: Task): Promise<boolean> {
  if (role === 'admin') return true;
  if (task.assigneeId === userId) return true;
  return canAccessProject(userId, role, task.projectId);
}

export async function getTask(userId: number, role: Role, taskId: number): Promise<Task> {
  const task = await findById(taskId);
  if (!task) throw notFound('No task with that id');
  if (!(await canChangeTask(userId, role, task))) {
    throw forbidden('That task is not yours to change');
  }
  return task;
}

export async function updateTask(
  userId: number,
  role: Role,
  taskId: number,
  patch: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeId?: number | null;
  },
): Promise<Task> {
  const task = await findById(taskId);
  if (!task) throw notFound('No task with that id');

  if (!(await canChangeTask(userId, role, task))) {
    throw forbidden('That task is not yours to change');
  }

  const updated = await updateTaskRow(taskId, patch);
  if (!updated) throw notFound('No task with that id');
  return updated;
}

export async function deleteTask(
  userId: number,
  role: Role,
  taskId: number,
): Promise<void> {
  const task = await findById(taskId);
  if (!task) throw notFound('No task with that id');

  if (!(await canChangeTask(userId, role, task))) {
    throw forbidden('That task is not yours to delete');
  }

  const removed = await removeTask(taskId);
  if (!removed) throw notFound('No task with that id');
}
