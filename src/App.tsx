import { useContext } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useOpenBIS } from "./hooks/auth/useAuth";
import { AuthContext } from "./context/auth/authContext";
import { useInitializeDatasetTypes } from './hooks/useInitializeDatasetTypes';
import { useGetAllObjects } from "./apis/object/useGetAllObjects";
import { router } from "./router";
import "./App.css";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    // This infers the type of our router and registers it across your entire project
    router: typeof router;
  }
}

// Created once for the lifetime of the app — recreating QueryClient on every
// render would destroy the entire cache on each re-render.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, } },
});

function InnerApp() {
  const auth = useContext(AuthContext);
  // Prefetch all objects as soon as the user is authenticated so that
  // ComponentListPropertyEditor never has to wait for data on first mount.
  useGetAllObjects();
  return <RouterProvider router={router} context={{ auth }}/>
}

function App() {
  const facade = useOpenBIS();
  useInitializeDatasetTypes();
  const authValue = { ...facade, id: facade.id.toISOString() };
  const client = queryClient;

  return (
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={authValue}>
        <InnerApp />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
