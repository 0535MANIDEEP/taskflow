import { Router } from 'express';

import { authenticate } from '../middleware/authenticate.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { idParamSchema, updateTaskSchema } from '../schemas.js';
import { deleteTask, updateTask } from '../services/taskService.js';

const router = Router();

router.use(authenticate);

/**
 * Moves a task along, or renames it, or hands it to somebody else.
 *
 * The permission rule is not a role gate: an admin, the owner of the project
 * and the person the task is assigned to can all do this. The service
 * decides, and it knows who created the project and who the task belongs to.
 */
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTaskSchema),
  async (req, res) => {
    const task = await updateTask(req.userId!, req.userRole!, Number(req.params.id), req.body);
    res.json({ task });
  },
);

/**
 * Removes a task.
 */
router.delete('/:id', validateParams(idParamSchema), async (req, res) => {
  await deleteTask(req.userId!, req.userRole!, Number(req.params.id));
  res.json({ ok: true });
});

export default router;
