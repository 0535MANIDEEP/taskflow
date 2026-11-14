import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthProvider } from '../auth/AuthProvider';
import { LoginPage } from '../pages/LoginPage';

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

/**
 * The API answers two kinds of request here: the session check the provider
 * makes on mount, and the sign in the form makes. The first one is refused,
 * so the page starts as a signed-out visitor.
 */
const mockApi = (loginResponse: { ok: boolean; body: unknown }) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/auth/me') {
      return { ok: false, json: async () => ({ error: 'No session' }) };
    }
    return { ok: loginResponse.ok, json: async () => loginResponse.body };
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('the sign in form', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses an address that is not an address, without calling the server', async () => {
    const fetchMock = mockApi({ ok: false, body: { error: 'no' } });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    // The rule is checked on this side, so the request is never sent.
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/login', expect.anything());
  });

  it('shows the message the server sent', async () => {
    mockApi({
      ok: false,
      body: { error: 'That email and password do not match' },
    });
    renderLogin();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'a@b.co' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password do not match',
    );
  });
});
