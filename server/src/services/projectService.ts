import { forbidden, notFound } from '../lib/httpError.js';
import {
  findById,
  hasAssignedTask,
  isCreator,
  listAll,
  listForUser,
  removeProject,
  updateProject as updateProjectRow,
  createProject as createProjectRow,
} from '../repositories/projectRepository.js';
import type { Project, Role } from '../types.js';

/**
 * The project service.
 *
 * Every access rule about projects is in this file, and nowhere else. The
 * routes know how to read a request; the repository knows how to write SQL;
 * this is the only layer that knows who is allowed to do what.
 *
 * The rules:
 *   - an admin sees and may delete every project
 *   - a member sees the projects they created and the ones they have a task
 *     assigned in, and may change only the ones they created
 */
export async function listProjects(userId: number, role: Role): Promise<Project[]> {
  return role === 'admin' ? listAll() : listForUser(userId);
}

export async function createProject(
  userId: number,
  input: { name: string; description: string },
): Promise<Project> {
  return createProjectRow({
    name: input.name,
    description: input.description,
    createdBy: userId,
  });
}

/**
 * True when the user may open the project at all.
 *
 * A member who has a task assigned in somebody else's project has to be able
 * to open it, or the assignment is invisible and the task cannot be moved.
 */
export async function canAccessProject(
  userId: number,
  role: Role,
  projectId: number,
): Promise<boolean> {
  if (role === 'admin') return true;
  if (await isCreator(projectId, userId)) return true;
  return hasAssignedTask(projectId, userId);
}

export async function getProject(
  userId: number,
  role: Role,
  projectId: number,
): Promise<Project> {
  const project = await findById(projectId);
  if (!project) throw notFound('No project with that id');
  if (!(await canAccessProject(userId, role, projectId))) {
    throw forbidden('That project is not yours to open');
  }
  return project;
}

export async function updateProject(
  userId: number,
  role: Role,
  projectId: number,
  patch: { name?: string; description?: string },
): Promise<Project> {
  const project = await findById(projectId);
  if (!project) throw notFound('No project with that id');

  if (role !== 'admin' && project.createdBy !== userId) {
    throw forbidden('You can only change projects you created');
  }

  const updated = await updateProjectRow(projectId, patch);
  if (!updated) throw notFound('No project with that id');
  return updated;
}

/**
 * Deletes a project and, through the foreign key, every task in it.
 *
 * Only an admin. A member deletes their own work by archiving it; a project
 * somebody else is working in is not theirs to remove.
 */
export async function deleteProject(
  userId: number,
  role: Role,
  projectId: number,
): Promise<void> {
  if (role !== 'admin') {
    throw forbidden('Only an admin can delete a project');
  }

  const removed = await removeProject(projectId);
  if (!removed) throw notFound('No project with that id');
}
