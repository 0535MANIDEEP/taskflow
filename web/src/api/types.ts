/**
 * The shapes the API returns.
 *
 * These are written out rather than imported from the server, because the
 * front end is a separate package with its own build. They are checked
 * against the server's types by hand, and the two are kept in step by the
 * tests on both sides.
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
