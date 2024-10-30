import openbis from '@openbis/openbis.esm';
import { createContext } from 'react';

export interface AuthContextType {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  user: string | null;
  apiFacade: openbis.OpenBISJavaScriptFacade;
}

export const AuthContext = createContext<AuthContextType>({
  login: async () => {},
  logout: async () => {},
  isAuthenticated: false,
  user: null,
  apiFacade: new openbis.openbis('/openbis/'),
});
