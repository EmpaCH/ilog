import openbis from "@openbis/openbis.esm";
import { log } from "console";
import { browserFrames } from "happy-dom/lib/PropertySymbol.js";
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
    const urlDynamic = url ?? window.location.host;
    if (urlDynamic === undefined || urlDynamic === null) {
      throw new Error("URL cannot be null or undefined");
    }
    if (OpenBISApiFacade.instances.get(urlDynamic) === undefined) {
      OpenBISApiFacade.instances.set(urlDynamic, new openbis.openbis(urlDynamic));
    }
    const current = OpenBISApiFacade.instances.get(urlDynamic) as openbis.openbis;
    return current;
  }
}

export const TOKEN_KEY = "openbis";
// export const USER_KEY = "user";

export const openBISHookFactory = (url: string) => {
  return () => {
    const apiFacade = OpenBISApiFacade.getInstance(url);
    // User for logging
    // @ts-ignore
    apiFacade._private.log = () => {};
    const id = new Date();
    const idLogger = (...msgs: any) => {};
    idLogger(`${id}, Creating hook with URL:`, url);


    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // On initialization, retreive the cookie and verify it
    useEffect(() => {
      const init = async () => {
        try {
          const cookie = typeof window !== "undefined" ? await cookieStore.get(TOKEN_KEY) : null;
          const storedToken = cookie?.value ?? null;
          if(storedToken){
            console.log(`Found token ${storedToken}`);
            const valid = await verifyToken(storedToken);
            if(valid){
              apiFacade.setSessionToken(storedToken);
              const sessionInfo = await apiFacade.getSessionInformation();
              const username = sessionInfo.getPerson().getUserId();
              console.log(`Valid user ${username}`)
              setIsAuthenticated(true);
              setToken(storedToken);
              setUser(username);
              return;
            }
            else await removeLoginInfo();
          }
        } finally {
          setIsLoading(false);
        }
      }
      init()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Function to set login info
     const setLoginInfo = async (username: string, sessionToken: string) => {
      setUser(username);
      setToken(sessionToken);
      setIsAuthenticated(true);
      await cookieStore.set(TOKEN_KEY, sessionToken)
      apiFacade.setSessionToken(sessionToken);
    };

    // Function to remove login info
    const removeLoginInfo = async () => {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      await cookieStore.delete(TOKEN_KEY);
    };

    // Function to verify token validity
    const verifyToken = async (token: string) => {
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
        await setLoginInfo(username, sessionToken);
        return sessionToken;
      } catch (e: any) {
        idLogger("Login failed", e?.message || e);
        removeLoginInfo();
        return null;
      }
    };

    // Login with personal access token function
    const loginWithToken = async (
      personalAccessToken: string,
    ): Promise<string | null> => {
      idLogger("Logging in with token...");
      try {
        apiFacade.setSessionToken(personalAccessToken);
        await apiFacade.getServerInformation();
        idLogger("Token login successful");
        const sessionInfo = await apiFacade.getSessionInformation();
        const username = sessionInfo.getPerson().getUserId();
        await setLoginInfo(username, personalAccessToken);
        return personalAccessToken;
      } catch (e: any) {
        idLogger("Token login failed", e?.message || e);
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
      isLoading,
      user,
      token,
      login,
      loginWithToken,
      logout,
      apiFacade,
      url: url,
      id,
    };
  };
};

export const useOpenBIS = openBISHookFactory(PROXIED_AS_URL);
