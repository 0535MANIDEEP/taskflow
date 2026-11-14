/**
 * The domain types.
 *
 * These are the shapes the API returns and the shapes the services pass
 * between each other. They are deliberately plain data: no class, no method,
 * nothing that has to be constructed.
 */

export type Role = 'admin' | 'member';

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

/** A user with the password hash still attached. Never leaves the service layer. */
export interface UserWithPassword extends User {
  passwordHash: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  createdByName: string;
  taskCount: number;
  createdAt: string;
}

export interface Task {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: number | null;
  assigneeName: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}
