import type { ReactNode } from 'react';

import { useAuth } from '../auth/AuthProvider';
import type { Role } from '../api/types';

/**
 * Shows its children only to the roles named.
 *
 * This is the same rule the API applies, on this side of the wire. Hiding a
 * button is a convenience for the person using the interface: the server
 * refuses the request either way, and refusing it is the part that matters.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useAuth();

  if (!user || user.role !== role) return null;

  return <>{children}</>;
}
