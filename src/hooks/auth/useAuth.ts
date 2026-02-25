import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";

// Use proxy endpoints for openBIS communication
export const PROXIED_AS_URL = "/openbis/";

/**
 * A factory to create singleton instances of the openBIS API facade.
 */
export class OpenBISApiFacade {
  private static instances: Map<string, openbis.openbis> = new Map();

  private constructor() {}

  public static getInstance(url: string): openbis.openbis {
    if (url === undefined || url === null) {
      throw new Error("URL cannot be null or undefined");
    }
    if (OpenBISApiFacade.instances.get(url) === undefined) {
      OpenBISApiFacade.instances.set(url, new openbis.openbis(url));
    }
    const current = OpenBISApiFacade.instances.get(url) as openbis.openbis;
    return current;
  }
}

export const TOKEN_KEY = "token";
export const USER_KEY = "user";

export const openBISHookFactory = (url: string) => {
  return () => {
    const apiFacade = OpenBISApiFacade.getInstance(url);

    // @ts-ignore
    apiFacade._private.log = () => {};
    const id = new Date();
    const idLogger = (...msgs: any) => {};
    idLogger(`${id}, Creating hook with URL:`, url);

    const storedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    const storedUser = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;

    const [isAuthenticated, setIsAuthenticated] = useState(!!storedToken && !!storedUser);
    const [user, setUser] = useState<string | null>(storedUser);
    const [token, setToken] = useState<string | null>(storedToken);

    // Check for token and user in localStorage on initialization
    useEffect(() => {
      idLogger(`Stored token: ${storedToken}`);
      const checkStoredToken = async () => {
        if (storedToken && storedUser) {
          const result = await verifyToken(storedToken, storedUser);
          idLogger("Token verified");
          if (result) {
            idLogger("Token is valid");
            setLoginInfo(storedUser, storedToken);
          } else {
            idLogger("Token is invalid");
            removeLoginInfo();
          }
        } else {
          idLogger("No token stored");
        }
      };
      checkStoredToken();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Function to set login info
    const setLoginInfo = (username: string, sessionToken: string) => {
      setUser(username);
      setToken(sessionToken);
      setIsAuthenticated(true);
      localStorage.setItem(TOKEN_KEY, sessionToken);
      localStorage.setItem(USER_KEY, username);
      apiFacade.setSessionToken(sessionToken);
    };

    // Function to remove login info
    const removeLoginInfo = () => {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    };

    // Function to verify token validity
    const verifyToken = async (token: string, _user: string) => {
      try {
        apiFacade.setSessionToken(token);
        await apiFacade.getServerInformation();
        return true;
      } catch (e) {
        return false;
      }
    };

    // Login function
    const login = async (
      username: string,
      password: string
    ): Promise<string | null> => {
      idLogger("Logging in...");
      try {
        const sessionToken = await apiFacade.login(username, password);
        idLogger("Login successful");
        if (sessionToken === undefined) {
          return null;
        }
        setLoginInfo(username, sessionToken);
        return sessionToken;
      } catch (e: any) {
        idLogger("Login failed", e?.message || e);
        removeLoginInfo();
        return null;
      }
    };

    // Logout function
    const logout = async () => {
      try {
        if (token) {
          await apiFacade.logout();
        }
      } catch (e) {
        idLogger("Logout error", e);
      }
      removeLoginInfo();
    };

    return {
      isAuthenticated,
      user,
      token,
      login,
      logout,
      apiFacade,
      url: url,
      id,
    };
  };
};

export const useOpenBIS = openBISHookFactory(PROXIED_AS_URL);
