import openbis from '@openbis/openbis.esm';
import { createContext } from 'react';

export interface AuthContextType {
  login: (username: string, password: string, onSuccess?: () => void, onError?: (error: string) => void) => Promise<string | null>;
  loginWithToken: (token: string, onSuccess?: () => void, onError?: (error: string) => void) => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  user: string | null;
  url: string;
  apiFacade: openbis.OpenBISJavaScriptFacade;
  id: string;
  token: string | null; 
  isLoading: boolean; // Add loading state
  loginResult: string | null; // Add login result
}

export const AuthContext = createContext<AuthContextType>(null!);

