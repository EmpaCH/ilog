import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";
import Login from "../components/Login";

class OpenBISApiFacade {
  private static instance: openbis.openbis;

  private constructor() {}

  public static getInstance(url: string): openbis.openbis {
    if (!OpenBISApiFacade.instance) {
      OpenBISApiFacade.instance = new openbis.openbis(url);
    }
    return OpenBISApiFacade.instance;
  }
}

export const openBISHookFactory = (url: string) => {
  const apiFacade = OpenBISApiFacade.getInstance(url);
  console.log("factory invoked");

  return () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);

    // Check for token and user in localStorage on initialization
    useEffect(() => {
      const storedToken = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      if (storedToken && storedUser) {
        console.log("Stored token found");
        const verifyStoredToken = async () => {
          await verifyToken(storedToken, storedUser);
          console.log("Token verified");
        };
        verifyStoredToken();
      }
    }, []);

    // Function to verify token validity
    const verifyToken = async (token: string, user: string) => {
      try {
        apiFacade.setSessionToken(token);
        await apiFacade.getServerInformation();
        setToken(token);
        setUser(user);
        setIsAuthenticated(true);
        apiFacade.setSessionToken(token);
      } catch (e) {
        console.log(e);
        console.log("Token verification failed");
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    };

    // Login function
    const login = async (username: string, password: string) => {
      console.log("Logging in");
      try {
        const sessionToken = await apiFacade.login(username, password); // Assuming login returns a token
        console.log("Logged in");
        setUser(username);
        setToken(sessionToken);
        setIsAuthenticated(true);
        localStorage.setItem("user", username);
        localStorage.setItem("token", sessionToken);
      } catch (e) {
        console.log("Login failed");
        throw Error("Login failed");
      }
    };

    // Logout function
    const logout = async () => {
      await apiFacade.logout();
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    };

    return {
      isAuthenticated,
      user,
      token,
      login,
      logout,
      apiFacade,
    };
  };
};



export const useOpenBIS = openBISHookFactory("/openbis/");
