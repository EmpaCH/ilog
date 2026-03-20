
import openbis from "@openbis/openbis.esm";
import { useCallback, useEffect, useState } from "react";

type OpenBisFacadeWithPrivate = openbis.openbis & {
  _private?: {
    log?: (...messages: unknown[]) => void;
  };
};


/**
 * A factory to create singleton instances of the openBIS API facade.
 */
export class OpenBISApiFacade {
  private static instances: Map<string, openbis.openbis> = new Map();

  private constructor() {}

  public static getInstance(asUrl: string): openbis.openbis {
    const key = asUrl;
    console.log("Getting instance with URL:", key);

    if (OpenBISApiFacade.instances.get(key) === undefined) {
      console.log("Creating new instance with URL:", key);
      const instance = new openbis.openbis(asUrl);
      OpenBISApiFacade.instances.set(key, instance);
    }

    console.log("Returning instance with URL:", key);
    return OpenBISApiFacade.instances.get(key) as openbis.openbis;
  }
}


export const TOKEN_KEY = "token";
export const USER_KEY = "user";


export const openBISHookFactory = (url: string) => {
  return () => {
    const apiFacade = OpenBISApiFacade.getInstance(url) as OpenBisFacadeWithPrivate;
    if (apiFacade._private) {
      apiFacade._private.log = () => {};
    }
    const id = new Date();
    const idLogger = (...msgs: unknown[]) => {
      console.log("Facade created,", ...msgs);
    };
    idLogger(`Creating hook with URL: ${url}`);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true); // Add loading state
    const [loginResult, setLoginResult] = useState<string | null>(null);

    // Helper function to set user/token info on successful login
    const setLoginInfo = useCallback((user: string, token: string) => {
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      apiFacade.setSessionToken(token);
      idLogger(`Setting token: ${token}`);
      localStorage.setItem(USER_KEY, user);
      localStorage.setItem(TOKEN_KEY, token);
      idLogger(`Stored token: ${localStorage.getItem(TOKEN_KEY)}`);
    }, [apiFacade]);

    // Helper function to remove user/token info on logout
    const removeLoginInfo = useCallback(() => {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      setLoginResult(null);
      setIsLoading(false); // Set loading to false when removing login info
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }, []);

    // Function to verify token validity
    const verifyToken = useCallback(async (token: string) => {
      try {
        apiFacade.setSessionToken(token);
        await apiFacade.getServerInformation();
        return true;
      } catch {
        return false;
      }
    }, [apiFacade]);

    // Check for token and user in localStorage on initialization
    useEffect(() => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      idLogger(`Stored token: ${storedToken}`);
      const checkStoredToken = async () => {
        if (storedToken !== null && storedUser !== null) {
          const result = await verifyToken(storedToken);
          idLogger("Token verified");
          if (result) {
            idLogger("Token is valid");
            setLoginInfo(storedUser, storedToken);
          } else {
            removeLoginInfo();
          }
        } else {
          idLogger("No token stored");
        }
        setIsLoading(false); // Set loading to false after check
      };
      checkStoredToken();
    }, [removeLoginInfo, setLoginInfo, verifyToken]);

    function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out")), ms)
      );
      return Promise.race([promise, timeout]);
    }

    // Login function
    const login = (
      username: string,
      password: string,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ): Promise<string | null> => {
      idLogger("Logging in...");
      return withTimeout(apiFacade.login(username, password), 180000)
        .then((sessionToken) => {
          idLogger("Login successful");
          if (sessionToken === undefined) {
            setLoginResult(null);
            onError?.("Login failed - no session token");
            return null;
          }
          setLoginInfo(username, sessionToken);
          setLoginResult(sessionToken);
          onSuccess?.();
          return sessionToken;
        })
        .catch((e) => {
          idLogger("Login failed", e);
          removeLoginInfo();
          setLoginResult(null);
          onError?.("Login failed");
          return null;
        });
    };

    // Login with personal access token function
    const loginWithToken = (
      personalAccessToken: string,
      onSuccess?: () => void,
      onError?: (error: string) => void
    ): Promise<string | null> => {
      idLogger("Logging in with token...");
      // Set the token and verify it works
      apiFacade.setSessionToken(personalAccessToken);
      return withTimeout(apiFacade.getServerInformation(), 180000)
        .then(() => {
          // For token-based login, we'll use a default username since
          // we don't have the actual username from the token
          const username = "token-user";
          idLogger("Token login successful");
          setLoginInfo(username, personalAccessToken);
          setLoginResult(personalAccessToken);
          onSuccess?.();
          return personalAccessToken;
        })
        .catch((e) => {
          idLogger("Token login failed", e);
          removeLoginInfo();
          setLoginResult(null);
          onError?.("Token login failed");
          return null;
        });
    };

    // Logout function
    const logout = async () => {
      await apiFacade.logout();
      removeLoginInfo();
    };

    return {
      isAuthenticated,
      user,
      token,
      login,
      loginWithToken,
      logout,
      apiFacade,
      url,
      id,
      isLoading, // Return loading state
      loginResult,
    };
  };
};


export const useOpenBIS = openBISHookFactory("/openbis/");
