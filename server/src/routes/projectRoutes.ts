import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import {
  createProjectSchema,
  createTaskSchema,
  idParamSchema,
  updateProjectSchema,
} from '../schemas.js';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from '../services/projectService.js';
import { createTask, listTasks } from '../services/taskService.js';

const router = Router();

/**
 * Every route below needs a token. The role is then read from the database
 * and the service layer decides what this particular user may do with this
 * particular project.
 */
router.use(authenticate);

/**
 * The projects the signed-in user may see.
 */
router.get('/', async (req, res) => {
  const projects = await listProjects(req.userId!, req.userRole!);
  res.json({ projects });
});

/**
 * Creates a project. Any signed-in user may create one; the creator becomes
 * its owner.
 */
router.post('/', validateBody(createProjectSchema), async (req, res) => {
  const project = await createProject(req.userId!, req.body);
  res.status(201).json({ project });
});

/**
 * One project.
 */
router.get('/:id', validateParams(idParamSchema), async (req, res) => {
  const project = await getProject(req.userId!, req.userRole!, Number(req.params.id));
  res.json({ project });
});

/**
 * Renames or re-describes a project. Its creator may; an admin may.
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateProjectSchema),
  async (req, res) => {
    const project = await updateProject(
      req.userId!,
      req.userRole!,
      Number(req.params.id),
      req.body,
    );
    res.json({ project });
  },
);

/**
 * Deletes a project and every task in it.
 *
 * The role gate is here and the check is also in the service. The gate is
 * the cheap rejection of a request that could never be allowed; the service
 * is the rule that survives someone adding another route by hand.
 */
router.delete('/:id', validateParams(idParamSchema), requireRole('admin'), async (req, res) => {
  await deleteProject(req.userId!, req.userRole!, Number(req.params.id));
  res.json({ ok: true });
});

/**
 * The tasks in a project.
 */
router.get('/:id/tasks', validateParams(idParamSchema), async (req, res) => {
  const tasks = await listTasks(req.userId!, req.userRole!, Number(req.params.id));
  res.json({ tasks });
});

/**
 * Adds a task to a project.
 */
router.post(
  '/:id/tasks',
  validateParams(idParamSchema),
  validateBody(createTaskSchema),
  async (req, res) => {
    const task = await createTask(req.userId!, req.userRole!, Number(req.params.id), req.body);
    res.status(201).json({ task });
  },
);

export default router;
