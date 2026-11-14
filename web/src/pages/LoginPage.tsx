import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { fieldErrors, signInSchema, type FieldErrors } from '../lib/validation';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setMessage('');

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      navigate('/projects');
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields ?? {});
        setMessage(error.message);
      } else {
        setMessage('Could not reach the server. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__card">
        <h1 className="auth__title">Sign in</h1>
        <p className="auth__lede">
          The first account to register is the admin. Every account after that is a member.
        </p>

        <form onSubmit={submit} noValidate className="form">
          <div className="field">
            <label className="field__label" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className="field__input"
            />
            {errors.email ? (
              <p className="field__error" id="email-error">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
              className="field__input"
            />
            {errors.password ? (
              <p className="field__error" id="password-error">
                {errors.password}
              </p>
            ) : null}
          </div>

          {message ? (
            <p role="alert" className="form__message">
              {message}
            </p>
          ) : null}

          <button type="submit" className="button button--primary" disabled={submitting}>
            {submitting ? 'Signing in' : 'Sign in'}
          </button>
        </form>

        <p className="auth__foot">
          No account yet? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
