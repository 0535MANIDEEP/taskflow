import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { api, ApiError } from '../api/client';
import type { Project } from '../api/types';
import { RequireRole } from '../components/RequireRole';
import { Empty } from '../components/states/Empty';
import { ErrorState } from '../components/states/ErrorState';
import { Loading } from '../components/states/Loading';
import { fieldErrors, projectSchema, type FieldErrors } from '../lib/validation';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .projects()
      .then((result) => {
        if (!active) return;
        setProjects(result.projects);
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
  }, [reloadKey]);

  const retry = useCallback(() => {
    setStatus('loading');
    setErrorMessage('');
    setReloadKey((key) => key + 1);
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return projects;
    return projects.filter((project) => project.name.toLowerCase().includes(needle));
  }, [projects, query]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setFormMessage('');

    const parsed = projectSchema.safeParse({ name, description });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      const result = await api.createProject(parsed.data);
      setProjects((current) => [result.project, ...current]);
      setName('');
      setDescription('');
      setCreating(false);
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

  const remove = async (project: Project) => {
    try {
      await api.deleteProject(project.id);
      setProjects((current) => current.filter((item) => item.id !== project.id));
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : 'The server could not be reached.',
      );
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h1 className="page__title">Projects</h1>
          <p className="page__lede">
            {status === 'ready'
              ? `${visible.length} of ${projects.length} shown`
              : 'Reading the register'}
          </p>
        </div>

        <button
          type="button"
          className="button button--primary"
          onClick={() => setCreating((current) => !current)}
        >
          {creating ? 'Cancel' : 'New project'}
        </button>
      </div>

      {creating ? (
        <form onSubmit={create} noValidate className="panel form">
          <h2 className="panel__title">New project</h2>

          <div className="field">
            <label className="field__label" htmlFor="project-name">
              Name
            </label>
            <input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'project-name-error' : undefined}
              className="field__input"
            />
            {errors.name ? (
              <p className="field__error" id="project-name-error">
                {errors.name}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="project-description">
              Description
            </label>
            <textarea
              id="project-description"
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
            {submitting ? 'Creating' : 'Create project'}
          </button>
        </form>
      ) : null}

      <div className="toolbar">
        <label className="sr-only" htmlFor="project-search">
          Search projects by name
        </label>
        <input
          id="project-search"
          type="search"
          placeholder="Search by name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="field__input field__input--search"
        />
      </div>

      {status === 'loading' ? <Loading label="Loading projects" /> : null}

      {status === 'error' ? (
        <ErrorState description={errorMessage} onRetry={retry} />
      ) : null}

      {status === 'ready' && visible.length === 0 ? (
        <Empty
          title={projects.length === 0 ? 'No projects yet' : 'Nothing matches that search'}
          description={
            projects.length === 0
              ? 'Create the first one and it will show up here.'
              : 'Clear the search to see the whole register.'
          }
        />
      ) : null}

      {status === 'ready' && visible.length > 0 ? (
        <ul className="cards">
          {visible.map((project) => (
            <li key={project.id} className="card">
              <div className="card__head">
                <h2 className="card__title">
                  <Link to={`/projects/${project.id}`}>{project.name}</Link>
                </h2>
                <span className="card__count">{project.taskCount} tasks</span>
              </div>

              {project.description ? (
                <p className="card__description">{project.description}</p>
              ) : null}

              <div className="card__foot">
                <span className="card__owner">Created by {project.createdByName}</span>

                {/*
                  The delete button is only rendered for an admin, and the
                  server refuses the request from anybody else. Hiding it is
                  for the person using the interface; the refusal is the rule.
                */}
                <RequireRole role="admin">
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => void remove(project)}
                  >
                    Delete
                  </button>
                </RequireRole>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
