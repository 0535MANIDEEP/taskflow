import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { api, ApiError } from '../api/client';
import type { Project, Task, TaskStatus } from '../api/types';
import { RequireRole } from '../components/RequireRole';
import { Empty } from '../components/states/Empty';
import { ErrorState } from '../components/states/ErrorState';
import { Loading } from '../components/states/Loading';
import { fieldErrors, taskSchema, type FieldErrors } from '../lib/validation';

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To do' },
  { status: 'in_progress', label: 'In progress' },
  { status: 'done', label: 'Done' },
];

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([api.projects(), api.tasks(projectId)])
      .then(([projectList, taskList]) => {
        if (!active) return;
        const found = projectList.projects.find((item) => item.id === projectId);
        if (!found) {
          setErrorMessage('No project with that id');
          setStatus('error');
          return;
        }
        setProject(found);
        setTasks(taskList.tasks);
        setStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(
          error instanceof ApiError ? error.message : 'The server could not be reached.',
        );
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, [projectId, reloadKey]);

  const retry = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
    setReloadKey((key) => key + 1);
  }, []);

  const addTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setFormMessage('');

    const parsed = taskSchema.safeParse({ title, description });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createTask(projectId, parsed.data);
      setTasks((current) => [...current, result.task]);
      setTitle('');
      setDescription('');
      setAdding(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields ?? {});
        setFormMessage(error.message);
      } else {
        setFormMessage('The server could not be reached.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const move = async (task: Task, next: TaskStatus) => {
    try {
      const result = await api.updateTask(task.id, { status: next });
      setTasks((current) => current.map((item) => (item.id === task.id ? result.task : item)));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'The server could not be reached.',
      );
    }
  };

  const remove = async (task: Task) => {
    try {
      await api.deleteTask(task.id);
      setTasks((current) => current.filter((item) => item.id !== task.id));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'The server could not be reached.',
      );
    }
  };

  return (
    <div className="page">
      <Link to="/projects" className="page__back">
        Projects
      </Link>

      {status === 'loading' ? <Loading label="Loading the project" /> : null}

      {status === 'error' ? (
        <ErrorState description={errorMessage} onRetry={retry} />
      ) : null}

      {status === 'ready' && project ? (
        <>
          <div className="page__head">
            <div>
              <h1 className="page__title">{project.name}</h1>
              <p className="page__lede">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}, created by{' '}
                {project.createdByName}
              </p>
            </div>

            <button
              type="button"
              className="button button--primary"
              onClick={() => setAdding((current) => !current)}
            >
              {adding ? 'Cancel' : 'Add task'}
            </button>
          </div>

          {adding ? (
            <form onSubmit={addTask} noValidate className="panel form">
              <h2 className="panel__title">New task</h2>

              <div className="field">
                <label className="field__label" htmlFor="task-title">
                  Title
                </label>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'task-title-error' : undefined}
                  className="field__input"
                />
                {errors.title ? (
                  <p className="field__error" id="task-title-error">
                    {errors.title}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="task-description">
                  Description
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="field__input field__input--area"
                />
              </div>

              {formMessage ? (
                <p role="alert" className="form__message">
                  {formMessage}
                </p>
              ) : null}

              <button type="submit" className="button button--primary" disabled={submitting}>
                {submitting ? 'Adding' : 'Add task'}
              </button>
            </form>
          ) : null}

          {tasks.length === 0 ? (
            <Empty
              title="No tasks in this project"
              description="Add the first one and it will show up on the board."
            />
          ) : (
            <div className="board">
              {COLUMNS.map((column) => {
                const columnTasks = tasks.filter((task) => task.status === column.status);
                return (
                  <section key={column.status} className="board__column">
                    <h2 className="board__heading">
                      {column.label}
                      <span className="board__count">{columnTasks.length}</span>
                    </h2>

                    {columnTasks.length === 0 ? (
                      <p className="board__empty">Nothing here yet</p>
                    ) : (
                      <ul className="board__list">
                        {columnTasks.map((task) => (
                          <li key={task.id} className="task">
                            <p className="task__title">{task.title}</p>
                            {task.description ? (
                              <p className="task__description">{task.description}</p>
                            ) : null}

                            <div className="task__actions">
                              {column.status !== 'todo' ? (
                                <button
                                  type="button"
                                  className="button button--quiet"
                                  onClick={() => void move(task, 'todo')}
                                >
                                  To do
                                </button>
                              ) : null}
                              {column.status !== 'in_progress' ? (
                                <button
                                  type="button"
                                  className="button button--quiet"
                                  onClick={() => void move(task, 'in_progress')}
                                >
                                  Start
                                </button>
                              ) : null}
                              {column.status !== 'done' ? (
                                <button
                                  type="button"
                                  className="button button--quiet"
                                  onClick={() => void move(task, 'done')}
                                >
                                  Done
                                </button>
                              ) : null}

                              <RequireRole role="admin">
                                <button
                                  type="button"
                                  className="button button--danger"
                                  onClick={() => void remove(task)}
                                >
                                  Delete
                                </button>
                              </RequireRole>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
