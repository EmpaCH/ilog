import { Suspense, lazy } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { AuthContextType } from "../context/auth/authContext";
import { HeroUIProvider } from "@heroui/react";

const TanStackRouterDevtools =
  process.env.NODE_ENV === "production"
    ? () => null // Render nothing in production
    : lazy(() =>
        // Lazy load in development
        import("@tanstack/router-devtools").then((res) => ({
          default: res.TanStackRouterDevtools,
        }))
      );

interface AuthRouteContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: AuthContextType;
}

export const Route = createRootRouteWithContext<AuthRouteContext>()({
  component: () => {
    const router = useRouter();
    return (
      <>
        <HeroUIProvider
          navigate={(to, options) => router.navigate({ to, ...options })}
          useHref={(to) => router.buildLocation({ to }).href}
        >
          <Outlet />
          <Suspense>
            <TanStackRouterDevtools />
          </Suspense>
        </HeroUIProvider>
      </>
    );
  },
});
