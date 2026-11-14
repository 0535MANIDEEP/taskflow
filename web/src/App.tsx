import { Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { Loading } from './components/states/Loading';
import { LoginPage } from './pages/LoginPage';
import { ProjectPage } from './pages/ProjectPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RegisterPage } from './pages/RegisterPage';

/**
 * The route guard.
 *
 * A signed-out visitor is sent to the login page before any protected page
 * renders, rather than being shown a page that then discovers it has no
 * session. The session check has to wait for the API to answer, so the guard
 * shows a loading state rather than deciding on a guess.
 */
function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

/**
 * A route only an admin may open.
 *
 * The role comes from the session, which the server issued. The rule is
 * applied again by the API, because a guard in the browser is a convenience
 * and a refusal by the server is the security.
 */
function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/projects" replace />;

  return <Outlet />;
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<ProjectsPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Route>
    </Routes>
  );
}
