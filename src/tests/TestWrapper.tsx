import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "@tanstack/react-router";
import { AuthContext, AuthContextType } from "../context/auth/authContext";

const TestWrapper = ({ children, apiFacade }: { children: ReactNode, apiFacade: () => AuthContextType }) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    const facade = apiFacade();
    return (
      <AuthContext.Provider value={facade}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </AuthContext.Provider>
    );
  };

export default TestWrapper;