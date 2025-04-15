import { useContext, useEffect, useMemo } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOpenBIS } from "./hooks/auth/useAuth";
import { AuthContext } from "./context/auth/authContext";
import { router } from "./router";
import "./App.css";
import { HeroUIProvider } from "@heroui/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router;
  }
}

function InnerApp() {
  const auth = useContext(AuthContext);
  return <RouterProvider router={router} context={{ auth }}/>
}

function App() {
  const facade = useOpenBIS();
  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: 10000 } },
  });
  const router = useRouter();

  return (
      <QueryClientProvider client={client}>
        <AuthContext.Provider value={facade}>
          <InnerApp />
        </AuthContext.Provider>
      </QueryClientProvider>
  );
}

export default App;
