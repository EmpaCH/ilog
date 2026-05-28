import openbis from "@openbis/openbis.esm";
import { useState, useEffect } from "react";

export const INSTANCE_COOKIE = "openbis-instance";
export const TOKEN_KEY = "token";
export const USER_KEY = "user";

/**
 * The openBIS SDK ignores any path component in the URL passed to its constructor.
 * It only extracts protocol://authority and then always appends the hardcoded path /openbis/openbis/rmi-application-server-v3.json.
 * Passing "" causes the SDK to use a bare relative path, which the browser resolves against the current origin
 * (localhost:5173 in dev, the app domain in production).
 * The Vite plugin and Caddy then read the `openbis-instance` cookie that is set at login to determine which openBIS server to proxy to.
 * The browser automatically includes the cookie in every XHR the SDK fires.
 */

const _facade = new openbis.openbis("");
// @ts-ignore
_facade._private.log = () => {};

function getInstanceCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/openbis-instance=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setInstanceCookie(hostname: string): void {
  document.cookie = `${INSTANCE_COOKIE}=${encodeURIComponent(hostname)}; path=/; SameSite=Strict; Max-Age=${60 * 60 * 24 * 30}`;
}

function clearInstanceCookie(): void {
  document.cookie = `${INSTANCE_COOKIE}=; path=/; Max-Age=0`;
}

export const useOpenBIS = () => {
  const storedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const storedUser = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;

  const [isAuthenticated, setIsAuthenticated] = useState(
    !!storedToken && !!storedUser && !!getInstanceCookie(),
  );
  const [user, setUser] = useState<string | null>(storedUser);
  const [token, setToken] = useState<string | null>(storedToken);

  // On mount: if a stored token and instance cookie exist, verify the session is still valid.
  useEffect(() => {
    const checkStoredToken = async () => {
      if (storedToken && storedUser && getInstanceCookie()) {
        try {
          _facade.setSessionToken(storedToken);
          await _facade.getServerInformation();
          setLoginInfo(storedUser, storedToken);
        } catch {
          removeLoginInfo();
        }
      }
    };
    checkStoredToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLoginInfo = (username: string, sessionToken: string) => {
    setUser(username);
    setToken(sessionToken);
    setIsAuthenticated(true);
    localStorage.setItem(TOKEN_KEY, sessionToken);
    localStorage.setItem(USER_KEY, username);
    _facade.setSessionToken(sessionToken);
  };

  const removeLoginInfo = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearInstanceCookie();
  };

  const login = async (username: string, password: string): Promise<string | null> => {
    try {
      const sessionToken = await _facade.login(username, password);
      if (sessionToken === undefined) return null;
      setLoginInfo(username, sessionToken);
      return sessionToken;
    } catch {
      removeLoginInfo();
      return null;
    }
  };

  const loginWithToken = async (
    personalAccessToken: string,
    instanceHostname?: string,
  ): Promise<string | null> => {
    if (instanceHostname) {
      setInstanceCookie(instanceHostname);
    }
    try {
      _facade.setSessionToken(personalAccessToken);
      await _facade.getServerInformation();
      const sessionInfo = await _facade.getSessionInformation();
      const username = sessionInfo.getUserName();
      setLoginInfo(username, personalAccessToken);
      return personalAccessToken;
    } catch {
      if (instanceHostname) clearInstanceCookie();
      removeLoginInfo();
      return null;
    }
  };

  const logout = async () => {
    try {
      if (token) await _facade.logout();
    } catch {}
    removeLoginInfo();
  };

  return {
    isAuthenticated,
    user,
    token,
    login,
    loginWithToken,
    logout,
    apiFacade: _facade as openbis.OpenBISJavaScriptFacade,
    url: getInstanceCookie() ?? "",
    id: new Date(),
  };
};
