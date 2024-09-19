import "./App.css";
import { useOpenBIS } from "./auth/hooks/useAuth";
import { LoginContext } from "./auth/LoginContext";

import * as React from "react";

import { RouterProvider } from "@tanstack/react-router";

import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./queryClient";
import { router } from "./router";

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}



function InnerApp() {
  const auth = React.useContext(LoginContext);
  console.log(auth);
  return <RouterProvider router={router} context={{ auth }} />;
}

function App() {
  const facade = useOpenBIS();

  return (
    <>
      <QueryClientProvider client={queryClient}>
        <LoginContext.Provider value={facade}>
          <InnerApp />
        </LoginContext.Provider>
      </QueryClientProvider>
    </>
  );
}

export default App;
