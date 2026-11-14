import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { fieldErrors, signUpSchema, type FieldErrors } from '../lib/validation';

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setMessage('');

    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }

    setSubmitting(true);
    try {
      await signUp(parsed.data.name, parsed.data.email, parsed.data.password);
      // Registering does not sign in, so the account signs in like any other.
      navigate('/login');
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
        <h1 className="auth__title">Create an account</h1>
        <p className="auth__lede">
          The first account to register is the admin. Every account after that is a member,
          and the role is decided by the server rather than by the form.
        </p>

        <form onSubmit={submit} noValidate className="form">
          <div className="field">
            <label className="field__label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className="field__input"
            />
            {errors.name ? (
              <p className="field__error" id="name-error">
                {errors.name}
              </p>
            ) : null}
          </div>

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
              autoComplete="new-password"
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
            {submitting ? 'Creating the account' : 'Create account'}
          </button>
        </form>

        <p className="auth__foot">
          Already have one? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
