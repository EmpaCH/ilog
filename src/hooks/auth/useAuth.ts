import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";

export const PROXIED_AFS_URL = "/afs/";
export const PROXIED_AS_URL = "/openbis/";

/**
 * A factory to create singleton instances of the openBIS API facade.
 */
export class OpenBISApiFacade {
  private static instances: Map<string, openbis.openbis> = new Map();

  private constructor() {}

  public static getInstance(asUrl: string, afsUrl: string): openbis.openbis {
    console.log("Getting instance with URL:", asUrl, " and AFS URL:", afsUrl);
    if (asUrl === undefined || asUrl === null) {
      throw new Error("asUrl cannot be null or undefined");
    }
    if (afsUrl === undefined || afsUrl === null) {
      throw new Error("afsUrl cannot be null or undefined");
    }
    if (OpenBISApiFacade.instances.get(asUrl + afsUrl) === undefined) {
      console.log("Creating new instance with URL:", asUrl);
      OpenBISApiFacade.instances.set(asUrl + afsUrl, new openbis.openbis(asUrl, afsUrl));
    }
    console.log("Returning instance with URL:", asUrl);
    const current = OpenBISApiFacade.instances.get(asUrl + afsUrl) as openbis.openbis;
    return current;
  }
}

export const TOKEN_KEY = "token";
export const USER_KEY = "user";

export const openBISHookFactory = (asUrl: string, afsUrl: string) => {
  return () => {
    //const apiFacade = new openbis.openbis(url);
    const apiFacade = OpenBISApiFacade.getInstance(asUrl, afsUrl);

    // @ts-ignore
    apiFacade._private.log = () => {};
    const id = new Date();
    const idLogger = (...msgs: any) => {
      console.log(`Facade created at ${id}, ${msgs}`);
    };
    idLogger(`${id}, Creating hook with URL:`, asUrl);

    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // // Check for token and user in localStorage on initialization
    useEffect(() => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      idLogger("Stored token:", storedToken);
      idLogger("Now proceeding to verify token");
      const checkStoredToken = async () => {
        if (storedToken !== null && storedUser !== null) {
          const result = await verifyToken(storedToken, storedUser);
          idLogger("Token verified");
          if (result) {
            idLogger("Token is valid");
            setLoginInfo(storedUser, storedToken);
          } else {
            removeLoginInfo();
          }
        } else {
          idLogger("No token stored");
          //removeLoginInfo();
        }
      };
      checkStoredToken();
      //   const result = await verifyToken(storedToken, storedUser).then((res) => {
      //     idLogger("Token verified");
      //     if (res) {
      //       idLogger("Token is valid");
      //       setLoginInfo(storedUser, storedToken);
      //     } else {
      //       removeLoginInfo();
      //     }
      //   });
      // } else {
      //   idLogger("No token stored");
      //   removeLoginInfo();
      // }}
    }, []);

    // Function to verify token validity
    const verifyToken = async (token: string, user: string) => {
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
        //apiFacade.setSessionToken(null);

        const sessionToken = await apiFacade.login(username, password); // Assuming login returns a token
        idLogger("Login successful");
        if (sessionToken === undefined) {
          return null;
        }
        setLoginInfo(username, sessionToken);

        return sessionToken;
      } catch (e) {
        idLogger("Login failed");
        removeLoginInfo();
        return null;
      }
    };

    // Logout function
    const logout = async () => {
      await apiFacade.logout();
      removeLoginInfo();
    };

    // Helper function to set user/token info on successfull login
    function setLoginInfo(user: string, token: string) {
      setIsAuthenticated(true);
      setUser(user);
      setToken(token);
      apiFacade.setSessionToken(token);
      idLogger("Setting token:", token);
      localStorage.setItem(USER_KEY, user);
      localStorage.setItem(TOKEN_KEY, token);
      idLogger("Stored token:", localStorage.getItem(TOKEN_KEY));
    }

    // Helper function to remove user/token info on logout
    function removeLoginInfo() {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }

    return {
      isAuthenticated,
      user,
      token,
      login,
      logout,
      apiFacade,
      url: asUrl,
      id,
    };
  };
};

export const useOpenBIS = openBISHookFactory(PROXIED_AS_URL, PROXIED_AFS_URL);
