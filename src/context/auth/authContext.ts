import openbis from '@openbis/openbis.esm';
import { createContext } from 'react';

export interface AuthContextType {
  login: (username: string, password: string) => Promise<string | null>;
  loginWithToken: (token: string, instanceHostname?: string) => Promise<string | null>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  user: string | null;
  url: string;
  apiFacade: openbis.OpenBISJavaScriptFacade;
  id: string;
  token: string | null; 
}

export const AuthContext = createContext<AuthContextType>(null!);
