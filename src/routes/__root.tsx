import { Suspense, lazy } from 'react';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { AuthContextType } from '../context/auth/authContext';

const TanStackRouterDevtools =
  process.env.NODE_ENV === 'production'
    ? () => null // Render nothing in production
    : lazy(() =>
        // Lazy load in development
        import('@tanstack/router-devtools').then((res) => ({
          default: res.TanStackRouterDevtools,
        })),
      )

interface AuthRouteContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthContextType
}

export const Route = createRootRouteWithContext<AuthRouteContext>()({
  component: () => (
    <>
      <Outlet />
      <Suspense>
        <TanStackRouterDevtools/>
      </Suspense>
    </>
  ),
})
