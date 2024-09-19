import * as React from 'react'
import { Link, Outlet, createRootRoute, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { LoginContextType } from '../auth/LoginContext'


interface AuthRouteContext {
    // The ReturnType of your useAuth hook or the value of your AuthContext
    auth: LoginContextType
  }
  


export const Route = createRootRouteWithContext<AuthRouteContext>()({
    component: () => (
      <>
        <Outlet />
        <TanStackRouterDevtools />
      </>
    ),
  })
  