import { Link, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../auth/AuthProvider';

export function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <header className="shell__header">
        <div className="shell__header-inner">
          <Link to="/projects" className="shell__brand">
            TaskFlow
          </Link>

          {user ? (
            <div className="shell__account">
              <span className="shell__name">{user.name}</span>
              <span className="shell__role">{user.role}</span>
              <button
                type="button"
                className="button button--quiet"
                onClick={() => {
                  signOut();
                  navigate('/login');
                }}
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <main className="shell__main">
        <Outlet />
      </main>
    </div>
  );
}
