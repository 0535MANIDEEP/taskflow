import type { Project, Task, User } from './types';

/**
 * An error the API returned.
 *
 * The status code and the field map are carried with it, because the form
 * that sent the request needs to put each message next to the input that
 * caused it. A message with no field attached goes above the form instead.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const TOKEN_KEY = 'taskflow_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token);

export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  // The API sits behind its own address in production. Left unset, the
  // front end calls its own origin, which is what a single-process deploy
  // needs and what the development proxy is for.
  const base = import.meta.env.VITE_API_URL ?? '';

  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // A response with no body is not an error the client can do anything
  // about, so it is read as an empty object rather than as a crash.
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    fields?: Record<string, string>;
  };

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload.error ?? 'Something went wrong on the server',
      payload.fields,
    );
  }

  return payload as T;
}

export const api = {
  register: (input: { name: string; email: string; password: string }) =>
    request<{ user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  login: (input: { email: string; password: string }) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  projects: () => request<{ projects: Project[] }>('/api/projects'),

  createProject: (input: { name: string; description?: string }) =>
    request<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateProject: (id: number, patch: { name?: string; description?: string }) =>
    request<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteProject: (id: number) =>
    request<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),

  tasks: (projectId: number) =>
    request<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`),

  createTask: (
    projectId: number,
    input: { title: string; description?: string; assigneeId?: number | null },
  ) =>
    request<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateTask: (id: number, patch: { status?: Task['status']; title?: string }) =>
    request<{ task: Task }>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  deleteTask: (id: number) =>
    request<{ ok: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' }),
};
